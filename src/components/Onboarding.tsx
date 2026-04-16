import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { MASTER_GIFTS, MASTER_TASKS } from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby, Calendar, Heart, Users, ArrowRight, ArrowLeft, Check, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Onboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    parent1Name: '',
    parent1Gender: 'female' as 'male' | 'female' | 'other',
    parent2Name: '',
    parent2Gender: 'male' as 'male' | 'female' | 'other',
    babyNames: [''],
    babyCount: 1,
    dueDate: '',
    pregnancyStartDate: new Date().toISOString().split('T')[0],
    gestationWeekAtStart: 0,
    gestationDaysAtStart: 0,
    completedTasks: [] as string[],
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleBabyCountChange = (count: number) => {
    const newNames = [...formData.babyNames];
    if (count > newNames.length) {
      for (let i = newNames.length; i < count; i++) {
        newNames.push('');
      }
    } else {
      newNames.splice(count);
    }
    setFormData({ ...formData, babyCount: count, babyNames: newNames });
  };

  const handleBabyNameChange = (index: number, name: string) => {
    const newNames = [...formData.babyNames];
    newNames[index] = name;
    setFormData({ ...formData, babyNames: newNames });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        ...formData,
        role: 'admin', // First user is admin of their own profile
        createdAt: serverTimestamp(),
        hasSeededWishlist: true
      });

      // Seed the wishlist automatically
      for (const gift of MASTER_GIFTS) {
        const isCompleted = formData.completedTasks.includes(gift.name);
        await addDoc(collection(db, 'profiles', user.uid, 'wishlist'), {
          ...gift,
          isReserved: isCompleted,
          quantityReserved: isCompleted ? gift.quantityNeeded : 0,
          reservedBy: isCompleted ? 'Nosotros (Ya lo tenemos)' : ''
        });
      }

      // Seed the tasks automatically
      for (const task of MASTER_TASKS) {
        await addDoc(collection(db, 'profiles', user.uid, 'tasks'), {
          ...task,
          isCompleted: formData.completedTasks.includes(task.title)
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "¡Bienvenidos!",
      description: "Comencemos a preparar la llegada de tu bebé.",
      icon: <Heart className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-stone-600 text-center">
            Esta aplicación les ayudará a organizar su wishlist, tareas y recuerdos de esta etapa tan especial.
          </p>
        </div>
      )
    },
    {
      title: "¿Quiénes son los papás?",
      description: "Nombres y géneros de los protagonistas.",
      icon: <Users className="w-12 h-12 text-teal-600" />,
      content: (
        <div className="space-y-6 py-4">
          <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">Papá/Mamá 1</label>
              <Input 
                placeholder="Nombre" 
                value={formData.parent1Name}
                onChange={e => setFormData({...formData, parent1Name: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              {['female', 'male', 'other'].map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={formData.parent1Gender === g ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-[10px] uppercase font-bold"
                  onClick={() => setFormData({...formData, parent1Gender: g as any})}
                >
                  {g === 'female' ? 'Mujer' : g === 'male' ? 'Hombre' : 'Otro'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">Papá/Mamá 2 (Opcional)</label>
              <Input 
                placeholder="Nombre" 
                value={formData.parent2Name}
                onChange={e => setFormData({...formData, parent2Name: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              {['female', 'male', 'other'].map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={formData.parent2Gender === g ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-[10px] uppercase font-bold"
                  onClick={() => setFormData({...formData, parent2Gender: g as any})}
                >
                  {g === 'female' ? 'Mujer' : g === 'male' ? 'Hombre' : 'Otro'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Sobre el bebé",
      description: "¿Cómo se llamarán los pequeños?",
      icon: <Baby className="w-12 h-12 text-amber-500" />,
      content: (
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">¿Cuántos bebés vienen en camino?</label>
            <div className="flex gap-4">
              {[1, 2, 3].map(n => (
                <Button
                  key={n}
                  type="button"
                  variant={formData.babyCount === n ? "default" : "outline"}
                  onClick={() => handleBabyCountChange(n)}
                  className="flex-1"
                >
                  {n} {n === 1 ? 'Bebé' : 'Bebés'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {formData.babyNames.map((name, idx) => (
              <div key={idx} className="space-y-2">
                <label className="text-sm font-medium">
                  Nombre del Bebé {formData.babyCount > 1 ? idx + 1 : ''}
                </label>
                <Input 
                  placeholder={`Ej: ${idx === 0 ? 'Pedrito' : idx === 1 ? 'Juanito' : 'Sofía'}`} 
                  value={name}
                  onChange={e => handleBabyNameChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Fechas importantes",
      description: "Para calcular tu línea de tiempo.",
      icon: <Calendar className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha estimada de parto (EDD)</label>
            <Input 
              type="date" 
              value={formData.dueDate}
              onChange={e => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-500">O si prefieres</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Semana</label>
              <Input 
                type="number" 
                placeholder="Ej: 24"
                value={formData.gestationWeekAtStart || ''}
                onChange={e => setFormData({...formData, gestationWeekAtStart: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Días</label>
              <Input 
                type="number" 
                placeholder="0-6"
                min="0"
                max="6"
                value={formData.gestationDaysAtStart || ''}
                onChange={e => setFormData({...formData, gestationDaysAtStart: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Checklist Inicial",
      description: "¿Qué cosas ya tienes listas?",
      icon: <ListChecks className="w-12 h-12 text-teal-600" />,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-sm text-stone-600 mb-2">
            Marca los elementos que ya tienes o las tareas que ya completaste. Así tu BabyPlan estará actualizado desde el primer día.
          </p>
          <div className="max-h-72 overflow-y-auto space-y-4 pr-2">
            {['Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital', 'Trámites', 'Misiones'].map(category => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${
                    category === 'Bebé' ? 'bg-rose-400' :
                    category === 'Mamá' ? 'bg-teal-500' :
                    category === 'Casa' ? 'bg-amber-500' :
                    category === 'Alimentación' ? 'bg-orange-500' :
                    category === 'Hospital' ? 'bg-blue-500' :
                    category === 'Trámites' ? 'bg-purple-500' :
                    'bg-stone-400'
                  }`} />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wide">{category}</span>
                  <span className="text-[10px] text-stone-400">
                    ({MASTER_TASKS.filter(t => t.category === category && formData.completedTasks.includes(t.title)).length}/{MASTER_TASKS.filter(t => t.category === category).length})
                  </span>
                </div>
                <div className="space-y-1">
                  {MASTER_TASKS.filter(t => t.category === category).map((task, idx) => (
                    <label key={idx} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-stone-100 cursor-pointer hover:border-teal-200 transition-colors">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-3.5 h-3.5 text-teal-600 border-stone-300 rounded focus:ring-teal-500"
                        checked={formData.completedTasks.includes(task.title)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, completedTasks: [...formData.completedTasks, task.title] });
                          } else {
                            setFormData({ ...formData, completedTasks: formData.completedTasks.filter(t => t !== task.title) });
                          }
                        }}
                      />
                      <span className="text-xs text-stone-700">{task.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {currentStep.icon}
          </div>
          <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep.content}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Atrás
            </Button>
            
            {step < steps.length ? (
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 2 && !formData.parent1Name) ||
                  (step === 3 && formData.babyNames.some(name => !name.trim())) ||
                  (step === 4 && !formData.dueDate)
                }
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !formData.dueDate}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading ? "Guardando..." : "Comenzar Aventura"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          <div className="flex justify-center gap-1 mt-6">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all ${i + 1 === step ? 'w-4 bg-teal-600' : 'w-1 bg-stone-200'}`} 
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
