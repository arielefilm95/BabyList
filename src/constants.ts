export const WISHLIST_CATEGORIES = ['Bebé', 'Mamá', 'Habitación y ambiente', 'Alimentación'] as const;
export const TASK_CATEGORIES = ['Bebé', 'Mamá', 'Casa', 'Alimentación', 'Hospital', 'Trámites', 'Misiones'] as const;
export const WISHLIST_CATALOG_VERSION = 3;

export const DONATION_CATEGORIES = ['Ropa', 'Juguetes', 'Alimentación', 'Cuna y mueble', 'Paseo y transporte', 'Higiene y salud', 'Otros'] as const;
export const DONATION_CONDITIONS = ['Nuevo', 'Como nuevo', 'Bueno', 'Regular'] as const;

export const CHILEAN_REGIONS = [
  {
    name: 'Metropolitana de Santiago',
    cities: ['Santiago', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón', 'Vitacura'],
  },
  {
    name: 'Valparaíso',
    cities: ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'San Antonio', 'Quillota', 'Calera', 'Los Andes', 'San Felipe', 'Limache', 'Olmué'],
  },
  {
    name: 'Biobío',
    cities: ['Concepción', 'Talcahuano', 'Chiguayante', 'Penco', 'Tomé', 'Coronel', 'Los Ángeles', 'Chillán', 'Los芒.', 'San Carlos'],
  },
  {
    name: 'La Araucanía',
    cities: ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria'],
  },
  {
    name: 'Maule',
    cities: ['Talca', 'Curicó', 'Linares', 'Constitución', 'Cauquenes'],
  },
  {
    name: 'Coquimbo',
    cities: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Los Vilos'],
  },
  {
    name: 'Los Lagos',
    cities: ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud', 'Frutillar'],
  },
  {
    name: 'Aysén',
    cities: ['Coyhaique', 'Puerto Aysén', 'Chile Chico', ' Cochrane'],
  },
  {
    name: 'Magallanes',
    cities: ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos'],
  },
  {
    name: 'Antofagasta',
    cities: ['Antofagasta', 'Calama', 'Tocopilla', 'María Elena'],
  },
  {
    name: 'Atacama',
    cities: ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Vallenar'],
  },
  {
    name: 'Coquimbo',
    cities: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Los Vilos', 'Salamanca'],
  },
  {
    name: 'O Higgins',
    cities: ['Rancagua', 'San Fernando', 'Pichilemu', 'Santa Cruz', 'Graneros', 'Machalí'],
  },
  {
    name: 'Ñuble',
    cities: ['Chillán', 'San Carlos', 'Chillán Viejo', 'Bulnes', 'Quillón', 'San Nicolás'],
  },
  {
    name: 'Tarapacá',
    cities: ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica'],
  },
  {
    name: 'Arica y Parinacota',
    cities: ['Arica', 'Putre', 'General Lagos'],
  },
] as const;

export const DONATION_CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bgColor: string; textColor: string }> = {
  'Ropa': { emoji: '👗', color: 'pink', bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
  'Juguetes': { emoji: '🧸', color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
  'Alimentación': { emoji: '🍼', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  'Cuna y mueble': { emoji: '🛏️', color: 'indigo', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
  'Paseo y transporte': { emoji: '🚼', color: 'teal', bgColor: 'bg-teal-50', textColor: 'text-teal-600' },
  'Higiene y salud': { emoji: '🧴', color: 'cyan', bgColor: 'bg-cyan-50', textColor: 'text-cyan-600' },
  'Otros': { emoji: '📦', color: 'stone', bgColor: 'bg-stone-50', textColor: 'text-stone-600' },
};

export const DONATION_CONDITION_CONFIG: Record<string, { color: string; bgColor: string }> = {
  'Nuevo': { color: 'emerald', bgColor: 'bg-emerald-50' },
  'Como nuevo': { color: 'teal', bgColor: 'bg-teal-50' },
  'Bueno': { color: 'amber', bgColor: 'bg-amber-50' },
  'Regular': { color: 'stone', bgColor: 'bg-stone-50' },
};

type MasterGiftTemplate = {
  catalogKey: string;
  name: string;
  category: (typeof WISHLIST_CATEGORIES)[number];
  isReserved: boolean;
  isRepeatable: boolean;
  quantityNeeded: number;
  quantityReserved: number;
  price: number;
};

type MasterTaskTemplate = {
  catalogKey?: string;
  title: string;
  category: (typeof TASK_CATEGORIES)[number];
  phase: 'Early' | 'Mid' | 'Late';
  priority: 'Low' | 'Medium' | 'High';
  isCompleted: boolean;
};

export const RETIRED_WISHLIST_GIFT_NAMES = [
  'Camisones para el hospital (apertura frontal)',
  'Bata y pantuflas para el hospital',
  'Kit de aseo personal para el hospital',
  'Ropa cómoda para el alta',
  'Manta/cobija para la salida',
  'Mudas completas para el bebé (hospital)',
  'Protector labial',
  'Cargador de celular largo',
  'Persianas/Cortinas oscuras',
  'Detector de movimiento',
] as const;

export const MASTER_GIFTS: MasterGiftTemplate[] = [
  // Bebé
  { catalogKey: 'baby_car_seat', name: 'Silla de auto (certificada, ISOFIX)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 189990 },
  { catalogKey: 'baby_bed', name: 'Cuna o colecho', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 159990 },
  { catalogKey: 'baby_mattress', name: 'Colchón para cuna o colecho', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 59990 },
  { catalogKey: 'stroller', name: 'Coche (stroller) liviano y plegable', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 249990 },
  { catalogKey: 'changing_furniture', name: 'Mobiliario básico (cómoda, mudador)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 129990 },
  { catalogKey: 'baby_bath', name: 'Bañera con soporte', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 34990 },
  { catalogKey: 'baby_body_thermometer', name: 'Termómetro corporal digital', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 12990 },
  { catalogKey: 'baby_grooming_kit', name: 'Kit de aseo (cortaúñas, cepillo, aspirador)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 15990 },
  { catalogKey: 'baby_first_aid', name: 'Botiquín básico (suero, gasas, alcohol 70%)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 9990 },
  { catalogKey: 'baby_bath_thermometer', name: 'Termómetro de agua (37°C)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },
  { catalogKey: 'baby_skin_cream', name: 'Cremas (coceduras e hidratante)', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 18990 },
  { catalogKey: 'baby_bodies', name: 'Bodies / conjuntos (apertura frontal)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 8, quantityReserved: 0, price: 24990 },
  { catalogKey: 'baby_sleepers', name: 'Pijamas / ositos con pies', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 6, quantityReserved: 0, price: 35990 },
  { catalogKey: 'baby_hats', name: 'Gorritos', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 9990 },
  { catalogKey: 'baby_socks', name: 'Pares de calcetines', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 6, quantityReserved: 0, price: 7990 },
  { catalogKey: 'muslin_cloths', name: 'Tutos (paños de gasa)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 10, quantityReserved: 0, price: 19990 },
  { catalogKey: 'baby_blankets', name: 'Mantas / cobitas (ligera y gruesa)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 2, quantityReserved: 0, price: 15990 },
  { catalogKey: 'diapers_newborn', name: 'Pañales recién nacido (RN)', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 2, quantityReserved: 0, price: 12990 },
  { catalogKey: 'diapers_p', name: 'Pañales talla P', category: 'Bebé', isReserved: false, isRepeatable: true, quantityNeeded: 999, quantityReserved: 0, price: 14990 },
  { catalogKey: 'baby_monitor', name: 'Monitor de bebé', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 89990 },
  { catalogKey: 'white_noise_machine', name: 'Máquina de ruido blanco', category: 'Bebé', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 24990 },

  // Mamá
  { catalogKey: 'pregnancy_pillow', name: 'Almohada de embarazo (C o U)', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 39990 },
  { catalogKey: 'stretch_mark_cream', name: 'Aceites / cremas antiestrías', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 18990 },
  { catalogKey: 'rest_clothes', name: 'Ropa de descanso holgada', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 29990 },
  { catalogKey: 'nursing_bras', name: 'Sostenes de lactancia', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 24990 },
  { catalogKey: 'nursing_pillow', name: 'Cojín de lactancia', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { catalogKey: 'lanolin_cream', name: 'Crema de lanolina', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 12990 },
  { catalogKey: 'nursing_pads', name: 'Discos absorbentes', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 10, quantityReserved: 0, price: 14990 },
  { catalogKey: 'postpartum_pads', name: 'Apósitos postparto (alta absorción)', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 20, quantityReserved: 0, price: 15990 },
  { catalogKey: 'water_bottle_2l', name: 'Botella de agua de 2 litros', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },

  // Habitación y ambiente
  { catalogKey: 'night_light', name: 'Luz nocturna', category: 'Habitación y ambiente', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },
  { catalogKey: 'humidifier', name: 'Humidificador', category: 'Habitación y ambiente', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 29990 },

  // Alimentación
  { catalogKey: 'bottles', name: 'Mamaderas (2-3 unidades)', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { catalogKey: 'breast_pump', name: 'Sacaleches', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 44990 },
  { catalogKey: 'milk_storage_bags', name: 'Bolsa de conservación de leche', category: 'Alimentación', isReserved: false, isRepeatable: true, quantityNeeded: 30, quantityReserved: 0, price: 9990 },
  { catalogKey: 'backup_formula', name: 'Fórmula de respaldo', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { catalogKey: 'pacifiers', name: 'Chupetes', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 2, quantityReserved: 0, price: 5990 },
  { catalogKey: 'sterilizer', name: 'Esterilizador', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 39990 },
  { catalogKey: 'bottle_warmer', name: 'Calentador de mamaderas', category: 'Alimentación', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
] ;

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
] as const;

export const MASTER_TASKS: MasterTaskTemplate[] = [
  // Bebé
  { catalogKey: 'baby_car_seat', title: 'Silla de auto (certificada, ISOFIX)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { catalogKey: 'baby_bed', title: 'Cuna o colecho', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { catalogKey: 'baby_mattress', title: 'Colchón para cuna o colecho', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { catalogKey: 'stroller', title: 'Coche (stroller) liviano y plegable', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'changing_furniture', title: 'Mobiliario básico (cómoda, mudador)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_bath', title: 'Bañera con soporte', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_body_thermometer', title: 'Termómetro corporal digital', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { catalogKey: 'baby_grooming_kit', title: 'Kit de aseo (cortaúñas, cepillo, aspirador)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_first_aid', title: 'Botiquín básico (suero, gasas, alcohol 70%)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_bath_thermometer', title: 'Termómetro de agua (37°C)', category: 'Bebé', phase: 'Late', priority: 'Low', isCompleted: false },
  { catalogKey: 'baby_skin_cream', title: 'Cremas (coceduras e hidratante)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_bodies', title: 'Bodies / conjuntos (apertura frontal)', category: 'Bebé', phase: 'Late', priority: 'High', isCompleted: false },
  { catalogKey: 'baby_sleepers', title: 'Pijamas / ositos con pies', category: 'Bebé', phase: 'Late', priority: 'High', isCompleted: false },
  { catalogKey: 'baby_hats', title: 'Gorritos', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_socks', title: 'Pares de calcetines', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'muslin_cloths', title: 'Tutos (paños de gasa)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_blankets', title: 'Mantas / cobitas (ligera y gruesa)', category: 'Bebé', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'baby_monitor', title: 'Monitor de bebé', category: 'Bebé', phase: 'Late', priority: 'Low', isCompleted: false },
  { catalogKey: 'white_noise_machine', title: 'Máquina de ruido blanco', category: 'Bebé', phase: 'Late', priority: 'Low', isCompleted: false },

  // Mamá
  { title: 'Vitaminas prenatales', category: 'Mamá', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Controles médicos al día', category: 'Mamá', phase: 'Early', priority: 'High', isCompleted: false },
  { catalogKey: 'pregnancy_pillow', title: 'Almohada de embarazo (C o U)', category: 'Mamá', phase: 'Early', priority: 'Medium', isCompleted: false },
  { catalogKey: 'stretch_mark_cream', title: 'Aceites / cremas antiestrías', category: 'Mamá', phase: 'Early', priority: 'Low', isCompleted: false },
  { catalogKey: 'rest_clothes', title: 'Ropa de descanso holgada', category: 'Mamá', phase: 'Early', priority: 'Medium', isCompleted: false },
  { catalogKey: 'nursing_bras', title: 'Sostenes de lactancia', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'nursing_pillow', title: 'Cojín de lactancia', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'lanolin_cream', title: 'Crema de lanolina', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'nursing_pads', title: 'Discos absorbentes', category: 'Mamá', phase: 'Late', priority: 'Medium', isCompleted: false },
  { catalogKey: 'postpartum_pads', title: 'Apósitos postparto (alta absorción)', category: 'Mamá', phase: 'Late', priority: 'High', isCompleted: false },
  { catalogKey: 'water_bottle_2l', title: 'Botella de agua de 2 litros', category: 'Mamá', phase: 'Late', priority: 'Low', isCompleted: false },

  // Casa
  { title: 'Habitación decorada / lista', category: 'Casa', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Área de cambio organizada', category: 'Casa', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Persianas / cortinas oscuras', category: 'Casa', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'night_light', title: 'Luz nocturna', category: 'Casa', phase: 'Mid', priority: 'Low', isCompleted: false },
  { catalogKey: 'humidifier', title: 'Humidificador', category: 'Casa', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Detector de movimiento', category: 'Casa', phase: 'Late', priority: 'Low', isCompleted: false },

  // Alimentación
  { catalogKey: 'bottles', title: 'Mamaderas (2-3 unidades)', category: 'Alimentación', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'breast_pump', title: 'Sacaleches', category: 'Alimentación', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { catalogKey: 'milk_storage_bags', title: 'Bolsa de conservación de leche', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { catalogKey: 'backup_formula', title: 'Fórmula de respaldo', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { catalogKey: 'sterilizer', title: 'Esterilizador', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { catalogKey: 'bottle_warmer', title: 'Calentador de mamaderas', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { catalogKey: 'pacifiers', title: 'Chupetes', category: 'Alimentación', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Meal prep en freezer', category: 'Alimentación', phase: 'Late', priority: 'High', isCompleted: false },

  // Hospital
  { title: '3 camisones (apertura frontal)', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Bata y pantuflas', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Kit de aseo personal', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Protector labial', category: 'Hospital', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Ropa cómoda para el alta', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: '3 mudas completas para el bebé', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: '2 gorritos y calcetines', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Paquete de pañales RN', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Manta / cobija para la salida', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: '3 tutos', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Ropa de cambio para acompañante', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Cargador de celular largo', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Cámara / espacio en el móvil', category: 'Hospital', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Snacks y efectivo', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Documentos (identidad y seguro)', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Plan de parto escrito', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },

  // Trámites
  { title: 'Exámenes prenatales al día', category: 'Trámites', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Trámites laborales (licencia)', category: 'Trámites', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Tener claro el trámite de inscripción del bebé', category: 'Trámites', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Seguro médico del bebé', category: 'Trámites', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Permiso de postnatal', category: 'Trámites', phase: 'Late', priority: 'High', isCompleted: false },

  // Misiones
  { title: 'Leer manual de la silla de auto', category: 'Misiones', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Curso de primeros auxilios (RCP)', category: 'Misiones', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Investigar trámites (Registro Civil, Salud)', category: 'Misiones', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Instalar y practicar con la silla de auto', category: 'Misiones', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Aprender a mudar rápido', category: 'Misiones', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Logística alimentaria (meal prep y compras)', category: 'Misiones', phase: 'Late', priority: 'High', isCompleted: false },
] ;

export const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bgColor: string; textColor: string }> = {
  'Bebé': { emoji: '👶', color: 'rose', bgColor: 'bg-rose-50', textColor: 'text-rose-600' },
  'Mamá': { emoji: '🤱', color: 'teal', bgColor: 'bg-teal-50', textColor: 'text-teal-600' },
  'Habitación y ambiente': { emoji: '🛏️', color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  'Casa': { emoji: '🏠', color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
  'Alimentación': { emoji: '🍼', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  'Hospital': { emoji: '🏥', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  'Trámites': { emoji: '📋', color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  'Misiones': { emoji: '🎯', color: 'indigo', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string; order: number }> = {
  High: { label: 'Alta', color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', dotColor: 'bg-rose-500', order: 0 },
  Medium: { label: 'Media', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', dotColor: 'bg-amber-500', order: 1 },
  Low: { label: 'Baja', color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200', dotColor: 'bg-stone-400', order: 2 },
};

export const PHASE_LABELS: Record<string, string> = {
  Early: 'Base y salud (S1-12)',
  Mid: 'Preparación principal (S13-34)',
  Late: 'Cierre final (S35-Parto)',
};

export const BABY_DEVELOPMENT: Record<number, { size: string; weight: string; fact: string }> = {
  4: { size: '1 mm', weight: '<1 g', fact: 'El corazón comienza a latir.' },
  8: { size: '1.6 cm', weight: '1 g', fact: 'Se forman los dedos de manos y pies.' },
  12: { size: '5.4 cm', weight: '14 g', fact: 'Puede abrir y cerrar los puños. Cierra el primer trimestre.' },
  16: { size: '11.6 cm', weight: '100 g', fact: 'Ya puede chuparse el dedo y sus uñas están formadas.' },
  20: { size: '25 cm', weight: '300 g', fact: 'Es habitual empezar a sentir movimientos más claros.' },
  24: { size: '30 cm', weight: '600 g', fact: 'Reacciona a sonidos y los pulmones siguen madurando.' },
  28: { size: '37 cm', weight: '1 kg', fact: 'Abre los ojos por primera vez y aparece sueño REM.' },
  32: { size: '42 cm', weight: '1.7 kg', fact: 'Los huesos se endurecen y practica la respiración.' },
  36: { size: '47 cm', weight: '2.7 kg', fact: 'Ya está casi listo; muchos bebés se acomodan cabeza abajo.' },
  38: { size: '49 cm', weight: '3 kg', fact: 'Se considera a término. Puede nacer en cualquier momento.' },
  40: { size: '51 cm', weight: '3.4 kg', fact: 'Fecha probable de parto. Todo debería estar listo.' },
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
