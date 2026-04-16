import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy, limit, where, runTransaction, setDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, OperationType, handleFirestoreError } from './lib/firebase';
import { Gift, Task, AppNotification, GalleryPhoto, BankDetails, CartItem } from './types';
import { useAuth } from './lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Baby, Heart, Hospital, ListChecks, LayoutDashboard, Gift as GiftIcon, MessageSquare, Calendar, Lock, LogOut, Plus, ExternalLink, CheckCircle2, Circle, Trash2, Send, Bell, Image as ImageIcon, Camera, Upload, X, ShoppingCart, Pencil, Settings, User as UserIcon } from 'lucide-react';
import { askGemini } from './lib/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Onboarding } from './components/Onboarding';
import { MASTER_GIFTS, PREGNANCY_PHASES, MASTER_TASKS } from './constants';

const getCurrentPregnancyWeek = (dueDateStr?: string, startWeek?: number, startDays?: number, startDateStr?: string) => {
  if (!dueDateStr) return { weeks: 0, days: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If we have a start date and baseline weeks/days
  if (startDateStr && startWeek !== undefined) {
    const [y, m, d] = startDateStr.split('-');
    const startDate = new Date(Number(y), Number(m) - 1, Number(d));
    startDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const totalDays = (startWeek * 7) + (startDays || 0) + diffDays;
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    
    return { weeks: Math.max(1, Math.min(42, weeks)), days: Math.max(0, days) };
  }

  // Fallback to due date calculation
  const [dy, dm, dd] = dueDateStr.split('-');
  const dueDate = new Date(Number(dy), Number(dm) - 1, Number(dd));
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const totalDaysRemaining = diffDays;
  const totalDaysPregnancy = 280; // 40 weeks
  const currentTotalDays = totalDaysPregnancy - totalDaysRemaining;
  
  const weeks = Math.floor(currentTotalDays / 7);
  const days = currentTotalDays % 7;
  
  return { weeks: Math.max(1, Math.min(42, weeks)), days: Math.max(0, days) };
};

const getActivePhaseIndex = (week: number) => {
  if (week <= 12) return 0;
  if (week <= 26) return 1;
  if (week <= 34) return 2;
  return 3;
};

// --- Utilities ---

const createNotification = async (userId: string, title: string, message: string, type: 'gift' | 'task' | 'system', targetId?: string) => {
  try {
    await addDoc(collection(db, 'profiles', userId, 'notifications'), {
      title,
      message,
      type,
      targetId,
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// --- Components ---

const LandingPage = () => {
  const { loginWithGoogle, loginWithEmailOrUsername, registerWithEmailAndPasswordAndUsername } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!identifier || !password) throw new Error('Completa todos los campos');
        await loginWithEmailOrUsername(identifier, password);
      } else {
        if (!email || !username || !password) throw new Error('Completa todos los campos');
        if (username.includes('@') || username.includes(' ')) throw new Error('El nombre de usuario no puede contener espacios ni @');
        await registerWithEmailAndPasswordAndUsername(email, username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-200 mb-6">
            <Baby className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">BabyPlan</h1>
          <p className="text-stone-600">
            {isLogin ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>

        <Card className="border-0 shadow-xl shadow-stone-200/50">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100">
                  {error}
                </div>
              )}
              
              {isLogin ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-stone-700">Usuario o Correo</label>
                    <Input 
                      type="text" 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)} 
                      placeholder="ejemplo@correo.com o miusuario"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-700">Contraseña</label>
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-stone-700">Correo Electrónico</label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="ejemplo@correo.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-700">Nombre de Usuario</label>
                    <Input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="miusuario (sin espacios ni @)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-700">Contraseña</label>
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Mínimo 6 caracteres"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base font-bold"
                disabled={loading}
              >
                {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200"></div>
                </div>
                <div className="relative flex justify-center text-sm mb-6">
                  <span className="px-2 bg-white text-stone-500">O continuar con</span>
                </div>
              </div>
              
              <Button 
                type="button"
                variant="outline"
                className="w-full h-12 font-medium"
                onClick={loginWithGoogle}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
            </div>
            
            <div className="mt-6 text-center text-sm">
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-teal-600 hover:underline font-medium"
              >
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Navbar = ({ activeTab, setActiveTab, guestProfile, isGuestView }: { activeTab: string, setActiveTab: (v: string) => void, guestProfile?: any, isGuestView?: boolean }) => {
  const { isAdmin, logout, user, profile, loginWithGoogle, deleteUserAccount } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isResettingTasks, setIsResettingTasks] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({
    parent1Name: '',
    parent2Name: '',
    babyNames: [''],
    dueDate: '',
  });

  useEffect(() => {
    if (profile) {
      setSettingsForm({
        parent1Name: profile.parent1Name || '',
        parent2Name: profile.parent2Name || '',
        babyNames: profile.babyNames || [''],
        dueDate: profile.dueDate || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    const q = query(collection(db, 'profiles', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
    });
    return unsubscribe;
  }, [isAdmin, user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      await updateDoc(doc(db, 'profiles', user.uid, 'notifications', n.id), { isRead: true });
    }
  };

  const saveSettings = async () => {
    if(!user || !profile) return;
    try {
      await updateDoc(doc(db, 'profiles', user.uid), settingsForm);
      setShowSettingsDialog(false);
    } catch(err) {
      console.error(err);
    }
  };

  const resetTasks = async () => {
    if (!user) return;
    if (!window.confirm('¿Resetear todas las tareas? Esto eliminará las tareas actuales y las volverá a crear con todas las categorías.')) return;
    setIsResettingTasks(true);
    try {
      const tasksSnapshot = await getDocs(collection(db, 'profiles', user.uid, 'tasks'));
      const deletePromises = tasksSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'profiles', user.uid, 'tasks', docSnap.id)));
      await Promise.all(deletePromises);
      for (const task of MASTER_TASKS) {
        await addDoc(collection(db, 'profiles', user.uid, 'tasks'), task);
      }
      alert('Tareas reseteadas correctamente');
      setShowSettingsDialog(false);
    } catch(err) {
      console.error(err);
      alert('Error al resetear tareas');
    } finally {
      setIsResettingTasks(false);
    }
  };

  return (
    <>
    <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración de Cuenta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tu Nombre</Label>
            <Input value={settingsForm.parent1Name} onChange={e => setSettingsForm({...settingsForm, parent1Name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Nombre de tu pareja (opcional)</Label>
            <Input value={settingsForm.parent2Name} onChange={e => setSettingsForm({...settingsForm, parent2Name: e.target.value})} />
          </div>
          <div className="space-y-2">
             <Label>Nombres del Bebé</Label>
             <Input value={settingsForm.babyNames[0] || ''} onChange={e => {
                const newNames = [...settingsForm.babyNames];
                newNames[0] = e.target.value;
                setSettingsForm({...settingsForm, babyNames: newNames});
             }} />
          </div>
          <div className="space-y-2">
             <Label>Fecha Probable de Parto</Label>
             <Input type="date" value={settingsForm.dueDate} onChange={e => setSettingsForm({...settingsForm, dueDate: e.target.value})} />
          </div>
          <div className="pt-4 border-t border-stone-200">
              <h4 className="text-sm font-bold text-amber-600 mb-2">Herramientas</h4>
              <Button variant="outline" className="w-full mb-2" onClick={resetTasks} disabled={isResettingTasks}>
                <ListChecks className="w-4 h-4 mr-2" /> {isResettingTasks ? 'Reseteando...' : 'Resetear Tareas'}
              </Button>
           </div>
           <div className="pt-4 border-t border-stone-200">
              <h4 className="text-sm font-bold text-rose-600 mb-2">Zona de Peligro</h4>
              <Button variant="destructive" className="w-full" onClick={() => {
                   if(window.confirm('¿Estás seguro de que deseas eliminar tu cuenta permanentemente? Esta acción borrará TODO y no se puede deshacer.')) {
                     deleteUserAccount().then(() => {
                       logout();
                     }).catch(err => alert("Debes volver a iniciar sesión para poder eliminar tu cuenta."));
                   }
              }}>
                 <Trash2 className="w-4 h-4 mr-2" /> Eliminar cuenta permanentemente
              </Button>
           </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancelar</Button>
          <Button onClick={saveSettings} className="bg-teal-600 hover:bg-teal-700">Guardar Cambios</Button>
        </div>
      </DialogContent>
    </Dialog>

    <nav className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
        <div className="w-3 h-3 rounded-full bg-teal-600" />
        BabyPlan
        {guestProfile && (
          <span className="text-stone-400 font-medium text-sm ml-2">
            • Regalando a {guestProfile.babyNames?.join(' & ') || guestProfile.babyName}
          </span>
        )}
      </div>
      
      <div className="hidden sm:flex gap-4">
        <button 
          onClick={() => setActiveTab('wishlist')}
          className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${activeTab === 'wishlist' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'}`}
        >
          Wishlist
        </button>
        {isAdmin && !guestProfile && (
          <>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('checklists')}
              className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${activeTab === 'checklists' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              Checklists
            </button>
            <button 
              onClick={() => setActiveTab('gallery')}
              className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${activeTab === 'gallery' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              Galería
            </button>
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${activeTab === 'timeline' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              Timeline
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isAdmin && !guestProfile && (
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-9 w-9 text-stone-600"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllAsRead();
              }}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed top-16 right-4 left-4 sm:left-auto sm:absolute sm:top-auto sm:right-0 mt-2 sm:w-80 bg-white rounded-xl border border-stone-200 shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                    <span className="text-xs font-bold text-stone-800">Notificaciones</span>
                    <button onClick={() => setShowNotifications(false)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ScrollArea className="h-80">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-stone-400 text-xs">No hay notificaciones</div>
                    ) : (
                      <div className="divide-y divide-stone-50">
                        {notifications.map((n) => (
                          <div key={n.id} className={`p-3 transition-colors ${n.isRead ? 'bg-white' : 'bg-teal-50/30'}`}>
                            <div className="flex gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.type === 'gift' ? 'bg-rose-500' : n.type === 'task' ? 'bg-teal-600' : 'bg-stone-400'}`} />
                              <div>
                                <div className="text-[11px] font-bold text-stone-800">{n.title}</div>
                                <div className="text-[10px] text-stone-600 leading-tight mt-0.5">{n.message}</div>
                                <div className="text-[9px] text-stone-400 mt-1 uppercase font-bold tracking-wider">
                                  {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recién'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-8 w-8 rounded-full border-none bg-transparent hover:opacity-80 transition-opacity p-0 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={profile?.parent1Name || 'User'} />
                    <AvatarFallback className="bg-teal-100 text-teal-700">
                      {profile?.parent1Name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.parent1Name || (user && user.displayName) || 'Usuario'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout} className="text-rose-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => loginWithGoogle()} variant="outline" size="sm" className="h-8 border-teal-600 text-teal-600 hover:bg-teal-50">
              Login Papás
            </Button>
          )}
        </div>
      </div>
    </nav>
    </>
  );
};

const MobileNav = ({ activeTab, setActiveTab, guestProfile, onAddAction }: { activeTab: string, setActiveTab: (v: string) => void, guestProfile?: any, onAddAction?: () => void }) => {
  const { isAdmin } = useAuth();
  
  const showAddButton = isAdmin && !guestProfile && ['wishlist', 'checklists', 'gallery'].includes(activeTab);

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-1 z-50 flex justify-around items-center h-16">
      <button 
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'text-teal-600' : 'text-stone-400'}`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-bold">Inicio</span>
      </button>

      <button 
        onClick={() => setActiveTab('wishlist')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'wishlist' ? 'text-teal-600' : 'text-stone-400'}`}
      >
        <GiftIcon className="w-5 h-5" />
        <span className="text-[10px] font-bold">Wishlist</span>
      </button>

      {showAddButton ? (
        <button 
          onClick={onAddAction}
          className="flex flex-col items-center justify-center -mt-8 bg-teal-600 text-white w-14 h-14 rounded-full shadow-lg shadow-teal-200 border-4 border-stone-50 active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-14" />
      )}

      <button 
        onClick={() => setActiveTab('checklists')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'checklists' ? 'text-teal-600' : 'text-stone-400'}`}
      >
        <ListChecks className="w-5 h-5" />
        <span className="text-[10px] font-bold">Tareas</span>
      </button>

      <button 
        onClick={() => setActiveTab('gallery')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'gallery' ? 'text-teal-600' : 'text-stone-400'}`}
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-[10px] font-bold">Galería</span>
      </button>
    </div>
  );
};

const Wishlist = ({ 
  cart, 
  setCart, 
  setIsCartOpen,
  bankDetails,
  viewingUserId,
  currentWeekData,
  isAdding,
  setIsAdding
}: { 
  cart: CartItem[], 
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>,
  bankDetails: BankDetails | null,
  viewingUserId: string | null,
  currentWeekData: { weeks: number; days: number },
  isAdding: boolean,
  setIsAdding: (v: boolean) => void
}) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const { isAdmin, profile, user } = useAuth();
  const isOwner = user?.uid === viewingUserId;
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [viewingGift, setViewingGift] = useState<Gift | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [giftFilter, setGiftFilter] = useState<string>('All');
  const [newGift, setNewGift] = useState<Partial<Gift>>({
    name: '',
    category: 'Bebé',
    isReserved: false,
    isRepeatable: false,
    quantityNeeded: 1,
    quantityReserved: 0,
    price: 0
  });

  useEffect(() => {
    if (!viewingUserId) return;
    const q = query(collection(db, 'profiles', viewingUserId, 'wishlist'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const giftList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gift));
      setGifts(giftList);
      
      // Auto-seed if empty and is owner
      if (snapshot.empty && isOwner && !isSeeding) {
        seedWishlist();
      }

      // Cleanup old picsum images
      if (isOwner) {
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.imageUrl && data.imageUrl.includes('picsum.photos')) {
            // Remove the image url from the document
            updateDoc(doc(db, 'profiles', viewingUserId, 'wishlist', docSnap.id), {
              imageUrl: ''
            }).catch(console.error);
          }
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/wishlist`));
    return unsubscribe;
  }, [viewingUserId, isOwner]);

  const seedWishlist = async () => {
    if (!viewingUserId) return;
    setIsSeeding(true);
    try {
      for (const gift of MASTER_GIFTS) {
        await addDoc(collection(db, 'profiles', viewingUserId, 'wishlist'), gift);
      }
    } catch (error) {
      console.error('Error seeding wishlist:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddToCart = () => {
    if (!viewingGift) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.gift.id === viewingGift.id);
      if (existing) {
        return prev.map(item => 
          item.gift.id === viewingGift.id 
            ? { ...item, quantity: item.quantity + reserveQuantity } 
            : item
        );
      }
      return [...prev, { gift: viewingGift, quantity: reserveQuantity }];
    });
    
    setViewingGift(null);
    setReserveQuantity(1);
  };

  const handleAddGift = async () => {
    if (!viewingUserId) return;
    try {
      await addDoc(collection(db, 'profiles', viewingUserId, 'wishlist'), {
        ...newGift,
        isReserved: false,
        quantityReserved: 0
      });
      setIsAdding(false);
      setNewGift({ name: '', category: 'General', isReserved: false, isRepeatable: false, quantityNeeded: 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `profiles/${viewingUserId}/wishlist`);
    }
  };

  const handleEditGift = async () => {
    if (!editingGift || !viewingUserId) return;
    try {
      const { id, ...updateData } = editingGift;
      await updateDoc(doc(db, 'profiles', viewingUserId, 'wishlist', id), updateData);
      setEditingGift(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${viewingUserId}/wishlist/${editingGift.id}`);
    }
  };

  const handleDeleteGift = async (id: string) => {
    if (!viewingUserId) return;
    try {
      await deleteDoc(doc(db, 'profiles', viewingUserId, 'wishlist', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `profiles/${viewingUserId}/wishlist/${id}`);
    }
  };

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}?u=${user.uid}`;
    navigator.clipboard.writeText(url);
    alert('¡Link de lista de deseos copiado al portapapeles!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Lista de Regalos</h2>
          <p className="text-sm text-stone-500">Ayúdanos a preparar la llegada de {profile?.babyNames?.join(' & ') || profile?.babyName || 'nuestro bebé'}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="bg-teal-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-teal-100 flex items-center gap-2 sm:gap-3">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-teal-600 uppercase tracking-wider">Gestación</p>
              <p className="text-xs sm:text-sm font-bold text-stone-800">
                Semana {currentWeekData.weeks} + {currentWeekData.days}d
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
          {isOwner && (
            <>
              <Button onClick={handleShare} variant="outline" className="flex-1 sm:flex-none border-stone-200 text-stone-600 hover:bg-stone-50 text-xs sm:text-sm h-9 sm:h-10">
                <ExternalLink className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Compartir
              </Button>
              <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger render={<Button className="hidden sm:flex flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm h-9 sm:h-10" />}>
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Añadir Artículo
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Regalo</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Nombre del artículo" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">Categoría</label>
                      <select
                        className="w-full rounded-md border border-stone-300 p-2 text-sm bg-white"
                        value={newGift.category}
                        onChange={e => setNewGift({...newGift, category: e.target.value})}
                      >
                        <option value="Bebé">Bebé</option>
                        <option value="Mamá">Mamá</option>
                        <option value="Casa">Casa</option>
                        <option value="Alimentación">Alimentación</option>
                        <option value="Hospital">Hospital</option>
                      </select>
                    </div>
                    <Input placeholder="URL de Imagen" value={newGift.imageUrl} onChange={e => setNewGift({...newGift, imageUrl: e.target.value})} />
                    <Input placeholder="URL de Compra" value={newGift.purchaseUrl} onChange={e => setNewGift({...newGift, purchaseUrl: e.target.value})} />
                    <Input type="number" placeholder="Precio (Opcional)" value={newGift.price || ''} onChange={e => setNewGift({...newGift, price: parseInt(e.target.value) || 0})} />
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={newGift.isRepeatable} onChange={e => setNewGift({...newGift, isRepeatable: e.target.checked})} />
                      <label>¿Es repetible? (ej. pañales)</label>
                    </div>
                    {newGift.isRepeatable && (
                      <Input type="number" placeholder="Cantidad necesaria" value={newGift.quantityNeeded} onChange={e => setNewGift({...newGift, quantityNeeded: parseInt(e.target.value)})} />
                    )}
                    <Button onClick={handleAddGift} className="bg-teal-600">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital'].map(cat => (
          <button
            key={cat}
            onClick={() => setGiftFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              giftFilter === cat
                ? 'bg-teal-600 text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {cat === 'All' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <AnimatePresence>
          {gifts.filter(g => giftFilter === 'All' || g.category === giftFilter).map((gift) => {
            const remaining = gift.isRepeatable ? (gift.quantityNeeded || 1) - (gift.quantityReserved || 0) : 0;
            const isFullyReserved = gift.isRepeatable ? remaining <= 0 : gift.isReserved;

            return (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <div 
                className="gift-card h-full cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => {
                  setViewingGift(gift);
                  setReserveQuantity(1);
                }}
              >
                <div className="h-32 bg-stone-100 flex items-center justify-center text-3xl relative">
                  {gift.imageUrl ? (
                    <img src={gift.imageUrl} alt={gift.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{gift.category === 'Alimentación' ? '🍼' : gift.category === 'Mobiliario' ? '🛏️' : '📦'}</span>
                  )}
                  <Badge className="absolute top-2 right-2 bg-white/90 text-stone-800 backdrop-blur-sm border-none">
                    {gift.category}
                  </Badge>
                  {gift.price && gift.price > 0 && (
                    <Badge className="absolute bottom-2 left-2 bg-white/90 text-teal-700 backdrop-blur-sm border-none font-bold">
                      {gift.price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </Badge>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-sm mb-1">{gift.name}</h3>
                  <p className="text-[10px] text-stone-500 mb-3">Universal • {gift.category}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isFullyReserved 
                        ? 'bg-rose-50 text-rose-500' 
                        : 'bg-teal-50 text-teal-600'
                    }`}>
                      {gift.isRepeatable 
                        ? (remaining <= 0 ? 'COMPLETADO' : `Faltan ${remaining}`)
                        : (gift.isReserved ? (isAdmin ? `Regalado por: ${gift.reservedBy || 'Invitado'}` : 'REGALADO') : 'Disponible')
                      }
                    </span>
                    
                    <div className="flex gap-1">
                      {isAdmin ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600" onClick={(e) => { e.stopPropagation(); setEditingGift(gift); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={(e) => { e.stopPropagation(); handleDeleteGift(gift.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setViewingGift(gift); 
                            setReserveQuantity(1);
                          }}
                          disabled={isFullyReserved}
                          className={`h-7 px-3 text-[10px] font-bold ${
                            isFullyReserved 
                              ? 'bg-stone-100 text-stone-400' 
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                        >
                          {isFullyReserved ? 'REGALADO' : 'VER / REGALAR'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )})}
        </AnimatePresence>
      </div>

      {/* Edit Gift Modal */}
      <Dialog open={!!editingGift} onOpenChange={(open) => !open && setEditingGift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Regalo</DialogTitle>
          </DialogHeader>
          {editingGift && (
            <div className="grid gap-4 py-4">
              <Input placeholder="Nombre del artículo" value={editingGift.name} onChange={e => setEditingGift({...editingGift, name: e.target.value})} />
              <Input placeholder="Categoría" value={editingGift.category} onChange={e => setEditingGift({...editingGift, category: e.target.value})} />
              <Input placeholder="URL de Imagen" value={editingGift.imageUrl || ''} onChange={e => setEditingGift({...editingGift, imageUrl: e.target.value})} />
              <Input placeholder="URL de Compra" value={editingGift.purchaseUrl || ''} onChange={e => setEditingGift({...editingGift, purchaseUrl: e.target.value})} />
              <Input type="number" placeholder="Precio (Opcional)" value={editingGift.price || ''} onChange={e => setEditingGift({...editingGift, price: parseInt(e.target.value) || 0})} />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editingGift.isRepeatable} onChange={e => setEditingGift({...editingGift, isRepeatable: e.target.checked})} />
                <label>¿Es repetible?</label>
              </div>
              {editingGift.isRepeatable && (
                <Input type="number" placeholder="Cantidad necesaria" value={editingGift.quantityNeeded || 1} onChange={e => setEditingGift({...editingGift, quantityNeeded: parseInt(e.target.value)})} />
              )}
              <Button onClick={handleEditGift} className="bg-teal-600">Guardar Cambios</Button>
              {(editingGift.isReserved || (editingGift.quantityReserved || 0) > 0) && (
                <Button 
                  variant="outline" 
                  className="text-rose-500 border-rose-200 hover:bg-rose-50"
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'profiles', viewingUserId, 'wishlist', editingGift.id), {
                        isReserved: false,
                        reservedBy: '',
                        quantityReserved: 0
                      });
                      setEditingGift(null);
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                >
                  Quitar Reserva / Reiniciar
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Gift Modal */}
      <Dialog open={!!viewingGift} onOpenChange={(open) => {
        if (!open) {
          setViewingGift(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Regalo</DialogTitle>
            <CardDescription>
              {viewingGift?.name}
            </CardDescription>
          </DialogHeader>
          {viewingGift && (() => {
            // Check if it's already in cart to adjust remaining
            const inCart = cart.find(item => item.gift.id === viewingGift.id)?.quantity || 0;
            const remaining = viewingGift.isRepeatable ? (viewingGift.quantityNeeded || 1) - (viewingGift.quantityReserved || 0) - inCart : 1 - inCart;
            const isFullyReserved = remaining <= 0 || viewingGift.isReserved;
            const isOwnGift = isOwner;

            return (
            <div className="grid gap-4 py-4">
              {viewingGift.imageUrl && (
                <div className="h-48 w-full bg-stone-100 rounded-md overflow-hidden relative">
                  <img src={viewingGift.imageUrl} alt={viewingGift.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  {viewingGift.price && viewingGift.price > 0 && (
                    <Badge className="absolute bottom-3 left-3 bg-white/90 text-teal-700 backdrop-blur-sm border-none font-bold text-lg">
                      {viewingGift.price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </Badge>
                  )}
                </div>
              )}

              {viewingGift.purchaseUrl && (
                <Button variant="outline" className="w-full" render={<a href={viewingGift.purchaseUrl} target="_blank" rel="noopener noreferrer" />}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Ver en la tienda / Comprar Online
                </Button>
              )}

              {/* Si es el dueño de la lista, no mostrar opción de añadir */}
              {isOwnGift ? (
                <div className="p-4 bg-stone-50 rounded-md text-center text-stone-500 text-sm">
                  Este es tu regalo. Los invitados pueden reservarlo desde su lista.
                </div>
              ) : !isFullyReserved ? (
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  {viewingGift.isRepeatable && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cantidad a añadir (Disponibles: {remaining})</label>
                      <Input
                        type="number"
                        min="1"
                        max={remaining}
                        value={reserveQuantity}
                        onChange={e => setReserveQuantity(Math.min(remaining, Math.max(1, parseInt(e.target.value) || 1)))}
                      />
                    </div>
                  )}
                  {inCart > 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-teal-50 rounded-lg text-teal-700 text-sm">
                        Ya tienes {inCart} unidades reservadas en tu lista.
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-rose-500 border-rose-200 hover:bg-rose-50"
                        onClick={() => {
                          setCart(prev => prev.filter(item => item.gift.id !== viewingGift.id));
                          setViewingGift(null);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Cancelar reserva
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleAddToCart} className="w-full bg-teal-600 hover:bg-teal-700">
                      <ShoppingCart className="mr-2 h-4 w-4" /> Añadir a mis regalos
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-stone-50 rounded-md text-center text-stone-500 text-sm">
                  {inCart > 0 ? 'Ya has añadido todas las unidades disponibles a tu lista.' : 'Este regalo ya ha sido completado. ¡Gracias!'}
                </div>
              )}
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Dashboard = ({ 
  viewingUserId, 
  currentWeekData, 
  activePhaseIndex 
}: { 
  viewingUserId: string | null;
  currentWeekData: { weeks: number; days: number };
  activePhaseIndex: number;
}) => {
  const { profile, user } = useAuth();
  const isOwner = user?.uid === viewingUserId;
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [editingBankDetails, setEditingBankDetails] = useState<Partial<BankDetails>>({});
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankMessage, setBankMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    if (!viewingUserId) return;
    const qGifts = query(collection(db, 'profiles', viewingUserId, 'wishlist'));
    const qTasks = query(collection(db, 'profiles', viewingUserId, 'tasks'));
    
    const unsubGifts = onSnapshot(qGifts, (snapshot) => {
      setGifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gift)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/wishlist`));
    
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/tasks`));

    const unsubBank = onSnapshot(doc(db, 'profiles', viewingUserId, 'settings', 'bankDetails'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BankDetails;
        setBankDetails(data);
        setEditingBankDetails(data);
      }
    });

    return () => { unsubGifts(); unsubTasks(); unsubBank(); };
  }, [viewingUserId]);

  const handleSaveBankDetails = async () => {
    if (!viewingUserId) return;
    setIsSavingBank(true);
    setBankMessage(null);
    try {
      await setDoc(doc(db, 'profiles', viewingUserId, 'settings', 'bankDetails'), editingBankDetails);
      setBankMessage({ type: 'success', text: 'Datos bancarios guardados correctamente.' });
      setTimeout(() => setBankMessage(null), 3000);
    } catch (error) {
      console.error('Error saving bank details:', error);
      setBankMessage({ type: 'error', text: 'Error al guardar los datos bancarios.' });
    } finally {
      setIsSavingBank(false);
    }
  };

  const reservedCount = gifts.filter(g => g.isReserved || (g.isRepeatable && (g.quantityReserved || 0) > 0)).length;
  const pendingTasks = tasks.filter(t => !t.isCompleted).length;

  const giftStats = [
    { name: 'Apartados', value: reservedCount },
    { name: 'Pendientes', value: gifts.length - reservedCount },
  ];

  const taskStats = ['Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital', 'Trámites', 'Misiones'].map(cat => ({
    category: cat,
    total: tasks.filter(t => t.category === cat).length,
    completed: tasks.filter(t => t.category === cat && t.isCompleted).length
  }));

  const COLORS = ['#0d9488', '#e7e5e4'];

  const calculateCountdown = () => {
    if (!profile?.dueDate) return 0;
    const today = new Date();
    const dueDate = new Date(profile.dueDate);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return Math.max(0, diffDays);
  };

  const countdownDays = calculateCountdown();

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Status & Timeline */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-stone-200 shadow-sm overflow-hidden">
            <div className="bg-teal-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Estado Actual</span>
                <Baby className="h-5 w-5" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{currentWeekData.weeks}</span>
                <span className="text-lg font-bold opacity-90">Semanas</span>
                {currentWeekData.days > 0 && (
                  <>
                    <span className="text-2xl font-bold ml-2">+{currentWeekData.days}</span>
                    <span className="text-sm font-bold opacity-90">Días</span>
                  </>
                )}
              </div>
            </div>
            <CardContent className="p-4 bg-stone-50/50">
              <div className="text-[10px] font-bold mb-4 uppercase tracking-widest text-stone-500">Hoja de Ruta</div>
              <div className="space-y-0">
                {PREGNANCY_PHASES.map((phase, idx) => {
                  const isActive = idx === activePhaseIndex;
                  const isPast = idx < activePhaseIndex;
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-white shadow-sm border border-stone-200' : ''}`}>
                      <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-teal-600 animate-pulse' : isPast ? 'bg-teal-600' : 'bg-stone-200'}`} />
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'text-teal-600' : 'text-stone-400'}`}>{phase.weeksLabel}</div>
                        <div className={`text-xs font-bold ${isActive ? 'text-stone-800' : 'text-stone-500'}`}>{phase.shortTitle}</div>
                      </div>
                      {isPast && <CheckCircle2 className="h-3 w-3 text-teal-600" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GiftIcon className="h-4 w-4 text-rose-500" /> Resumen Regalos
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={giftStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {giftStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Bank Details & Task Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="stat-label">Cuenta Regresiva</div>
              <div className="stat-value">{countdownDays} Días</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tareas Críticas</div>
              <div className="stat-value text-rose-500">{pendingTasks} Pend.</div>
            </div>
          </div>

          {isOwner && (
            <Card className="border-stone-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-stone-400" /> Configuración de Transferencias
                </CardTitle>
                <CardDescription>
                  Estos datos se mostrarán a los invitados cuando elijan la opción "Transferir Valor" al hacer un regalo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bankMessage && (
                  <div className={`p-3 mb-4 rounded-md text-sm ${bankMessage.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
                    {bankMessage.text}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre Completo</label>
                    <Input 
                      placeholder="Ej. Juan Pérez" 
                      value={editingBankDetails.fullName || ''} 
                      onChange={e => setEditingBankDetails({...editingBankDetails, fullName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">RUT</label>
                    <Input 
                      placeholder="Ej. 11.111.111-1" 
                      value={editingBankDetails.rut || ''} 
                      onChange={e => setEditingBankDetails({...editingBankDetails, rut: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banco</label>
                    <Input 
                      placeholder="Ej. Banco Estado" 
                      value={editingBankDetails.bankName || ''} 
                      onChange={e => setEditingBankDetails({...editingBankDetails, bankName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Cuenta</label>
                    <Input 
                      placeholder="Ej. Cuenta Corriente" 
                      value={editingBankDetails.accountType || ''} 
                      onChange={e => setEditingBankDetails({...editingBankDetails, accountType: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número de Cuenta</label>
                    <Input 
                      placeholder="Ej. 123456789" 
                      value={editingBankDetails.accountNumber || ''} 
                      onChange={e => setEditingBankDetails({...editingBankDetails, accountNumber: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Correo Electrónico</label>
                    <Input 
                      placeholder="Ej. correo@ejemplo.com" 
                      value={editingBankDetails.email || ''} 
                      onChange={e => setEditingBankDetails({...editingBankDetails, email: e.target.value})} 
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveBankDetails} 
                  className="mt-6 bg-teal-600 hover:bg-teal-700"
                  disabled={isSavingBank}
                >
                  {isSavingBank ? 'Guardando...' : 'Guardar Datos Bancarios'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-stone-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="h-5 w-5 text-teal-600" /> Progreso de Tareas
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="category" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#0d9488" name="Completadas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="#e7e5e4" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Checklists = ({ 
  viewingUserId,
  isAdding,
  setIsAdding
}: { 
  viewingUserId: string | null,
  isAdding: boolean,
  setIsAdding: (v: boolean) => void
}) => {
  const { user } = useAuth();
  const isOwner = user?.uid === viewingUserId;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    category: 'Bebé',
    phase: 'Early',
    priority: 'Medium',
    isCompleted: false,
    dueDate: new Date().toISOString().split('T')[0]
  });

  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!viewingUserId) return;
    const tasksQ = query(collection(db, 'profiles', viewingUserId, 'tasks'));
    const giftsQ = query(collection(db, 'profiles', viewingUserId, 'wishlist'));

    const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);

      // Auto-seed if empty and is owner
      if (snapshot.empty && isOwner && !isSeeding) {
        seedTasks();
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/tasks`));

    const unsubGifts = onSnapshot(giftsQ, (snapshot) => {
      setGifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gift)));

      // Cleanup old picsum images
      if (isOwner) {
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.imageUrl && data.imageUrl.includes('picsum.photos')) {
            updateDoc(doc(db, 'profiles', viewingUserId, 'wishlist', docSnap.id), {
              imageUrl: ''
            }).catch(console.error);
          }
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/wishlist`));

    return () => {
      unsubTasks();
      unsubGifts();
    };
  }, [viewingUserId, isOwner]);

  const seedTasks = async () => {
    if (!viewingUserId) return;
    setIsSeeding(true);
    try {
      for (const task of MASTER_TASKS) {
        await addDoc(collection(db, 'profiles', viewingUserId, 'tasks'), task);
      }
    } catch (error) {
      console.error('Error seeding tasks:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!viewingUserId) return;
    try {
      await updateDoc(doc(db, 'profiles', viewingUserId, 'tasks', task.id), { isCompleted: !task.isCompleted });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${viewingUserId}/tasks/${task.id}`);
    }
  };

  const handleAddTask = async () => {
    if (!viewingUserId) return;
    try {
      await addDoc(collection(db, 'profiles', viewingUserId, 'tasks'), newTask);
      setIsAdding(false);
      setNewTask({ title: '', category: 'Bebé', phase: 'Early', priority: 'Medium', isCompleted: false });
      await createNotification(
        viewingUserId,
        'Nueva Tarea',
        `Se ha añadido una tarea: ${newTask.title}`,
        'task'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `profiles/${viewingUserId}/tasks`);
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.category === filter);

  // Helper to find gift info for a task
  const getGiftInfo = (taskTitle: string) => {
    const gift = gifts.find(g => g.name.toLowerCase().includes(taskTitle.toLowerCase()) || taskTitle.toLowerCase().includes(g.name.toLowerCase()));
    if (gift && (gift.isReserved || (gift.quantityReserved || 0) > 0)) {
      return gift.reservedBy;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Checklists</h2>
          <p className="text-sm text-stone-500">Tareas pendientes para estar listos</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {isOwner && (
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger render={<Button className="hidden sm:flex flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm h-9 sm:h-10" />}>
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Nueva Tarea
              </DialogTrigger>
              <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Tarea</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input placeholder="Título de la tarea" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <select className="rounded-md border p-2" value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value as any})}>
                <option value="Bebé">Bebé</option>
                <option value="Mamá">Mamá</option>
                <option value="Casa">Casa</option>
                <option value="Alimentación">Alimentación</option>
                <option value="Hospital">Hospital</option>
                <option value="Trámites">Trámites</option>
                <option value="Misiones">Misiones</option>
              </select>
              <select className="rounded-md border p-2 text-sm" value={newTask.phase} onChange={e => setNewTask({...newTask, phase: e.target.value as any})}>
                <option value="Early">Fase Temprana</option>
                <option value="Mid">Fase Media</option>
                <option value="Late">Fase Final</option>
              </select>
              <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              <Button onClick={handleAddTask} className="bg-teal-600">Guardar</Button>
            </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital', 'Trámites', 'Misiones'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              filter === cat 
                ? 'bg-teal-600 text-white' 
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {cat === 'All' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredTasks.map(task => {
          const gifter = getGiftInfo(task.title);
          const isCompletedByGift = !!gifter;
          
          return (
            <div key={task.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
              <button 
                onClick={() => toggleTask(task)} 
                className={`transition-transform active:scale-90 ${isCompletedByGift ? 'text-rose-500' : 'text-teal-600'}`}
                disabled={isCompletedByGift}
              >
                {task.isCompleted || isCompletedByGift ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-stone-200" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${task.isCompleted || isCompletedByGift ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                  {task.title}
                </p>
                <div className="flex gap-2 mt-1 items-center flex-wrap">
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">{task.category}</span>
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">•</span>
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">{task.phase}</span>
                  {gifter && (
                    <>
                      <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">•</span>
                      <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-rose-100 text-[8px] font-black px-1.5 py-0 h-4">
                        REGALADO POR: {gifter.toUpperCase()}
                      </Badge>
                    </>
                  )}
                  {task.dueDate && (
                    <>
                      <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">•</span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${
                        new Date(task.dueDate) < new Date() && !task.isCompleted ? 'text-rose-500' : 'text-stone-400'
                      }`}>
                        Vence: {task.dueDate}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Gallery = ({ 
  viewingUserId,
  isAdding,
  setIsAdding
}: { 
  viewingUserId: string | null,
  isAdding: boolean,
  setIsAdding: (v: boolean) => void
}) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ description: '', date: new Date().toISOString().split('T')[0] });
  const { user, isAdmin } = useAuth();
  const isOwner = user?.uid === viewingUserId;

  useEffect(() => {
    if (!viewingUserId) return;
    const q = query(collection(db, 'profiles', viewingUserId, 'photos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryPhoto)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/photos`));
    return unsubscribe;
  }, [viewingUserId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewingUserId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `gallery/${viewingUserId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'profiles', viewingUserId, 'photos'), {
        url,
        description: newPhoto.description,
        date: newPhoto.date,
        createdAt: serverTimestamp(),
        userId: viewingUserId
      });
      
      setNewPhoto({ description: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!viewingUserId) return;
    try {
      await deleteDoc(doc(db, 'profiles', viewingUserId, 'photos', id));
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Galería de Recuerdos</h2>
          <p className="text-sm text-stone-500">Momentos especiales de este viaje</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
        {isAdmin && (
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger render={<Button className="hidden sm:flex flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm h-9 sm:h-10" />}>
              <Camera className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Subir Foto
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir a la Galería</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-xl p-8 hover:border-teal-600 transition-colors relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Upload className="h-8 w-8 text-stone-300 mb-2" />
                  <p className="text-xs text-stone-500">{isUploading ? 'Subiendo...' : 'Haz clic o arrastra una imagen'}</p>
                </div>
                <Input 
                  placeholder="Descripción (opcional)" 
                  value={newPhoto.description} 
                  onChange={e => setNewPhoto({...newPhoto, description: e.target.value})} 
                />
                <Input 
                  type="date" 
                  value={newPhoto.date} 
                  onChange={e => setNewPhoto({...newPhoto, date: e.target.value})} 
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative aspect-square bg-stone-100 rounded-xl overflow-hidden border border-stone-200 shadow-sm"
            >
              <img 
                src={photo.url} 
                alt={photo.description} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                <p className="text-white text-[10px] font-medium line-clamp-2">{photo.description || 'Sin descripción'}</p>
                <p className="text-white/70 text-[8px] mt-1 uppercase tracking-wider font-bold">{photo.date}</p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {photos.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-200">
          <ImageIcon className="h-12 w-12 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Aún no hay fotos en la galería</p>
        </div>
      )}
    </div>
  );
};

const Timeline = ({ activePhaseIdx, babyNames }: { activePhaseIdx: number, babyNames: string[] }) => {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Cronograma de Preparación</h2>
        <p className="text-sm text-stone-500">Roadmap hacia la llegada de {babyNames.join(' & ')}</p>
      </div>

      <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:h-full before:w-0.5 before:bg-stone-200">
        {PREGNANCY_PHASES.map((phase, idx) => {
          const isActive = idx === activePhaseIdx;
          const isPast = idx < activePhaseIdx;
          
          return (
          <div key={idx} className="relative pl-12">
            <div className={`absolute left-2 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 ${isActive ? 'bg-white border-teal-600' : isPast ? 'bg-teal-600 border-teal-600' : 'bg-white border-stone-200'}`}>
              {isActive && <div className="h-1.5 w-1.5 rounded-full bg-teal-600" />}
            </div>
            <div className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${isActive ? 'border-teal-600 ring-1 ring-teal-600/20' : 'border-stone-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isActive ? 'text-teal-800' : 'text-stone-800'}`}>{phase.title}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-teal-600' : 'text-stone-400'}`}>{phase.weeksLabel}</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {phase.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${isActive ? 'bg-teal-400' : isPast ? 'bg-teal-600' : 'bg-stone-300'}`} />
                    <span className={isPast ? 'text-stone-400 line-through' : ''}>{item}</span>
                  </li>
                ))}
              </ul>
              {isPast && (
                <div className="mt-4 pt-4 border-t border-stone-50 flex items-center gap-2 text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Fase Completada / En curso
                </div>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

const AIAssistant = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: '¡Hola! Soy tu asistente. ¿Tienen dudas sobre qué incluir en la maleta del hospital?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const response = await askGemini(userMsg);
    setMessages(prev => [...prev, { role: 'ai', text: response || 'Lo siento, no pude procesar eso.' }]);
    setIsLoading(false);
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[400px] bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-stone-100 text-xs font-bold flex items-center gap-2">
        <span className="bg-teal-50 p-1 rounded">✨</span>
        Asistente para Padres
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-stone-50 text-stone-800 border border-stone-200'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="animate-pulse rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[11px] text-stone-400">
                Escribiendo...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-stone-100">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input 
            className="flex-1 bg-white border border-stone-200 rounded-full px-3 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="Escribe una pregunta..." 
            value={input} 
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
          />
        </form>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { user, profile, isAuthReady, isAdmin, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [isGuestView, setIsGuestView] = useState(false);
  
  // Lifted Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [giftMethod, setGiftMethod] = useState<'buy' | 'transfer' | null>(null);
  const [reserveName, setReserveName] = useState('');
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [successModal, setSuccessModal] = useState<{isOpen: boolean, method: 'buy' | 'transfer' | null, total: number}>({isOpen: false, method: null, total: 0});
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    if (u) {
      setViewingUserId(u);
      setIsGuestView(true);
      const unsubscribe = onSnapshot(doc(db, 'profiles', u), (docSnap) => {
        if (docSnap.exists()) {
          setGuestProfile(docSnap.data());
        }
      });
      return unsubscribe;
    } else if (user) {
      setViewingUserId(user.uid);
      setIsGuestView(false);
      setGuestProfile(null);
    } else {
      setViewingUserId(null);
      setIsGuestView(false);
      setGuestProfile(null);
    }
  }, [user]);

  const currentWeekData = getCurrentPregnancyWeek(
    guestProfile?.dueDate || profile?.dueDate,
    guestProfile?.gestationWeekAtStart || profile?.gestationWeekAtStart,
    guestProfile?.gestationDaysAtStart || profile?.gestationDaysAtStart,
    guestProfile?.pregnancyStartDate || profile?.pregnancyStartDate
  );
  const currentWeek = currentWeekData.weeks;
  const activePhaseIndex = getActivePhaseIndex(currentWeek);

  useEffect(() => {
    if (!viewingUserId) return;
    const unsubscribe = onSnapshot(doc(db, 'profiles', viewingUserId, 'settings', 'bankDetails'), (docSnap) => {
      if (docSnap.exists()) {
        setBankDetails(docSnap.data() as BankDetails);
      } else {
        setBankDetails(null);
      }
    });
    return unsubscribe;
  }, [viewingUserId]);

  const handleRemoveFromCart = (giftId: string) => {
    setCart(prev => prev.filter(item => item.gift.id !== giftId));
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0 || !reserveName.trim() || !giftMethod || !viewingUserId) return;
    
    setCheckoutError('');
    const finalName = giftMethod === 'transfer' ? `${reserveName} (Transferencia)` : reserveName;
    
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read all documents first
        const giftRefs = cart.map(item => doc(db, 'profiles', viewingUserId, 'wishlist', item.gift.id));
        const giftDocs = await Promise.all(giftRefs.map(ref => transaction.get(ref)));

        // 2. Verify availability and prepare updates
        const updates = [];
        for (let i = 0; i < cart.length; i++) {
          const item = cart[i];
          const giftDoc = giftDocs[i];
          
          if (!giftDoc.exists()) {
            throw new Error(`El regalo "${item.gift.name}" ya no existe.`);
          }
          
          const currentData = giftDoc.data() as Gift;
          const available = currentData.isRepeatable 
            ? (currentData.quantityNeeded || 1) - (currentData.quantityReserved || 0)
            : (currentData.isReserved ? 0 : 1);

          if (available < item.quantity) {
            throw new Error(`No hay suficiente disponibilidad para "${item.gift.name}". Alguien más podría haberlo reservado.`);
          }

          updates.push({
            ref: giftRefs[i],
            data: currentData.isRepeatable ? {
              quantityReserved: (currentData.quantityReserved || 0) + item.quantity
            } : {
              isReserved: true,
              reservedBy: finalName
            }
          });
        }

        // 3. Perform updates
        updates.forEach(update => {
          transaction.update(update.ref, update.data);
        });
      });

      // 4. Create notifications and sync with tasks
      const tasksRef = collection(db, 'profiles', viewingUserId, 'tasks');
      for (const item of cart) {
        // Create notification
        await createNotification(
          viewingUserId,
          '¡Nuevo Regalo!',
          `${finalName} ha regalado ${item.quantity > 1 ? `${item.quantity} unidad(es) de: ` : ''}${item.gift.name}`,
          'gift',
          item.gift.id
        );

        // Sync with tasks
        try {
          const q = query(tasksRef, where('title', '==', item.gift.name));
          const taskSnap = await getDocs(q);
          for (const taskDoc of taskSnap.docs) {
            await updateDoc(taskDoc.ref, {
              isCompleted: true,
              reservedBy: finalName
            });
          }
        } catch (taskErr) {
          console.error('Error syncing task:', taskErr);
        }
      }

      const total = cart.reduce((acc, item) => acc + ((item.gift.price || 0) * item.quantity), 0);
      const method = giftMethod;

      setCart([]);
      setIsCartOpen(false);
      setGiftMethod(null);
      setReserveName('');
      setSuccessModal({ isOpen: true, method, total });

    } catch (error: any) {
      console.error(error);
      setCheckoutError(error.message || 'Hubo un error al procesar tu regalo. Por favor intenta de nuevo.');
    }
  };

  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAdmin]);

  // Task Reminders
  useEffect(() => {
    if (!isAdmin || !user) return;
    const q = query(collection(db, 'profiles', user.uid, 'tasks'), where('isCompleted', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date().toISOString().split('T')[0];
      snapshot.docs.forEach(doc => {
        const task = doc.data() as Task;
        if (task.dueDate === today) {
          createNotification(
            user.uid,
            'Recordatorio de Tarea',
            `Hoy vence la tarea: ${task.title}`,
            'task',
            doc.id
          );
        }
      });
    });
    return unsubscribe;
  }, [isAdmin, user]);

  const [isAddingWishlist, setIsAddingWishlist] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  const handleMobileAdd = () => {
    if (activeTab === 'wishlist') setIsAddingWishlist(true);
    if (activeTab === 'checklists') setIsAddingTask(true);
    if (activeTab === 'gallery') setIsAddingPhoto(true);
  };

  if (!isAuthReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="text-stone-500 font-display">Cargando amor...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuestView) {
    return <LandingPage />;
  }

  if (user && !profile && !isGuestView) {
    return <Onboarding />;
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50 overflow-hidden">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} guestProfile={guestProfile} isGuestView={isGuestView} />
      
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative pb-20 sm:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard viewingUserId={viewingUserId} currentWeekData={currentWeekData} activePhaseIndex={activePhaseIndex} />}
              {activeTab === 'wishlist' && (
                <Wishlist 
                  cart={cart} 
                  setCart={setCart} 
                  setIsCartOpen={setIsCartOpen}
                  bankDetails={bankDetails}
                  viewingUserId={viewingUserId}
                  currentWeekData={currentWeekData}
                  isAdding={isAddingWishlist}
                  setIsAdding={setIsAddingWishlist}
                />
              )}
              {activeTab === 'checklists' && (
                <Checklists 
                  viewingUserId={viewingUserId} 
                  isAdding={isAddingTask}
                  setIsAdding={setIsAddingTask}
                />
              )}
              {activeTab === 'gallery' && (
                <Gallery 
                  viewingUserId={viewingUserId} 
                  isAdding={isAddingPhoto}
                  setIsAdding={setIsAddingPhoto}
                />
              )}
              {activeTab === 'timeline' && (
                <Timeline 
                  activePhaseIdx={activePhaseIndex} 
                  babyNames={guestProfile?.babyNames || profile?.babyNames || [guestProfile?.babyName || profile?.babyName || 'Bebé']} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        guestProfile={guestProfile} 
        onAddAction={handleMobileAdd}
      />

      {/* Cart Floating Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-40 flex justify-between items-center sm:justify-center sm:gap-8"
          >
            <div className="text-sm font-medium text-stone-800 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-teal-600" />
              <span className="hidden sm:inline">Tienes </span>
              <span className="font-bold mx-1">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
              <span>regalo(s) seleccionado(s)</span>
            </div>
            <Button onClick={() => setIsCartOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              Confirmar Regalos
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <Dialog open={isCartOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCartOpen(false);
          setGiftMethod(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar tus Regalos</DialogTitle>
            <CardDescription>
              Revisa los regalos que has seleccionado
            </CardDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.gift.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-sm text-stone-800 line-clamp-1">{item.gift.name}</p>
                    <p className="text-xs text-stone-500">
                      {item.quantity} unidad(es) 
                      {item.gift.price ? ` • ${(item.gift.price * item.quantity).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-100 shrink-0" onClick={() => handleRemoveFromCart(item.gift.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {cart.some(item => item.gift.price) && (
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg text-teal-800 font-bold">
                <span>Total Estimado:</span>
                <span>
                  {cart.reduce((acc, item) => acc + ((item.gift.price || 0) * item.quantity), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                </span>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h4 className="font-medium text-sm">¿Cómo prefieres hacer estos regalos?</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={giftMethod === 'buy' ? 'default' : 'outline'} 
                  className={giftMethod === 'buy' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => setGiftMethod('buy')}
                >
                  Comprar y Entregar
                </Button>
                <Button 
                  variant={giftMethod === 'transfer' ? 'default' : 'outline'}
                  className={giftMethod === 'transfer' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => setGiftMethod('transfer')}
                >
                  Transferir Valor
                </Button>
              </div>

              {giftMethod === 'buy' && (
                <div className="p-3 bg-stone-50 rounded-md text-sm space-y-2 text-stone-600">
                  <p>Puedes comprar los regalos donde prefieras y entregarlos en el Baby Shower o enviarlos a nuestra dirección.</p>
                </div>
              )}

              {giftMethod === 'transfer' && (
                <div className="p-3 bg-stone-50 rounded-md text-sm space-y-2 text-stone-600">
                  <p>Al confirmar, te mostraremos los datos bancarios para realizar la transferencia.</p>
                </div>
              )}

              {giftMethod && (
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <h4 className="font-medium text-sm">Confirma tus regalos</h4>
                  <Input 
                    placeholder="Tu Nombre" 
                    value={reserveName} 
                    onChange={e => setReserveName(e.target.value)} 
                    required
                  />
                  {checkoutError && (
                    <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-md">
                      {checkoutError}
                    </div>
                  )}
                  <Button onClick={handleCheckoutSubmit} className="w-full bg-teal-600 hover:bg-teal-700" disabled={!reserveName.trim() || cart.length === 0}>
                    Confirmar Regalos
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={successModal.isOpen} onOpenChange={(open) => !open && setSuccessModal({ ...successModal, isOpen: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-600">
              <CheckCircle2 className="h-6 w-6" />
              ¡Regalos Confirmados!
            </DialogTitle>
            <CardDescription>
              Muchas gracias por ser parte de este momento tan especial.
            </CardDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {successModal.method === 'transfer' ? (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                  <p className="text-sm text-teal-800 mb-3">
                    Por favor, realiza la transferencia por el total de <strong>{successModal.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</strong> a la siguiente cuenta:
                  </p>
                  {bankDetails ? (
                    <div className="space-y-1 text-sm font-medium text-stone-800 bg-white p-3 rounded border border-teal-100">
                      <p><span className="text-stone-500 font-normal">Nombre:</span> {bankDetails.fullName}</p>
                      <p><span className="text-stone-500 font-normal">RUT:</span> {bankDetails.rut}</p>
                      <p><span className="text-stone-500 font-normal">Banco:</span> {bankDetails.bankName}</p>
                      <p><span className="text-stone-500 font-normal">Tipo:</span> {bankDetails.accountType}</p>
                      <p><span className="text-stone-500 font-normal">Cuenta:</span> {bankDetails.accountNumber}</p>
                      <p><span className="text-stone-500 font-normal">Email:</span> {bankDetails.email}</p>
                    </div>
                  ) : (
                    <p className="text-rose-500 text-sm">Los datos bancarios aún no han sido configurados.</p>
                  )}
                </div>
                <Button onClick={() => setSuccessModal({ ...successModal, isOpen: false })} className="w-full bg-teal-600 hover:bg-teal-700">
                  Entendido, ¡cerrar!
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-stone-50 rounded-lg">
                  <GiftIcon className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                  <p className="text-sm text-stone-600">
                    Hemos registrado tu intención de compra. Puedes entregar el regalo en el Baby Shower o enviarlo a nuestra dirección.
                  </p>
                </div>
                <Button onClick={() => setSuccessModal({ ...successModal, isOpen: false })} className="w-full bg-teal-600 hover:bg-teal-700">
                  ¡Genial!
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
