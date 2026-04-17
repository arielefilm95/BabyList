import React, { useMemo, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { MASTER_GIFTS, MASTER_TASKS, TASK_CATEGORIES, WISHLIST_CATALOG_VERSION } from '../constants';
import { calculateDueDateFromCurrentGestation, formatIsoDate } from '../lib/pregnancy';
import type { BankDetails } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby, Calendar, Heart, Users, ArrowRight, ArrowLeft, Check, Gift, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ParentGender = 'male' | 'female' | 'other';

const EMPTY_BANK_DETAILS: BankDetails = {
  fullName: '',
  rut: '',
  bankName: '',
  accountType: '',
  accountNumber: '',
  email: '',
};

const PARENT_GENDER_OPTIONS: Array<{ value: ParentGender; label: string }> = [
  { value: 'female', label: 'Mujer' },
  { value: 'male', label: 'Hombre' },
  { value: 'other', label: 'Otro' },
];

const TODAY_ISO = new Date().toISOString().split('T')[0];

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const templateNameMatches = (left: string, right: string) => {
  const normalizedLeft = normalizeComparableText(left);
  const normalizedRight = normalizeComparableText(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
};

export const Onboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    parent1Name: '',
    parent1Gender: 'female' as ParentGender,
    parent2Name: '',
    parent2Gender: 'male' as ParentGender,
    babyNames: [''],
    babyCount: 1,
    dueDate: '',
    gestationWeekAtStart: '',
    gestationDaysAtStart: '',
    setupTransfers: false,
    bankDetails: EMPTY_BANK_DETAILS,
    completedTasks: [] as string[],
  });

  const gestationWeek = Number.parseInt(formData.gestationWeekAtStart, 10);
  const gestationDays = Number.parseInt(formData.gestationDaysAtStart, 10);
  const safeGestationDays = Number.isNaN(gestationDays) ? 0 : gestationDays;
  const usingGestationFallback = !formData.dueDate && Boolean(formData.gestationWeekAtStart || formData.gestationDaysAtStart);
  const hasValidGestationInput =
    gestationWeek > 0 &&
    !Number.isNaN(gestationWeek) &&
    safeGestationDays >= 0 &&
    safeGestationDays <= 6;

  const derivedDueDate = useMemo(() => {
    if (!usingGestationFallback || !hasValidGestationInput) return '';

    return calculateDueDateFromCurrentGestation(gestationWeek, safeGestationDays, TODAY_ISO) || '';
  }, [gestationWeek, hasValidGestationInput, safeGestationDays, usingGestationFallback]);

  const effectiveDueDate = formData.dueDate || derivedDueDate;
  const sanitizedBabyNames = formData.babyNames.slice(0, formData.babyCount).map((name) => name.trim());
  const hasValidDateSetup = Boolean(formData.dueDate) || Boolean(derivedDueDate);
  const bankDetailsAreComplete = Object.values(formData.bankDetails).every((value) => value.trim());
  const canContinueFromStep =
    (step === 1 && true) ||
    (step === 2 && Boolean(formData.parent1Name.trim())) ||
    (step === 3 && sanitizedBabyNames.every(Boolean)) ||
    (step === 4 && hasValidDateSetup) ||
    (step === 5 && (!formData.setupTransfers || bankDetailsAreComplete)) ||
    step === 6;

  const handleNext = () => setStep((current) => current + 1);
  const handleBack = () => setStep((current) => current - 1);

  const handleBabyCountChange = (count: number) => {
    setFormData((current) => {
      const nextNames = [...current.babyNames];
      if (count > nextNames.length) {
        for (let index = nextNames.length; index < count; index += 1) {
          nextNames.push('');
        }
      } else {
        nextNames.splice(count);
      }

      return {
        ...current,
        babyCount: count,
        babyNames: nextNames,
      };
    });
  };

  const handleBabyNameChange = (index: number, name: string) => {
    setFormData((current) => {
      const nextNames = [...current.babyNames];
      nextNames[index] = name;

      return {
        ...current,
        babyNames: nextNames,
      };
    });
  };

  const handleBankDetailChange = (field: keyof BankDetails, value: string) => {
    setFormData((current) => ({
      ...current,
      bankDetails: {
        ...current.bankDetails,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!sanitizedBabyNames.every(Boolean)) {
      alert('Completa los nombres del bebe antes de continuar.');
      return;
    }

    if (!effectiveDueDate) {
      alert('Ingresa la fecha probable de parto o una semana actual valida.');
      return;
    }

    if (formData.setupTransfers && !bankDetailsAreComplete) {
      alert('Completa todos los datos bancarios o deja esta configuracion para despues.');
      return;
    }

    setLoading(true);

    try {
      const completedTaskTemplates = MASTER_TASKS.filter((task) => formData.completedTasks.includes(task.title));
      const profilePayload: Record<string, unknown> = {
        parent1Name: formData.parent1Name.trim(),
        parent1Gender: formData.parent1Gender,
        parent2Name: formData.parent2Name.trim(),
        parent2Gender: formData.parent2Gender,
        babyNames: sanitizedBabyNames,
        babyName: sanitizedBabyNames[0] || '',
        babyCount: formData.babyCount,
        dueDate: effectiveDueDate,
        role: 'admin',
        createdAt: serverTimestamp(),
        hasSeededWishlist: true,
        wishlistCatalogVersion: WISHLIST_CATALOG_VERSION,
        hasSeededTasks: true,
        hasCleanedLegacyWishlistImages: true,
      };

      if (!formData.dueDate && hasValidGestationInput) {
        profilePayload.pregnancyStartDate = TODAY_ISO;
        profilePayload.gestationWeekAtStart = gestationWeek;
        profilePayload.gestationDaysAtStart = safeGestationDays;
      }

      await setDoc(doc(db, 'profiles', user.uid), profilePayload);

      if (formData.setupTransfers) {
        await setDoc(doc(db, 'profiles', user.uid, 'settings', 'bankDetails'), {
          ...formData.bankDetails,
          fullName: formData.bankDetails.fullName.trim(),
          rut: formData.bankDetails.rut.trim(),
          bankName: formData.bankDetails.bankName.trim(),
          accountType: formData.bankDetails.accountType.trim(),
          accountNumber: formData.bankDetails.accountNumber.trim(),
          email: formData.bankDetails.email.trim(),
        });
      }

      for (const gift of MASTER_GIFTS) {
        const isCompleted = completedTaskTemplates.some((task) => {
          if (gift.catalogKey && task.catalogKey) {
            return gift.catalogKey === task.catalogKey;
          }

          return templateNameMatches(task.title, gift.name);
        });

        await addDoc(collection(db, 'profiles', user.uid, 'wishlist'), {
          ...gift,
          isReserved: isCompleted,
          quantityReserved: isCompleted ? gift.quantityNeeded : 0,
          reservedBy: isCompleted ? 'Nosotros (Ya lo tenemos)' : '',
        });
      }

      for (const task of MASTER_TASKS) {
        await addDoc(collection(db, 'profiles', user.uid, 'tasks'), {
          ...task,
          isCompleted: formData.completedTasks.includes(task.title),
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('No pudimos crear tu perfil. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Bienvenidos',
      description: 'Configuremos la cuenta para que coincida con la app real.',
      icon: <Heart className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-stone-600 text-center">
            Aqui quedaran listos tu wishlist, checklists, timeline, asistente y los aportes por transferencia si los quieres activar desde ahora.
          </p>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            La seccion Donaciones para articulos tambien queda disponible despues, sin pasos extra.
          </div>
        </div>
      ),
    },
    {
      title: 'Quienes acompanian',
      description: 'Nombres y genero de los adultos del perfil.',
      icon: <Users className="w-12 h-12 text-teal-600" />,
      content: (
        <div className="space-y-6 py-4">
          <div className="space-y-4 rounded-xl border border-stone-100 bg-stone-50 p-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">Adulto 1</label>
              <Input
                placeholder="Nombre"
                value={formData.parent1Name}
                onChange={(event) => setFormData((current) => ({ ...current, parent1Name: event.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              {PARENT_GENDER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={formData.parent1Gender === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-[10px] uppercase font-bold"
                  onClick={() => setFormData((current) => ({ ...current, parent1Gender: option.value }))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-stone-100 bg-stone-50 p-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">Adulto 2 (opcional)</label>
              <Input
                placeholder="Nombre"
                value={formData.parent2Name}
                onChange={(event) => setFormData((current) => ({ ...current, parent2Name: event.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              {PARENT_GENDER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={formData.parent2Gender === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-[10px] uppercase font-bold"
                  onClick={() => setFormData((current) => ({ ...current, parent2Gender: option.value }))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Sobre el bebe',
      description: 'Cantidad de bebes y nombres.',
      icon: <Baby className="w-12 h-12 text-amber-500" />,
      content: (
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cuantos bebes vienen en camino?</label>
            <div className="flex gap-4">
              {[1, 2, 3].map((count) => (
                <Button
                  key={count}
                  type="button"
                  variant={formData.babyCount === count ? 'default' : 'outline'}
                  onClick={() => handleBabyCountChange(count)}
                  className="flex-1"
                >
                  {count} {count === 1 ? 'Bebe' : 'Bebes'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {formData.babyNames.map((name, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium">
                  Nombre del bebe {formData.babyCount > 1 ? index + 1 : ''}
                </label>
                <Input
                  placeholder={`Ej: ${index === 0 ? 'Pedrito' : index === 1 ? 'Juanita' : 'Sofia'}`}
                  value={name}
                  onChange={(event) => handleBabyNameChange(index, event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Fechas importantes',
      description: 'Dejemos lista una fecha canonia para timeline y tareas.',
      icon: <Calendar className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha probable de parto</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
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
              <label className="text-sm font-medium">Semana actual</label>
              <Input
                type="number"
                min="1"
                max="42"
                placeholder="Ej: 24"
                value={formData.gestationWeekAtStart}
                onChange={(event) => setFormData((current) => ({ ...current, gestationWeekAtStart: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias</label>
              <Input
                type="number"
                min="0"
                max="6"
                placeholder="0-6"
                value={formData.gestationDaysAtStart}
                onChange={(event) => setFormData((current) => ({ ...current, gestationDaysAtStart: event.target.value }))}
              />
            </div>
          </div>

          {!formData.dueDate && usingGestationFallback && !hasValidGestationInput && (
            <p className="text-sm text-rose-600">
              Ingresa una semana valida entre 1 y 42 y dias entre 0 y 6, o usa directamente la fecha probable de parto.
            </p>
          )}

          {!formData.dueDate && Boolean(derivedDueDate) && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
              Con {gestationWeek}+{safeGestationDays}, estimamos la FPP en <strong>{formatIsoDate(derivedDueDate)}</strong>.
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Aportes y donaciones',
      description: 'Opcional: deja listos los datos para recibir transferencias.',
      icon: <Gift className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-sm text-stone-600">
            Si activas esta opcion, los invitados veran tus datos cuando elijan "Transferir Valor" en la wishlist. La seccion Donaciones para articulos la podras usar mas adelante sin configurar nada aqui.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={!formData.setupTransfers ? 'default' : 'outline'}
              onClick={() => setFormData((current) => ({ ...current, setupTransfers: false }))}
            >
              Ahora no
            </Button>
            <Button
              type="button"
              variant={formData.setupTransfers ? 'default' : 'outline'}
              onClick={() => setFormData((current) => ({ ...current, setupTransfers: true }))}
            >
              Configurar ahora
            </Button>
          </div>

          {formData.setupTransfers ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <Input
                placeholder="Nombre completo"
                value={formData.bankDetails.fullName}
                onChange={(event) => handleBankDetailChange('fullName', event.target.value)}
              />
              <Input
                placeholder="RUT"
                value={formData.bankDetails.rut}
                onChange={(event) => handleBankDetailChange('rut', event.target.value)}
              />
              <Input
                placeholder="Banco"
                value={formData.bankDetails.bankName}
                onChange={(event) => handleBankDetailChange('bankName', event.target.value)}
              />
              <Input
                placeholder="Tipo de cuenta"
                value={formData.bankDetails.accountType}
                onChange={(event) => handleBankDetailChange('accountType', event.target.value)}
              />
              <Input
                placeholder="Numero de cuenta"
                value={formData.bankDetails.accountNumber}
                onChange={(event) => handleBankDetailChange('accountNumber', event.target.value)}
              />
              <Input
                placeholder="Correo electronico"
                value={formData.bankDetails.email}
                onChange={(event) => handleBankDetailChange('email', event.target.value)}
              />
              {!bankDetailsAreComplete && (
                <p className="text-xs text-stone-500">
                  Si decides configurarlo ahora, completa todos los campos. Si no, puedes hacerlo despues desde el dashboard.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              Perfecto. Puedes seguir ahora y dejar tus datos de transferencia para mas adelante desde el dashboard.
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Checklist inicial',
      description: 'Marca lo que ya tienes listo para partir mas ordenados.',
      icon: <ListChecks className="w-12 h-12 text-teal-600" />,
      content: (
        <div className="space-y-4 py-4">
          <p className="mb-2 text-sm text-stone-600">
            Marca los elementos o tareas que ya resolviste. Asi tu BabyPlan arranca alineado desde el primer dia.
          </p>
          <div className="max-h-72 space-y-4 overflow-y-auto pr-2">
            {TASK_CATEGORIES.map((category) => (
              <div key={category}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      category === 'Bebé'
                        ? 'bg-rose-400'
                        : category === 'Mamá'
                          ? 'bg-teal-500'
                          : category === 'Casa'
                            ? 'bg-amber-500'
                            : category === 'Alimentación'
                              ? 'bg-orange-500'
                              : category === 'Hospital'
                                ? 'bg-blue-500'
                                : category === 'Trámites'
                                  ? 'bg-purple-500'
                                  : 'bg-stone-400'
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-wide text-stone-600">{category}</span>
                  <span className="text-[10px] text-stone-400">
                    (
                    {MASTER_TASKS.filter((task) => task.category === category && formData.completedTasks.includes(task.title)).length}
                    /
                    {MASTER_TASKS.filter((task) => task.category === category).length}
                    )
                  </span>
                </div>
                <div className="space-y-1">
                  {MASTER_TASKS.filter((task) => task.category === category).map((task) => (
                    <label
                      key={task.title}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-100 bg-white p-2 transition-colors hover:border-teal-200"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                        checked={formData.completedTasks.includes(task.title)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setFormData((current) => ({
                              ...current,
                              completedTasks: [...current.completedTasks, task.title],
                            }));
                            return;
                          }

                          setFormData((current) => ({
                            ...current,
                            completedTasks: current.completedTasks.filter((title) => title !== task.title),
                          }));
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
      ),
    },
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">{currentStep.icon}</div>
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

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={step === 1 || loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atras
            </Button>

            {step < steps.length ? (
              <Button onClick={handleNext} disabled={loading || !canContinueFromStep}>
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || !canContinueFromStep} className="bg-teal-600 hover:bg-teal-700">
                {loading ? 'Guardando...' : 'Comenzar'}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${index + 1 === step ? 'w-4 bg-teal-600' : 'w-1 bg-stone-200'}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
