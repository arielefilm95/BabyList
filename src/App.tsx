import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import {
  Baby,
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  ExternalLink,
  Gift as GiftIcon,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Settings,
  ShoppingCart,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Onboarding } from './components/Onboarding';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CATEGORY_CONFIG,
  MASTER_TASKS,
  PHASE_LABELS,
  PREGNANCY_PHASES,
  PREGNANCY_TIPS,
  PRIORITY_CONFIG,
  getBabyDevelopment,
} from './constants';
import { useAuth } from './lib/AuthContext';
import { db, handleFirestoreError, OperationType, storage } from './lib/firebase';
import {
  formatDateRange,
  formatIsoDate,
  getActivePhaseIndex,
  getCurrentPregnancyWeek,
  getDaysUntilDueDate,
  getPhaseDateRange,
  getTaskPhaseBucket,
  getTaskPhaseDateRange,
  getTaskPhaseRank,
  isPastDate,
  resolveTaskDueDate,
} from './lib/pregnancy';
import { useProfileCollections } from './lib/useProfileCollections';
import type { AppNotification, BankDetails, CartItem, GalleryPhoto, Gift, Profile, Task } from './types';

const WISHLIST_CATEGORIES = ['Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital'] as const;
const TASK_CATEGORIES = ['Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital', 'Trámites', 'Misiones'] as const;
const TASK_PHASES = ['Early', 'Mid', 'Late'] as const;

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const taskMatchesGift = (taskTitle: string, giftName: string) => {
  const normalizedTask = normalizeComparableText(taskTitle);
  const normalizedGift = normalizeComparableText(giftName);

  return (
    normalizedTask === normalizedGift ||
    normalizedTask.includes(normalizedGift) ||
    normalizedGift.includes(normalizedTask)
  );
};

const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'gift' | 'task' | 'system',
  targetId?: string,
  dedupeKey?: string
) => {
  const payload = {
    title,
    message,
    type,
    targetId,
    isRead: false,
    createdAt: serverTimestamp(),
  };

  try {
    if (dedupeKey) {
      const notificationRef = doc(db, 'profiles', userId, 'notifications', dedupeKey);
      const existing = await getDoc(notificationRef);
      if (existing.exists()) return;
      await setDoc(notificationRef, payload);
    } else {
      await addDoc(collection(db, 'profiles', userId, 'notifications'), payload);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const progressPercent = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

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
        if (username.includes('@') || username.includes(' ')) {
          throw new Error('El nombre de usuario no puede contener espacios ni @');
        }
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-200 mb-6">
            <Baby className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">BabyPlan</h1>
          <p className="text-stone-600">{isLogin ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}</p>
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
                      placeholder="miusuario"
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

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base font-bold" disabled={loading}>
                {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-sm mb-6">
                  <span className="px-2 bg-white text-stone-500">O continuar con</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full h-12 font-medium" onClick={loginWithGoogle}>
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
              <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-teal-600 hover:underline font-medium">
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Navbar = ({
  activeTab,
  setActiveTab,
  guestProfile,
}: {
  activeTab: string;
  setActiveTab: (value: string) => void;
  guestProfile?: Partial<Profile> | null;
}) => {
  const { isAdmin, logout, user, profile, loginWithGoogle, deleteUserAccount } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isResettingTasks, setIsResettingTasks] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    parent1Name: '',
    parent2Name: '',
    babyNames: [''],
    dueDate: '',
  });

  useEffect(() => {
    if (!profile) return;
    setSettingsForm({
      parent1Name: profile.parent1Name || '',
      parent2Name: profile.parent2Name || '',
      babyNames: profile.babyNames || [''],
      dueDate: profile.dueDate || '',
    });
  }, [profile]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    const notificationsQuery = query(
      collection(db, 'profiles', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((notificationDoc) => ({ id: notificationDoc.id, ...notificationDoc.data() } as AppNotification)));
    });

    return unsubscribe;
  }, [isAdmin, user]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const markAllAsRead = async () => {
    if (!user) return;

    await Promise.all(
      notifications
        .filter((notification) => !notification.isRead)
        .map((notification) =>
          updateDoc(doc(db, 'profiles', user.uid, 'notifications', notification.id), {
            isRead: true,
          })
        )
    );
  };

  const saveSettings = async () => {
    if (!user || !profile) return;

    try {
      await updateDoc(doc(db, 'profiles', user.uid), settingsForm);
      setShowSettingsDialog(false);
    } catch (error) {
      console.error(error);
    }
  };

  const resetTasks = async () => {
    if (!user) return;
    if (!window.confirm('¿Resetear todas las tareas? Esto eliminará las tareas actuales y las volverá a crear.')) return;

    setIsResettingTasks(true);

    try {
      const tasksSnapshot = await getDocs(collection(db, 'profiles', user.uid, 'tasks'));
      const batch = writeBatch(db);
      const tasksCollectionRef = collection(db, 'profiles', user.uid, 'tasks');

      tasksSnapshot.docs.forEach((taskDoc) => {
        batch.delete(doc(db, 'profiles', user.uid, 'tasks', taskDoc.id));
      });

      MASTER_TASKS.forEach((task) => {
        batch.set(doc(tasksCollectionRef), task);
      });

      batch.set(doc(db, 'profiles', user.uid), { hasSeededTasks: true }, { merge: true });
      await batch.commit();

      alert('Tareas reseteadas correctamente');
      setShowSettingsDialog(false);
    } catch (error) {
      console.error(error);
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
              <Input value={settingsForm.parent1Name} onChange={(e) => setSettingsForm({ ...settingsForm, parent1Name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nombre de tu pareja (opcional)</Label>
              <Input value={settingsForm.parent2Name} onChange={(e) => setSettingsForm({ ...settingsForm, parent2Name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nombres del Bebé</Label>
              <Input
                value={settingsForm.babyNames[0] || ''}
                onChange={(e) => {
                  const nextNames = [...settingsForm.babyNames];
                  nextNames[0] = e.target.value;
                  setSettingsForm({ ...settingsForm, babyNames: nextNames });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Probable de Parto</Label>
              <Input type="date" value={settingsForm.dueDate} onChange={(e) => setSettingsForm({ ...settingsForm, dueDate: e.target.value })} />
            </div>
            <div className="pt-4 border-t border-stone-200">
              <h4 className="text-sm font-bold text-amber-600 mb-2">Herramientas</h4>
              <Button variant="outline" className="w-full mb-2" onClick={resetTasks} disabled={isResettingTasks}>
                <ListChecks className="w-4 h-4 mr-2" /> {isResettingTasks ? 'Reseteando...' : 'Resetear Tareas'}
              </Button>
            </div>
            <div className="pt-4 border-t border-stone-200">
              <h4 className="text-sm font-bold text-rose-600 mb-2">Zona de Peligro</h4>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (!window.confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
                  deleteUserAccount()
                    .then(() => logout())
                    .catch(() => alert('Debes volver a iniciar sesión para eliminar la cuenta.'));
                }}
              >
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
            className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
              activeTab === 'wishlist' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            Wishlist
          </button>
          {!guestProfile && isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'dashboard' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('checklists')}
                className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'checklists' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Checklists
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'gallery' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Galería
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'timeline' ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Timeline
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!guestProfile && isAdmin && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-stone-600"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) void markAllAsRead();
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
                          {notifications.map((notification) => (
                            <div key={notification.id} className={`p-3 transition-colors ${notification.isRead ? 'bg-white' : 'bg-teal-50/30'}`}>
                              <div className="flex gap-3">
                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                  notification.type === 'gift'
                                    ? 'bg-rose-500'
                                    : notification.type === 'task'
                                      ? 'bg-teal-600'
                                      : 'bg-stone-400'
                                }`} />
                                <div>
                                  <div className="text-[11px] font-bold text-stone-800">{notification.title}</div>
                                  <div className="text-[10px] text-stone-600 leading-tight mt-0.5">{notification.message}</div>
                                  <div className="text-[9px] text-stone-400 mt-1 uppercase font-bold tracking-wider">
                                    {notification.createdAt?.toDate
                                      ? notification.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      : 'Recién'}
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
                    <AvatarImage src={user.photoURL || ''} alt={profile?.parent1Name || 'Usuario'} />
                    <AvatarFallback className="bg-teal-100 text-teal-700">
                      {profile?.parent1Name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.parent1Name || user.displayName || 'Usuario'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email || ''}</p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {!guestProfile && isAdmin && (
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

const MobileNav = ({
  activeTab,
  setActiveTab,
  onAddAction,
}: {
  activeTab: string;
  setActiveTab: (value: string) => void;
  onAddAction?: () => void;
}) => {
  const { isAdmin } = useAuth();
  const showAddButton = isAdmin && ['wishlist', 'checklists', 'gallery'].includes(activeTab);

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-1 z-50 flex justify-around items-center h-16">
      <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'text-teal-600' : 'text-stone-400'}`}>
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-bold">Inicio</span>
      </button>
      <button onClick={() => setActiveTab('wishlist')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'wishlist' ? 'text-teal-600' : 'text-stone-400'}`}>
        <GiftIcon className="w-5 h-5" />
        <span className="text-[10px] font-bold">Wishlist</span>
      </button>
      {showAddButton ? (
        <button onClick={onAddAction} className="flex flex-col items-center justify-center -mt-8 bg-teal-600 text-white w-14 h-14 rounded-full shadow-lg shadow-teal-200 border-4 border-stone-50 active:scale-90 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-14" />
      )}
      <button onClick={() => setActiveTab('checklists')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'checklists' ? 'text-teal-600' : 'text-stone-400'}`}>
        <ListChecks className="w-5 h-5" />
        <span className="text-[10px] font-bold">Tareas</span>
      </button>
      <button onClick={() => setActiveTab('gallery')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'gallery' ? 'text-teal-600' : 'text-stone-400'}`}>
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
  gifts,
  viewingUserId,
  currentWeekData,
  isAdding,
  setIsAdding,
}: {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  gifts: Gift[];
  viewingUserId: string | null;
  currentWeekData: { weeks: number; days: number };
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
}) => {
  const { isAdmin, profile, user } = useAuth();
  const isOwner = user?.uid === viewingUserId;
  const [giftFilter, setGiftFilter] = useState<string>('All');
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [viewingGift, setViewingGift] = useState<Gift | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [newGift, setNewGift] = useState<Partial<Gift>>({
    name: '',
    category: 'Bebé',
    isReserved: false,
    isRepeatable: false,
    quantityNeeded: 1,
    quantityReserved: 0,
    price: 0,
  });

  const filteredGifts = useMemo(
    () => gifts.filter((gift) => giftFilter === 'All' || gift.category === giftFilter),
    [gifts, giftFilter]
  );

  const handleShare = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(`${window.location.origin}?u=${user.uid}`);
    alert('¡Link de lista de deseos copiado al portapapeles!');
  };

  const handleAddGift = async () => {
    if (!viewingUserId) return;
    try {
      await addDoc(collection(db, 'profiles', viewingUserId, 'wishlist'), {
        ...newGift,
        isReserved: false,
        quantityReserved: 0,
      });
      setIsAdding(false);
      setNewGift({
        name: '',
        category: 'Bebé',
        isReserved: false,
        isRepeatable: false,
        quantityNeeded: 1,
        quantityReserved: 0,
        price: 0,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `profiles/${viewingUserId}/wishlist`);
    }
  };

  const handleEditGift = async () => {
    if (!editingGift || !viewingUserId) return;
    try {
      const { id, ...payload } = editingGift;
      await updateDoc(doc(db, 'profiles', viewingUserId, 'wishlist', id), payload);
      setEditingGift(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${viewingUserId}/wishlist/${editingGift.id}`);
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    if (!viewingUserId) return;
    if (!window.confirm('¿Eliminar este regalo de la wishlist?')) return;
    try {
      await deleteDoc(doc(db, 'profiles', viewingUserId, 'wishlist', giftId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `profiles/${viewingUserId}/wishlist/${giftId}`);
    }
  };

  const handleAddToCart = () => {
    if (!viewingGift) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.gift.id === viewingGift.id);
      if (existing) {
        return prev.map((item) =>
          item.gift.id === viewingGift.id
            ? { ...item, quantity: item.quantity + reserveQuantity }
            : item
        );
      }
      return [...prev, { gift: viewingGift, quantity: reserveQuantity }];
    });
    setIsCartOpen(true);
    setViewingGift(null);
    setReserveQuantity(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Lista de Regalos</h2>
          <p className="text-sm text-stone-500">
            Ayúdanos a preparar la llegada de {profile?.babyNames?.join(' & ') || profile?.babyName || 'nuestro bebé'}
          </p>
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
          {isOwner && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={handleShare} variant="outline" className="flex-1 sm:flex-none border-stone-200 text-stone-600 hover:bg-stone-50 text-xs sm:text-sm h-9 sm:h-10">
                <ExternalLink className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Compartir
              </Button>
              <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger render={<Button className="hidden sm:flex bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm h-9 sm:h-10" />}>
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Añadir Artículo
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Regalo</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Nombre del artículo" value={newGift.name} onChange={(e) => setNewGift({ ...newGift, name: e.target.value })} />
                    <select className="rounded-md border p-2" value={newGift.category} onChange={(e) => setNewGift({ ...newGift, category: e.target.value })}>
                      {WISHLIST_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <Input placeholder="URL de Imagen" value={newGift.imageUrl} onChange={(e) => setNewGift({ ...newGift, imageUrl: e.target.value })} />
                    <Input placeholder="URL de Compra" value={newGift.purchaseUrl} onChange={(e) => setNewGift({ ...newGift, purchaseUrl: e.target.value })} />
                    <Input type="number" placeholder="Precio (Opcional)" value={newGift.price || ''} onChange={(e) => setNewGift({ ...newGift, price: parseInt(e.target.value) || 0 })} />
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={newGift.isRepeatable} onChange={(e) => setNewGift({ ...newGift, isRepeatable: e.target.checked })} />
                      <label>¿Es repetible? (ej. pañales)</label>
                    </div>
                    {newGift.isRepeatable && (
                      <Input type="number" placeholder="Cantidad necesaria" value={newGift.quantityNeeded} onChange={(e) => setNewGift({ ...newGift, quantityNeeded: parseInt(e.target.value) || 1 })} />
                    )}
                    <Button onClick={handleAddGift} className="bg-teal-600">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', ...WISHLIST_CATEGORIES].map((category) => (
          <button
            key={category}
            onClick={() => setGiftFilter(category)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              giftFilter === category
                ? 'bg-teal-600 text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {category === 'All' ? 'Todos' : category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <AnimatePresence>
          {filteredGifts.map((gift) => {
            const remaining = gift.isRepeatable ? (gift.quantityNeeded || 1) - (gift.quantityReserved || 0) : 0;
            const isFullyReserved = gift.isRepeatable ? remaining <= 0 : gift.isReserved;

            return (
              <motion.div key={gift.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
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
                      <span>{CATEGORY_CONFIG[gift.category]?.emoji || '🎁'}</span>
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
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isFullyReserved ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'}`}>
                        {gift.isRepeatable
                          ? remaining <= 0
                            ? 'COMPLETADO'
                            : `Faltan ${remaining}`
                          : gift.isReserved
                            ? isAdmin
                              ? `Regalado por: ${gift.reservedBy || 'Invitado'}`
                              : 'REGALADO'
                            : 'Disponible'}
                      </span>
                      <div className="flex gap-1">
                        {isAdmin ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600" onClick={(e) => { e.stopPropagation(); setEditingGift(gift); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={(e) => { e.stopPropagation(); void handleDeleteGift(gift.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
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
                              isFullyReserved ? 'bg-stone-100 text-stone-400' : 'bg-teal-600 hover:bg-teal-700 text-white'
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
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={!!editingGift} onOpenChange={(open) => !open && setEditingGift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Regalo</DialogTitle>
          </DialogHeader>
          {editingGift && (
            <div className="grid gap-4 py-4">
              <Input placeholder="Nombre del artículo" value={editingGift.name} onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })} />
              <select className="rounded-md border p-2" value={editingGift.category} onChange={(e) => setEditingGift({ ...editingGift, category: e.target.value })}>
                {WISHLIST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Input placeholder="URL de Imagen" value={editingGift.imageUrl || ''} onChange={(e) => setEditingGift({ ...editingGift, imageUrl: e.target.value })} />
              <Input placeholder="URL de Compra" value={editingGift.purchaseUrl || ''} onChange={(e) => setEditingGift({ ...editingGift, purchaseUrl: e.target.value })} />
              <Input type="number" placeholder="Precio (Opcional)" value={editingGift.price || ''} onChange={(e) => setEditingGift({ ...editingGift, price: parseInt(e.target.value) || 0 })} />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editingGift.isRepeatable} onChange={(e) => setEditingGift({ ...editingGift, isRepeatable: e.target.checked })} />
                <label>¿Es repetible?</label>
              </div>
              {editingGift.isRepeatable && (
                <Input type="number" placeholder="Cantidad necesaria" value={editingGift.quantityNeeded || 1} onChange={(e) => setEditingGift({ ...editingGift, quantityNeeded: parseInt(e.target.value) || 1 })} />
              )}
              <Button onClick={handleEditGift} className="bg-teal-600">Guardar Cambios</Button>
              {(editingGift.isReserved || (editingGift.quantityReserved || 0) > 0) && viewingUserId && (
                <Button
                  variant="outline"
                  className="text-rose-500 border-rose-200 hover:bg-rose-50"
                  onClick={async () => {
                    await updateDoc(doc(db, 'profiles', viewingUserId, 'wishlist', editingGift.id), {
                      isReserved: false,
                      reservedBy: '',
                      quantityReserved: 0,
                    });
                    setEditingGift(null);
                  }}
                >
                  Quitar Reserva / Reiniciar
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingGift} onOpenChange={(open) => !open && setViewingGift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Regalo</DialogTitle>
            <CardDescription>{viewingGift?.name}</CardDescription>
          </DialogHeader>
          {viewingGift && (() => {
            const inCart = cart.find((item) => item.gift.id === viewingGift.id)?.quantity || 0;
            const remaining = viewingGift.isRepeatable
              ? (viewingGift.quantityNeeded || 1) - (viewingGift.quantityReserved || 0) - inCart
              : 1 - inCart;
            const isFullyReserved = remaining <= 0 || viewingGift.isReserved;

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

                {isOwner ? (
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
                          onChange={(e) => setReserveQuantity(Math.min(remaining, Math.max(1, parseInt(e.target.value) || 1)))}
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
                            setCart((prev) => prev.filter((item) => item.gift.id !== viewingGift.id));
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
  activePhaseIndex,
  gifts,
  tasks,
  bankDetails,
}: {
  viewingUserId: string | null;
  currentWeekData: { weeks: number; days: number };
  activePhaseIndex: number;
  gifts: Gift[];
  tasks: Task[];
  bankDetails: BankDetails | null;
}) => {
  const { profile, user } = useAuth();
  const isOwner = user?.uid === viewingUserId;
  const [editingBankDetails, setEditingBankDetails] = useState<Partial<BankDetails>>(bankDetails || {});
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankMessage, setBankMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setEditingBankDetails(bankDetails || {});
  }, [bankDetails]);

  const reservedCount = gifts.filter((gift) => gift.isReserved || (gift.quantityReserved || 0) > 0).length;
  const completedTasks = tasks.filter((task) => task.isCompleted).length;
  const pendingTasks = tasks.length - completedTasks;
  const overallTaskProgress = progressPercent(completedTasks, tasks.length);
  const countdownDays = getDaysUntilDueDate(profile?.dueDate) ?? 0;
  const development = getBabyDevelopment(currentWeekData.weeks);

  const giftStats = [
    { name: 'Apartados', value: reservedCount },
    { name: 'Pendientes', value: Math.max(0, gifts.length - reservedCount) },
  ];

  const taskStats = TASK_CATEGORIES.map((category) => ({
    category,
    total: tasks.filter((task) => task.category === category).length,
    completed: tasks.filter((task) => task.category === category && task.isCompleted).length,
  }));

  const handleSaveBankDetails = async () => {
    if (!viewingUserId) return;
    setIsSavingBank(true);
    setBankMessage(null);
    try {
      await setDoc(doc(db, 'profiles', viewingUserId, 'settings', 'bankDetails'), editingBankDetails);
      setBankMessage({ type: 'success', text: 'Datos bancarios guardados correctamente.' });
    } catch (error) {
      console.error(error);
      setBankMessage({ type: 'error', text: 'Error al guardar los datos bancarios.' });
    } finally {
      setIsSavingBank(false);
      setTimeout(() => setBankMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <div className="space-y-2">
                {PREGNANCY_PHASES.map((phase, idx) => {
                  const isActive = idx === activePhaseIndex;
                  const isPast = idx < activePhaseIndex;
                  const dateRange = getPhaseDateRange(profile?.dueDate, phase.weekStart, phase.weekEnd);

                  return (
                    <div key={phase.title} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-white shadow-sm border border-stone-200' : ''}`}>
                      <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-teal-600 animate-pulse' : isPast ? 'bg-teal-600' : 'bg-stone-200'}`} />
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'text-teal-600' : 'text-stone-400'}`}>{phase.weeksLabel}</div>
                        <div className={`text-xs font-bold ${isActive ? 'text-stone-800' : 'text-stone-500'}`}>{phase.shortTitle}</div>
                        {dateRange && (
                          <div className="text-[10px] text-stone-400 mt-0.5">{formatDateRange(dateRange.start, dateRange.end)}</div>
                        )}
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
              <CardTitle className="text-sm font-bold">Desarrollo del Bebé</CardTitle>
              <CardDescription>Semana de referencia {development.week}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Tamaño aprox.</div>
                  <div className="text-lg font-bold text-stone-800">{development.size}</div>
                </div>
                <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Peso aprox.</div>
                  <div className="text-lg font-bold text-stone-800">{development.weight}</div>
                </div>
              </div>
              <p className="text-sm text-stone-600">{development.fact}</p>
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
                  <Pie data={giftStats} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {giftStats.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={index === 0 ? '#0d9488' : '#e7e5e4'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Cuenta Regresiva</div>
              <div className="stat-value">{countdownDays} Días</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Checklist</div>
              <div className="stat-value">{overallTaskProgress}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pendientes</div>
              <div className="stat-value text-rose-500">{pendingTasks}</div>
            </div>
          </div>

          {isOwner && (
            <Card className="border-stone-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-stone-400" /> Configuración de Transferencias
                </CardTitle>
                <CardDescription>
                  Estos datos se mostrarán a los invitados cuando elijan "Transferir Valor".
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bankMessage && (
                  <div className={`p-3 mb-4 rounded-md text-sm ${bankMessage.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
                    {bankMessage.text}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Nombre Completo" value={editingBankDetails.fullName || ''} onChange={(e) => setEditingBankDetails({ ...editingBankDetails, fullName: e.target.value })} />
                  <Input placeholder="RUT" value={editingBankDetails.rut || ''} onChange={(e) => setEditingBankDetails({ ...editingBankDetails, rut: e.target.value })} />
                  <Input placeholder="Banco" value={editingBankDetails.bankName || ''} onChange={(e) => setEditingBankDetails({ ...editingBankDetails, bankName: e.target.value })} />
                  <Input placeholder="Tipo de Cuenta" value={editingBankDetails.accountType || ''} onChange={(e) => setEditingBankDetails({ ...editingBankDetails, accountType: e.target.value })} />
                  <Input placeholder="Número de Cuenta" value={editingBankDetails.accountNumber || ''} onChange={(e) => setEditingBankDetails({ ...editingBankDetails, accountNumber: e.target.value })} />
                  <Input placeholder="Correo Electrónico" value={editingBankDetails.email || ''} onChange={(e) => setEditingBankDetails({ ...editingBankDetails, email: e.target.value })} />
                </div>
                <Button onClick={handleSaveBankDetails} className="mt-6 bg-teal-600 hover:bg-teal-700" disabled={isSavingBank}>
                  {isSavingBank ? 'Guardando...' : 'Guardar Datos Bancarios'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-stone-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-teal-600" /> Progreso de Tareas
                </span>
                <Badge className="bg-teal-50 text-teal-700 border-none">{completedTasks}/{tasks.length} completadas</Badge>
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

type DecoratedTask = Task & {
  displayDueDate?: string;
  giftedBy?: string | null;
  isDone: boolean;
  isOverdue: boolean;
  phaseBucket: 'past' | 'current' | 'future';
};

const Checklists = ({
  viewingUserId,
  tasks,
  gifts,
  currentWeekData,
  profileDueDate,
  isAdding,
  setIsAdding,
}: {
  viewingUserId: string | null;
  tasks: Task[];
  gifts: Gift[];
  currentWeekData: { weeks: number; days: number };
  profileDueDate?: string;
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
}) => {
  const { user } = useAuth();
  const isOwner = user?.uid === viewingUserId;
  const [filter, setFilter] = useState<string>('All');
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    category: 'Bebé',
    phase: 'Early',
    priority: 'Medium',
    isCompleted: false,
    dueDate: resolveTaskDueDate({ phase: 'Early' }, profileDueDate) || new Date().toISOString().split('T')[0],
  });

  const decoratedTasks = useMemo<DecoratedTask[]>(() => {
    const taskList = tasks.map((task) => {
      const matchingGift = gifts.find(
        (gift) => (gift.isReserved || (gift.quantityReserved || 0) > 0) && taskMatchesGift(task.title, gift.name)
      );
      const giftedBy = matchingGift?.reservedBy || null;
      const displayDueDate = resolveTaskDueDate(task, profileDueDate);
      const phaseBucket = getTaskPhaseBucket(task.phase, currentWeekData.weeks);
      const isDone = task.isCompleted || Boolean(giftedBy);
      const isOverdue = !isDone && (phaseBucket === 'past' || isPastDate(displayDueDate));

      return {
        ...task,
        giftedBy,
        displayDueDate,
        phaseBucket,
        isDone,
        isOverdue,
      };
    });

    return taskList.sort((left, right) => {
      if (left.isDone !== right.isDone) return left.isDone ? 1 : -1;
      if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
      if (left.phaseBucket !== right.phaseBucket) {
        const order = { current: 0, future: 1, past: 2 };
        return order[left.phaseBucket] - order[right.phaseBucket];
      }
      const priorityDiff = (PRIORITY_CONFIG[left.priority]?.order || 99) - (PRIORITY_CONFIG[right.priority]?.order || 99);
      if (priorityDiff !== 0) return priorityDiff;
      return (left.displayDueDate || '').localeCompare(right.displayDueDate || '') || left.title.localeCompare(right.title, 'es');
    });
  }, [tasks, gifts, profileDueDate, currentWeekData.weeks]);

  const visibleTasks = filter === 'All' ? decoratedTasks : decoratedTasks.filter((task) => task.category === filter);
  const completedTasks = decoratedTasks.filter((task) => task.isDone).length;
  const categoryProgress = TASK_CATEGORIES.map((category) => {
    const byCategory = decoratedTasks.filter((task) => task.category === category);
    const completed = byCategory.filter((task) => task.isDone).length;
    return { category, total: byCategory.length, completed };
  });

  const groups = [
    {
      key: 'overdue',
      title: 'Debía estar listo',
      description: 'Tareas de fases previas o con fecha vencida.',
      items: visibleTasks.filter((task) => !task.isDone && task.isOverdue),
    },
    {
      key: 'current',
      title: 'En foco ahora',
      description: 'Lo que conviene empujar en la etapa actual.',
      items: visibleTasks.filter((task) => !task.isDone && !task.isOverdue && task.phaseBucket === 'current'),
    },
    {
      key: 'future',
      title: 'Más adelante',
      description: 'Pendientes de fases posteriores.',
      items: visibleTasks.filter((task) => !task.isDone && !task.isOverdue && task.phaseBucket === 'future'),
    },
    {
      key: 'done',
      title: 'Completadas',
      description: 'Tareas cerradas manualmente o por un regalo.',
      items: visibleTasks.filter((task) => task.isDone),
    },
  ].filter((group) => group.items.length > 0);

  const toggleTask = async (task: Task) => {
    if (!viewingUserId) return;
    try {
      await updateDoc(doc(db, 'profiles', viewingUserId, 'tasks', task.id), {
        isCompleted: !task.isCompleted,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${viewingUserId}/tasks/${task.id}`);
    }
  };

  const handleAddTask = async () => {
    if (!viewingUserId) return;
    try {
      const payload = {
        ...newTask,
        dueDate: newTask.dueDate || resolveTaskDueDate({ phase: newTask.phase || 'Early' }, profileDueDate),
      };
      await addDoc(collection(db, 'profiles', viewingUserId, 'tasks'), payload);
      setIsAdding(false);
      setNewTask({
        title: '',
        category: 'Bebé',
        phase: 'Early',
        priority: 'Medium',
        isCompleted: false,
        dueDate: resolveTaskDueDate({ phase: 'Early' }, profileDueDate) || new Date().toISOString().split('T')[0],
      });
      await createNotification(viewingUserId, 'Nueva Tarea', `Se añadió una tarea: ${payload.title}`, 'task');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `profiles/${viewingUserId}/tasks`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Checklists</h2>
          <p className="text-sm text-stone-500">Ordenadas por prioridad, fase y fecha real.</p>
        </div>
        {isOwner && (
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger render={<Button className="hidden sm:flex bg-teal-600 hover:bg-teal-700" />}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Tarea
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Tarea</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Título de la tarea" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                <select className="rounded-md border p-2" value={newTask.category} onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}>
                  {TASK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border p-2"
                  value={newTask.phase}
                  onChange={(e) => {
                    const phase = e.target.value as Task['phase'];
                    setNewTask({
                      ...newTask,
                      phase,
                      dueDate: resolveTaskDueDate({ phase }, profileDueDate) || newTask.dueDate,
                    });
                  }}
                >
                  <option value="Early">Fase Temprana</option>
                  <option value="Mid">Fase Media</option>
                  <option value="Late">Fase Final</option>
                </select>
                <select className="rounded-md border p-2" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}>
                  <option value="High">Alta</option>
                  <option value="Medium">Media</option>
                  <option value="Low">Baja</option>
                </select>
                <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                <Button onClick={handleAddTask} className="bg-teal-600">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-stone-800">Progreso Global</div>
              <div className="text-xs text-stone-500">{completedTasks}/{decoratedTasks.length} tareas resueltas</div>
            </div>
            <Badge className="bg-teal-50 text-teal-700 border-none">
              {progressPercent(completedTasks, decoratedTasks.length)}%
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full bg-teal-600" style={{ width: `${progressPercent(completedTasks, decoratedTasks.length)}%` }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categoryProgress.map((entry) => (
              <div key={entry.category} className={`rounded-xl border p-3 ${CATEGORY_CONFIG[entry.category]?.bgColor || 'bg-stone-50'} border-white/70`}>
                <div className={`text-xs font-bold ${CATEGORY_CONFIG[entry.category]?.textColor || 'text-stone-600'}`}>
                  {CATEGORY_CONFIG[entry.category]?.emoji} {entry.category}
                </div>
                <div className="text-sm font-semibold text-stone-800 mt-1">
                  {entry.completed}/{entry.total}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', ...TASK_CATEGORIES].map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              filter === category ? 'bg-teal-600 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {category === 'All' ? 'Todas' : category}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.key} className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-stone-800">{group.title}</h3>
              <p className="text-sm text-stone-500">{group.description}</p>
            </div>
            <div className="grid gap-3">
              {group.items.map((task) => (
                <div key={task.id} className={`bg-white p-4 rounded-xl border shadow-sm ${task.isOverdue && !task.isDone ? 'border-rose-200' : 'border-stone-200'}`}>
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTask(task)}
                      className={`transition-transform active:scale-90 mt-0.5 ${task.giftedBy ? 'text-rose-500' : 'text-teal-600'}`}
                      disabled={Boolean(task.giftedBy)}
                    >
                      {task.isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-stone-200" />}
                    </button>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${task.isDone ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                          {task.title}
                        </p>
                        {task.isOverdue && !task.isDone && (
                          <Badge className="bg-rose-50 text-rose-600 border-none">Atrasada</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={`${CATEGORY_CONFIG[task.category]?.bgColor || 'bg-stone-50'} ${CATEGORY_CONFIG[task.category]?.textColor || 'text-stone-600'} border-none`}>
                          {CATEGORY_CONFIG[task.category]?.emoji} {task.category}
                        </Badge>
                        <Badge variant="secondary" className="bg-stone-100 text-stone-600 border-none">
                          {PHASE_LABELS[task.phase]}
                        </Badge>
                        <Badge variant="secondary" className={`${PRIORITY_CONFIG[task.priority]?.bgColor || 'bg-stone-50'} ${PRIORITY_CONFIG[task.priority]?.color || 'text-stone-600'}`}>
                          {PRIORITY_CONFIG[task.priority]?.label || task.priority}
                        </Badge>
                        <span className={`text-[11px] font-semibold ${task.isOverdue && !task.isDone ? 'text-rose-600' : 'text-stone-500'}`}>
                          Vence {formatIsoDate(task.displayDueDate)}
                        </span>
                      </div>
                      {task.giftedBy && (
                        <div className="text-xs font-semibold text-rose-600">
                          Regalado por: {task.giftedBy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const Gallery = ({
  viewingUserId,
  isAdding,
  setIsAdding,
}: {
  viewingUserId: string | null;
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
}) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ description: '', date: new Date().toISOString().split('T')[0] });
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!viewingUserId) return;
    const photosQuery = query(collection(db, 'profiles', viewingUserId, 'photos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
      setPhotos(snapshot.docs.map((photoDoc) => ({ id: photoDoc.id, ...photoDoc.data() } as GalleryPhoto)));
    });
    return unsubscribe;
  }, [viewingUserId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewingUserId) return;
    const file = event.target.files?.[0];
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
        userId: viewingUserId,
      });

      setNewPhoto({ description: '', date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!viewingUserId) return;
    try {
      await deleteDoc(doc(db, 'profiles', viewingUserId, 'photos', photoId));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Galería</h2>
          <p className="text-sm text-stone-500">Recuerdos de esta etapa</p>
        </div>
        {user?.uid === viewingUserId && (
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger render={<Button className="hidden sm:flex bg-teal-600 hover:bg-teal-700" />}>
              <Camera className="mr-2 h-4 w-4" /> Subir Foto
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Foto</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Descripción" value={newPhoto.description} onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })} />
                <Input type="date" value={newPhoto.date} onChange={(e) => setNewPhoto({ ...newPhoto, date: e.target.value })} />
                <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                <Button disabled className="bg-teal-600">
                  {isUploading ? 'Subiendo...' : 'Selecciona una imagen'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {photos.map((photo) => (
            <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative group rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-square">
              <img src={photo.url} alt={photo.description} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                <p className="text-white text-[10px] font-medium line-clamp-2">{photo.description || 'Sin descripción'}</p>
                <p className="text-white/70 text-[8px] mt-1 uppercase tracking-wider font-bold">{photo.date}</p>
              </div>
              {isAdmin && (
                <button onClick={() => void handleDeletePhoto(photo.id)} className="absolute top-2 right-2 p-1.5 bg-white/90 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
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

const Timeline = ({
  activePhaseIdx,
  babyNames,
  tasks,
  currentWeekData,
  dueDate,
}: {
  activePhaseIdx: number;
  babyNames: string[];
  tasks: Task[];
  currentWeekData: { weeks: number; days: number };
  dueDate?: string;
}) => {
  const development = getBabyDevelopment(currentWeekData.weeks);
  const daysRemaining = getDaysUntilDueDate(dueDate);

  const actionPhases = TASK_PHASES.map((phase) => {
    const phaseTasks = tasks
      .filter((task) => task.phase === phase)
      .map((task) => ({
        ...task,
        displayDueDate: resolveTaskDueDate(task, dueDate),
      }))
      .sort((left, right) => {
        const priorityDiff = (PRIORITY_CONFIG[left.priority]?.order || 99) - (PRIORITY_CONFIG[right.priority]?.order || 99);
        if (priorityDiff !== 0) return priorityDiff;
        return (left.displayDueDate || '').localeCompare(right.displayDueDate || '');
      });

    const completed = phaseTasks.filter((task) => task.isCompleted).length;
    const range = getTaskPhaseDateRange(phase, dueDate);
    const tips = PREGNANCY_TIPS.find((tipSet) => tipSet.phase === phase)?.tips || [];
    const bucket = getTaskPhaseBucket(phase, currentWeekData.weeks);

    return {
      phase,
      tasks: phaseTasks,
      completed,
      range,
      tips,
      bucket,
    };
  });

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">Cronograma Inteligente</h2>
        <p className="text-sm text-stone-500">Qué toca ahora, qué se viene y cómo va la preparación para {babyNames.join(' & ')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-stone-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Gestación</div>
            <div className="text-3xl font-black text-stone-800 mt-2">
              {currentWeekData.weeks}
              <span className="text-base font-semibold text-stone-500 ml-2">+{currentWeekData.days}d</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Para la FPP</div>
            <div className="text-3xl font-black text-stone-800 mt-2">{daysRemaining ?? 0}</div>
            <div className="text-sm text-stone-500">días restantes</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Desarrollo</div>
            <div className="text-sm font-semibold text-stone-800 mt-2">
              {development.size} · {development.weight}
            </div>
            <div className="text-sm text-stone-500 mt-1">{development.fact}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PREGNANCY_PHASES.map((phase, idx) => {
          const isActive = idx === activePhaseIdx;
          const isPast = idx < activePhaseIdx;
          const range = getPhaseDateRange(dueDate, phase.weekStart, phase.weekEnd);

          return (
            <Card key={phase.title} className={`border ${isActive ? 'border-teal-300 shadow-md' : 'border-stone-200'} ${isPast ? 'bg-stone-50' : 'bg-white'}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl">{phase.emoji}</div>
                  {isPast && <CheckCircle2 className="h-4 w-4 text-teal-600" />}
                </div>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-teal-600' : 'text-stone-400'}`}>{phase.weeksLabel}</div>
                  <div className="text-lg font-bold text-stone-800">{phase.title}</div>
                  {range && <div className="text-xs text-stone-500 mt-1">{formatDateRange(range.start, range.end)}</div>}
                </div>
                <ul className="space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className={`text-sm ${isPast ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-5">
        {actionPhases.map((phaseData) => (
          <Card key={phaseData.phase} className={`border shadow-sm ${
            phaseData.bucket === 'current'
              ? 'border-teal-300'
              : phaseData.bucket === 'past'
                ? 'border-rose-200 bg-rose-50/30'
                : 'border-stone-200'
          }`}>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    {PHASE_LABELS[phaseData.phase]}
                  </div>
                  <h3 className="text-xl font-bold text-stone-800 mt-1">
                    {phaseData.phase === 'Early' ? 'Base y primeras decisiones' : phaseData.phase === 'Mid' ? 'Preparación central' : 'Cierre y recta final'}
                  </h3>
                  {phaseData.range && (
                    <div className="text-sm text-stone-500 mt-1">
                      {formatDateRange(phaseData.range.start, phaseData.range.end)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-teal-50 text-teal-700 border-none">
                    {phaseData.completed}/{phaseData.tasks.length} completadas
                  </Badge>
                  {phaseData.bucket === 'current' && (
                    <Badge className="bg-teal-600 text-white border-none">Ahora</Badge>
                  )}
                  {phaseData.bucket === 'past' && (
                    <Badge className="bg-rose-50 text-rose-600 border-none">Debía estar listo</Badge>
                  )}
                </div>
              </div>

              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-teal-600" style={{ width: `${progressPercent(phaseData.completed, phaseData.tasks.length)}%` }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  {phaseData.tasks.slice(0, 6).map((task) => (
                    <div key={task.id} className="rounded-xl border border-stone-200 bg-white p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className={`text-sm font-semibold ${task.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                          {task.title}
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                          {task.priority} · Vence {formatIsoDate(task.displayDueDate)}
                        </div>
                      </div>
                      {task.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-stone-300" />
                      )}
                    </div>
                  ))}
                  {phaseData.tasks.length > 6 && (
                    <div className="text-sm text-stone-500">
                      +{phaseData.tasks.length - 6} tareas adicionales en esta fase.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                  <div className="text-sm font-bold text-stone-800 mb-3">Tips de esta etapa</div>
                  <ul className="space-y-2">
                    {phaseData.tips.map((tip) => (
                      <li key={tip} className="text-sm text-stone-600">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const { user, profile, isAuthReady, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [guestProfile, setGuestProfile] = useState<Partial<Profile> | null>(null);
  const [isGuestView, setIsGuestView] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [giftMethod, setGiftMethod] = useState<'buy' | 'transfer' | null>(null);
  const [reserveName, setReserveName] = useState('');
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; method: 'buy' | 'transfer' | null; total: number }>({
    isOpen: false,
    method: null,
    total: 0,
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [isAddingWishlist, setIsAddingWishlist] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUserId = params.get('u');

    if (sharedUserId) {
      setViewingUserId(sharedUserId);
      setIsGuestView(true);
      setActiveTab('wishlist');

      const unsubscribe = onSnapshot(doc(db, 'profiles', sharedUserId), (docSnap) => {
        setGuestProfile(docSnap.exists() ? (docSnap.data() as Partial<Profile>) : null);
      });

      return unsubscribe;
    }

    if (user) {
      setViewingUserId(user.uid);
      setIsGuestView(false);
      setGuestProfile(null);
      setActiveTab((currentTab) => (currentTab === 'wishlist' ? currentTab : 'dashboard'));
      return;
    }

    setViewingUserId(null);
    setIsGuestView(false);
    setGuestProfile(null);
  }, [user]);

  useEffect(() => {
    if (isGuestView && activeTab !== 'wishlist') {
      setActiveTab('wishlist');
    }
  }, [isGuestView, activeTab]);

  const effectiveProfile = guestProfile || profile;
  const isOwner = Boolean(user?.uid && viewingUserId && user.uid === viewingUserId);

  const { gifts, tasks, bankDetails } = useProfileCollections({
    viewingUserId,
    isOwner,
    hasSeededWishlist: isOwner ? profile?.hasSeededWishlist : false,
    hasSeededTasks: isOwner ? profile?.hasSeededTasks : false,
    hasCleanedLegacyWishlistImages: isOwner ? profile?.hasCleanedLegacyWishlistImages : false,
  });

  const currentWeekData = getCurrentPregnancyWeek(
    effectiveProfile?.dueDate,
    effectiveProfile?.gestationWeekAtStart,
    effectiveProfile?.gestationDaysAtStart,
    effectiveProfile?.pregnancyStartDate
  );

  const activePhaseIndex = getActivePhaseIndex(currentWeekData.weeks);

  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !user) return;

    const today = new Date().toISOString().split('T')[0];

    tasks
      .filter((task) => !task.isCompleted)
      .forEach((task) => {
        const dueDate = resolveTaskDueDate(task, profile?.dueDate);
        if (dueDate === today) {
          void createNotification(
            user.uid,
            'Recordatorio de Tarea',
            `Hoy vence la tarea: ${task.title}`,
            'task',
            task.id,
            `task-reminder-${task.id}-${today}`
          );
        }
      });
  }, [isAdmin, user, tasks, profile?.dueDate]);

  const handleRemoveFromCart = (giftId: string) => {
    setCart((prev) => prev.filter((item) => item.gift.id !== giftId));
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0 || !reserveName.trim() || !giftMethod || !viewingUserId) return;

    setCheckoutError('');
    const finalName = giftMethod === 'transfer' ? `${reserveName} (Transferencia)` : reserveName;

    try {
      await runTransaction(db, async (transaction) => {
        const giftRefs = cart.map((item) => doc(db, 'profiles', viewingUserId, 'wishlist', item.gift.id));
        const giftDocs = await Promise.all(giftRefs.map((giftRef) => transaction.get(giftRef)));

        const updates: { ref: ReturnType<typeof doc>; data: Partial<Gift> }[] = [];

        for (let index = 0; index < cart.length; index += 1) {
          const item = cart[index];
          const giftDoc = giftDocs[index];

          if (!giftDoc.exists()) {
            throw new Error(`El regalo "${item.gift.name}" ya no existe.`);
          }

          const currentGift = giftDoc.data() as Gift;
          const available = currentGift.isRepeatable
            ? (currentGift.quantityNeeded || 1) - (currentGift.quantityReserved || 0)
            : currentGift.isReserved
              ? 0
              : 1;

          if (available < item.quantity) {
            throw new Error(`No hay suficiente disponibilidad para "${item.gift.name}".`);
          }

          updates.push({
            ref: giftRefs[index],
            data: currentGift.isRepeatable
              ? { quantityReserved: (currentGift.quantityReserved || 0) + item.quantity }
              : { isReserved: true, reservedBy: finalName },
          });
        }

        updates.forEach((update) => transaction.update(update.ref, update.data));
      });

      const allTasksSnapshot = isOwner
        ? { docs: tasks.map((task) => ({ id: task.id, data: () => task, ref: doc(db, 'profiles', viewingUserId, 'tasks', task.id) })) }
        : await getDocs(collection(db, 'profiles', viewingUserId, 'tasks'));

      for (const item of cart) {
        await createNotification(
          viewingUserId,
          '¡Nuevo Regalo!',
          `${finalName} ha regalado ${item.quantity > 1 ? `${item.quantity} unidad(es) de ` : ''}${item.gift.name}`,
          'gift',
          item.gift.id
        );

        const matchingTaskDocs = allTasksSnapshot.docs.filter((taskDoc: any) =>
          taskMatchesGift((taskDoc.data() as Task).title, item.gift.name)
        );

        await Promise.all(
          matchingTaskDocs.map((taskDoc: any) =>
            updateDoc(taskDoc.ref, {
              isCompleted: true,
              reservedBy: finalName,
            })
          )
        );
      }

      const total = cart.reduce((accumulator, item) => accumulator + ((item.gift.price || 0) * item.quantity), 0);
      const method = giftMethod;

      setCart([]);
      setIsCartOpen(false);
      setGiftMethod(null);
      setReserveName('');
      setSuccessModal({ isOpen: true, method, total });
    } catch (error: any) {
      console.error(error);
      setCheckoutError(error.message || 'Hubo un error al procesar tu regalo.');
    }
  };

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
          <p className="text-stone-500 font-display">Cargando...</p>
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
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} guestProfile={guestProfile} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative pb-20 sm:pb-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!guestProfile && activeTab === 'dashboard' && (
                <Dashboard
                  viewingUserId={viewingUserId}
                  currentWeekData={currentWeekData}
                  activePhaseIndex={activePhaseIndex}
                  gifts={gifts}
                  tasks={tasks}
                  bankDetails={bankDetails}
                />
              )}

              {activeTab === 'wishlist' && (
                <Wishlist
                  cart={cart}
                  setCart={setCart}
                  setIsCartOpen={setIsCartOpen}
                  gifts={gifts}
                  viewingUserId={viewingUserId}
                  currentWeekData={currentWeekData}
                  isAdding={isAddingWishlist}
                  setIsAdding={setIsAddingWishlist}
                />
              )}

              {!guestProfile && activeTab === 'checklists' && (
                <Checklists
                  viewingUserId={viewingUserId}
                  tasks={tasks}
                  gifts={gifts}
                  currentWeekData={currentWeekData}
                  profileDueDate={profile?.dueDate}
                  isAdding={isAddingTask}
                  setIsAdding={setIsAddingTask}
                />
              )}

              {!guestProfile && activeTab === 'gallery' && (
                <Gallery viewingUserId={viewingUserId} isAdding={isAddingPhoto} setIsAdding={setIsAddingPhoto} />
              )}

              {!guestProfile && activeTab === 'timeline' && (
                <Timeline
                  activePhaseIdx={activePhaseIndex}
                  babyNames={effectiveProfile?.babyNames || [effectiveProfile?.babyName || 'Bebé']}
                  tasks={tasks}
                  currentWeekData={currentWeekData}
                  dueDate={profile?.dueDate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {!guestProfile && (
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} onAddAction={handleMobileAdd} />
      )}

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
              <span className="font-bold mx-1">{cart.reduce((accumulator, item) => accumulator + item.quantity, 0)}</span>
              <span>regalo(s) seleccionado(s)</span>
            </div>
            <Button onClick={() => setIsCartOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              Confirmar Regalos
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isCartOpen} onOpenChange={(open) => {
        setIsCartOpen(open);
        if (!open) setGiftMethod(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar tus Regalos</DialogTitle>
            <CardDescription>Revisa los regalos que has seleccionado</CardDescription>
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

            {cart.some((item) => item.gift.price) && (
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg text-teal-800 font-bold">
                <span>Total Estimado:</span>
                <span>
                  {cart.reduce((accumulator, item) => accumulator + ((item.gift.price || 0) * item.quantity), 0).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                  })}
                </span>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h4 className="font-medium text-sm">¿Cómo prefieres hacer estos regalos?</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={giftMethod === 'buy' ? 'default' : 'outline'} className={giftMethod === 'buy' ? 'bg-teal-600 hover:bg-teal-700' : ''} onClick={() => setGiftMethod('buy')}>
                  Comprar y Entregar
                </Button>
                <Button variant={giftMethod === 'transfer' ? 'default' : 'outline'} className={giftMethod === 'transfer' ? 'bg-teal-600 hover:bg-teal-700' : ''} onClick={() => setGiftMethod('transfer')}>
                  Transferir Valor
                </Button>
              </div>

              {giftMethod === 'buy' && (
                <div className="p-3 bg-stone-50 rounded-md text-sm text-stone-600">
                  Puedes comprar los regalos donde prefieras y entregarlos luego.
                </div>
              )}

              {giftMethod === 'transfer' && (
                <div className="p-3 bg-stone-50 rounded-md text-sm text-stone-600">
                  Al confirmar, te mostraremos los datos bancarios para la transferencia.
                </div>
              )}

              {giftMethod && (
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <Input placeholder="Tu Nombre" value={reserveName} onChange={(e) => setReserveName(e.target.value)} />
                  {checkoutError && (
                    <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-md">
                      {checkoutError}
                    </div>
                  )}
                  <Button onClick={handleCheckoutSubmit} className="w-full bg-teal-600 hover:bg-teal-700" disabled={!reserveName.trim()}>
                    Confirmar Regalos
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={successModal.isOpen} onOpenChange={(open) => !open && setSuccessModal({ ...successModal, isOpen: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-600">
              <CheckCircle2 className="h-6 w-6" />
              ¡Regalos Confirmados!
            </DialogTitle>
            <CardDescription>Muchas gracias por ser parte de este momento.</CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {successModal.method === 'transfer' ? (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                  <p className="text-sm text-teal-800 mb-3">
                    Por favor, realiza la transferencia por <strong>{successModal.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</strong>.
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
                  Entendido
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-stone-50 rounded-lg">
                  <GiftIcon className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                  <p className="text-sm text-stone-600">
                    Hemos registrado tu intención de compra. Gracias por ayudar con la llegada del bebé.
                  </p>
                </div>
                <Button onClick={() => setSuccessModal({ ...successModal, isOpen: false })} className="w-full bg-teal-600 hover:bg-teal-700">
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
