export const WISHLIST_CATEGORIES = ['Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital'] as const;
export const TASK_CATEGORIES = [...WISHLIST_CATEGORIES, 'Trámites', 'Misiones'] as const;
export const WISHLIST_CATALOG_VERSION = 2;

export const MASTER_GIFTS = [
  // Bebe - base esencial
  { name: 'Silla de Auto (certificada, ISOFIX)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 189990 },
  { name: 'Cuna o Colecho seguro', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 159990 },
  { name: 'Colchón firme para cuna/colecho seguro', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 59990 },
  { name: 'Coche (Stroller) liviano y plegable', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 249990 },
  { name: 'Mobiliario básico (cómoda, mudador)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 129990 },

  // Bebe - higiene y salud
  { name: 'Bañera con soporte', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 34990 },
  { name: 'Termómetro corporal digital', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 12990 },
  { name: 'Kit de aseo (cortaúñas, cepillo, aspirador)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 15990 },
  { name: 'Botiquín básico (suero, gasas, alcohol 70%)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 9990 },
  { name: 'Termómetro de agua (37°C)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },
  { name: 'Cremas (coceduras e hidratante)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 18990 },

  // Bebe - ropa y textiles
  { name: 'Bodies/Conjuntos (apertura frontal)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 8, quantityReserved: 0, price: 24990 },
  { name: 'Pijamas/Ositos con pies', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 6, quantityReserved: 0, price: 35990 },
  { name: 'Gorritos', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 9990 },
  { name: 'Pares de calcetines', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 6, quantityReserved: 0, price: 7990 },
  { name: 'Tutos (Paños de gasa)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 10, quantityReserved: 0, price: 19990 },
  { name: 'Mantas/Cobitas (ligera y gruesa)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 2, quantityReserved: 0, price: 15990 },
  { name: 'Pañales Recién Nacido (RN)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 2, quantityReserved: 0, price: 12990 },
  { name: 'Pañales Talla P', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 999, quantityReserved: 0, price: 14990 },

  // Bebe - opcionales
  { name: 'Monitor de bebé', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 89990 },
  { name: 'Máquina de ruido blanco', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 24990 },

  // Mama
  { name: 'Almohada de embarazo (C o U)', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 39990 },
  { name: 'Aceites/Cremas antiestrías', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 18990 },
  { name: 'Ropa de descanso holgada', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 29990 },
  { name: 'Sostenes de lactancia', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 24990 },
  { name: 'Cojín de lactancia', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { name: 'Crema de lanolina', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 12990 },
  { name: 'Discos absorbentes', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 10, quantityReserved: 0, price: 14990 },
  { name: 'Apósitos postparto (alta absorción)', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 20, quantityReserved: 0, price: 15990 },
  { name: 'Botella de agua de 2 litros', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },

  // Casa
  { name: 'Luz nocturna', category: 'Casa', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },
  { name: 'Humidificador', category: 'Casa', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 29990 },
  { name: 'Esterilizador', category: 'Casa', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 39990 },
  { name: 'Calentador de mamaderas', category: 'Casa', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { name: 'Persianas/Cortinas oscuras', category: 'Casa', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 34990 },
  { name: 'Detector de movimiento', category: 'Casa', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 45990 },

  // Alimentacion
  { name: 'Mamaderas (2-3 unidades)', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { name: 'Sacaleches', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 44990 },
  { name: 'Bolsa de conservación de leche', category: 'Alimentación', isReserved: false, isRepeatable: true, quantityNeeded: 30, quantityReserved: 0, price: 9990 },
  { name: 'Fórmula de respaldo', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { name: 'Chupetes', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 2, quantityReserved: 0, price: 5990 },

  // Hospital
  { name: 'Camisones para el hospital (apertura frontal)', category: 'Hospital', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 19990 },
  { name: 'Bata y pantuflas para el hospital', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 14990 },
  { name: 'Kit de aseo personal para el hospital', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },
  { name: 'Ropa cómoda para el alta', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 24990 },
  { name: 'Manta/cobija para la salida', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 15990 },
  { name: 'Mudas completas para el bebé (hospital)', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 29990 },
  { name: 'Protector labial', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 4990 },
  { name: 'Cargador de celular largo', category: 'Hospital', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 12990 },
];

export const PREGNANCY_PHASES = [
  {
    title: 'Primer Trimestre',
    weeksLabel: 'Semanas 1-12',
    shortTitle: 'Base',
    weekStart: 1,
    weekEnd: 12,
    phase: 'Early' as const,
    emoji: '🌱',
    color: 'rose',
    items: [
      'Confirmar embarazo',
      'Elegir equipo médico',
      'Empezar vitaminas prenatales',
      'Ordenar exámenes y controles',
    ],
  },
  {
    title: 'Segundo Trimestre',
    weeksLabel: 'Semanas 13-26',
    shortTitle: 'Preparación',
    weekStart: 13,
    weekEnd: 26,
    phase: 'Mid' as const,
    emoji: '🌿',
    color: 'amber',
    items: [
      'Resolver compras esenciales',
      'Planificar habitación y mudador',
      'Revisar licencias y trámites',
      'Tomar curso de RCP / primeros auxilios',
    ],
  },
  {
    title: 'Tercer Trimestre',
    weeksLabel: 'Semanas 27-34',
    shortTitle: 'Aterrizaje',
    weekStart: 27,
    weekEnd: 34,
    phase: 'Mid' as const,
    emoji: '🍃',
    color: 'teal',
    items: [
      'Lavar y ordenar ropa del bebé',
      'Cerrar compras pendientes',
      'Definir logística de comidas',
      'Practicar con la silla de auto',
    ],
  },
  {
    title: 'Recta Final',
    weeksLabel: 'Semanas 35-Parto',
    shortTitle: 'Cierre',
    weekStart: 35,
    weekEnd: 42,
    phase: 'Late' as const,
    emoji: '🎀',
    color: 'violet',
    items: [
      'Preparar maleta del hospital',
      'Dejar documentos y plan de parto listos',
      'Coordinar apoyo de las primeras semanas',
      'Tener la casa lista para la llegada',
    ],
  },
];

export const MASTER_TASKS = [
  // Bebe - base esencial
  { title: 'Silla de Auto (certificada, ISOFIX)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Cuna o Colecho seguro', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Colchón firme para cuna/colecho seguro', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Coche (Stroller) liviano y plegable', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Mobiliario básico (cómoda, mudador)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },

  // Bebe - higiene y salud
  { title: 'Bañera con soporte', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Termómetro corporal digital', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Kit de aseo (cortaúñas, cepillo, aspirador)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Botiquín básico (suero, gasas, alcohol 70%)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Termómetro de agua (37°C)', category: 'Bebé', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Cremas (coceduras e hidratante)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },

  // Bebe - ropa y textiles
  { title: 'Bodies/Conjuntos (apertura frontal)', category: 'Bebé', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Pijamas/Ositos con pies', category: 'Bebé', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Gorritos', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Pares de calcetines', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Tutos (Paños de gasa)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Mantas/Cobitas (ligera y gruesa)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },

  // Bebe - opcionales
  { title: 'Monitor de bebé', category: 'Bebé', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Máquina de ruido blanco', category: 'Bebé', phase: 'Late', priority: 'Low', isCompleted: false },

  // Mama
  { title: 'Vitaminas prenatales', category: 'Mamá', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Controles médicos al día', category: 'Mamá', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Almohada de embarazo (C o U)', category: 'Mamá', phase: 'Early', priority: 'Medium', isCompleted: false },
  { title: 'Aceites/Cremas antiestrías', category: 'Mamá', phase: 'Early', priority: 'Low', isCompleted: false },
  { title: 'Ropa de descanso holgada', category: 'Mamá', phase: 'Early', priority: 'Medium', isCompleted: false },
  { title: 'Sostenes de lactancia', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Cojín de lactancia', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Crema de lanolina', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Discos absorbentes', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Apósitos postparto (alta absorción)', category: 'Mamá', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Botella de agua de 2 litros', category: 'Mamá', phase: 'Late', priority: 'Low', isCompleted: false },

  // Casa
  { title: 'Habitación decorada/lista', category: 'Casa', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Área de cambio organizada', category: 'Casa', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Persianas/Cortinas oscuras', category: 'Casa', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Luz nocturna', category: 'Casa', phase: 'Mid', priority: 'Low', isCompleted: false },
  { title: 'Humidificador', category: 'Casa', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Esterilizador', category: 'Casa', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Calentador de mamaderas', category: 'Casa', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Detector de movimiento', category: 'Casa', phase: 'Late', priority: 'Low', isCompleted: false },

  // Alimentacion
  { title: 'Mamaderas (2-3 unidades)', category: 'Alimentación', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Sacaleches', category: 'Alimentación', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Bolsa de conservación de leche', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Fórmula de respaldo', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Meal prep en freezer', category: 'Alimentación', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Chupetes', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },

  // Hospital
  { title: '3 Camisones (apertura frontal)', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Bata y pantuflas', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Kit de aseo personal', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Protector labial', category: 'Hospital', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Ropa cómoda para el alta', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: '3 Mudas completas para el bebé', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: '2 Gorritos y calcetines', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Paquete de pañales RN', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Manta/cobija para la salida', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: '3 Tutos', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Ropa de cambio para acompañante', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Cargador de celular largo', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Cámara / Espacio en el móvil', category: 'Hospital', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Snacks y efectivo', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Documentos (Identidad y Seguro)', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Plan de parto escrito', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },

  // Tramites
  { title: 'Exámenes prenatales al día', category: 'Trámites', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Trámites laborales (licencia)', category: 'Trámites', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Tener claro el trámite de inscripción del bebé', category: 'Trámites', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Seguro médico del bebé', category: 'Trámites', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Permiso de postnatal', category: 'Trámites', phase: 'Late', priority: 'High', isCompleted: false },

  // Misiones
  { title: 'Leer manual de la silla de auto', category: 'Misiones', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Curso de Primeros Auxilios (RCP)', category: 'Misiones', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Investigar trámites (Registro Civil, Salud)', category: 'Misiones', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Instalar y practicar con la silla de auto', category: 'Misiones', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Aprender a mudar rápido', category: 'Misiones', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Logística alimentaria (meal prep y compras)', category: 'Misiones', phase: 'Late', priority: 'High', isCompleted: false },
];

export const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bgColor: string; textColor: string }> = {
  'Bebé':         { emoji: '👶', color: 'rose',   bgColor: 'bg-rose-50',   textColor: 'text-rose-600' },
  'Mamá':         { emoji: '🤱', color: 'teal',   bgColor: 'bg-teal-50',   textColor: 'text-teal-600' },
  'Casa':         { emoji: '🏠', color: 'amber',  bgColor: 'bg-amber-50',  textColor: 'text-amber-600' },
  'Alimentación': { emoji: '🍼', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  'Hospital':     { emoji: '🏥', color: 'blue',   bgColor: 'bg-blue-50',   textColor: 'text-blue-600' },
  'Trámites':     { emoji: '📋', color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  'Misiones':     { emoji: '🎯', color: 'indigo', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string; order: number }> = {
  High:   { label: 'Alta',  color: 'text-rose-600',  bgColor: 'bg-rose-50 border-rose-200',   dotColor: 'bg-rose-500',  order: 0 },
  Medium: { label: 'Media', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', dotColor: 'bg-amber-500', order: 1 },
  Low:    { label: 'Baja',  color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200', dotColor: 'bg-stone-400', order: 2 },
};

export const PHASE_LABELS: Record<string, string> = {
  Early: 'Base y salud (S1-12)',
  Mid: 'Preparación principal (S13-34)',
  Late: 'Cierre final (S35-Parto)',
};

export const BABY_DEVELOPMENT: Record<number, { size: string; weight: string; fact: string }> = {
  4:  { size: '1 mm',    weight: '<1 g',   fact: 'El corazón comienza a latir.' },
  8:  { size: '1.6 cm',  weight: '1 g',    fact: 'Se forman los dedos de manos y pies.' },
  12: { size: '5.4 cm',  weight: '14 g',   fact: 'Puede abrir y cerrar los puños. Cierra el primer trimestre.' },
  16: { size: '11.6 cm', weight: '100 g',  fact: 'Ya puede chuparse el dedo y sus uñas están formadas.' },
  20: { size: '25 cm',   weight: '300 g',  fact: 'Es habitual empezar a sentir movimientos más claros.' },
  24: { size: '30 cm',   weight: '600 g',  fact: 'Reacciona a sonidos y los pulmones siguen madurando.' },
  28: { size: '37 cm',   weight: '1 kg',   fact: 'Abre los ojos por primera vez y aparece sueño REM.' },
  32: { size: '42 cm',   weight: '1.7 kg', fact: 'Los huesos se endurecen y practica la respiración.' },
  36: { size: '47 cm',   weight: '2.7 kg', fact: 'Ya está casi listo; muchos bebés se acomodan cabeza abajo.' },
  38: { size: '49 cm',   weight: '3 kg',   fact: 'Se considera a término. Puede nacer en cualquier momento.' },
  40: { size: '51 cm',   weight: '3.4 kg', fact: 'Fecha probable de parto. Todo debería estar listo.' },
};

export const getBabyDevelopment = (week: number) => {
  const keys = Object.keys(BABY_DEVELOPMENT).map(Number).sort((a, b) => a - b);
  let closest = keys[0];

  for (const key of keys) {
    if (key <= week) closest = key;
    else break;
  }

  return { week: closest, ...BABY_DEVELOPMENT[closest] };
};

export const PREGNANCY_TIPS: { phase: string; tips: string[] }[] = [
  {
    phase: 'Early',
    tips: [
      'Tomar ácido fólico y vitaminas prenatales indicadas por tu equipo médico.',
      'Ordenar controles, exámenes y cualquier derivación médica temprana.',
      'Evitar alcohol, tabaco y alimentos de mayor riesgo sanitario.',
      'No intentar comprar todo de golpe; primero definan lo verdaderamente esencial.',
    ],
  },
  {
    phase: 'Mid',
    tips: [
      'Avanzar con compras estructurales: cuna, colchón, silla de auto y mudador.',
      'Resolver licencias, trámites y cobertura médica con margen.',
      'Tomar un curso de RCP / primeros auxilios para recién nacidos.',
      'Diseñar una habitación funcional vale más que una habitación perfecta.',
    ],
  },
  {
    phase: 'Late',
    tips: [
      'Lavar y ordenar la ropa del bebé antes de la semana 35.',
      'Dejar maleta, documentos y plan de parto listos con anticipación.',
      'Congelar comidas o dejar resuelta la logística de las primeras semanas.',
      'Practicar con la silla de auto antes del día del parto evita estrés innecesario.',
    ],
  },
];
