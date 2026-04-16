export const MASTER_GIFTS = [
  { name: 'Silla de Auto (certificada, ISOFIX)', category: 'Transporte', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 189990 },
  { name: 'Coche (Stroller) liviano y plegable', category: 'Transporte', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 249990 },
  { name: 'Cuna o Colecho seguro', category: 'Mobiliario', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 159990 },
  { name: 'Mobiliario básico (cómoda, mudador)', category: 'Mobiliario', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 129990 },
  { name: 'Bañera con soporte', category: 'Higiene', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 34990 },
  { name: 'Termómetro de agua (37°C)', category: 'Higiene', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 8990 },
  { name: 'Kit de aseo (cortaúñas, cepillo, aspirador)', category: 'Higiene', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 15990 },
  { name: 'Termómetro corporal digital', category: 'Salud', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 12990 },
  { name: 'Botiquín básico (suero, gasas, alcohol 70%)', category: 'Salud', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 9990 },
  { name: 'Cremas (coceduras e hidratante)', category: 'Higiene', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 18990 },
  { name: 'Bodies (apertura frontal)', category: 'Ropa', isReserved: false, isRepeatable: true, quantityNeeded: 8, quantityReserved: 0, price: 24990 },
  { name: 'Pijamas/Ositos con pies', category: 'Ropa', isReserved: false, isRepeatable: true, quantityNeeded: 6, quantityReserved: 0, price: 35990 },
  { name: 'Gorritos', category: 'Ropa', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 9990 },
  { name: 'Pares de calcetines', category: 'Ropa', isReserved: false, isRepeatable: true, quantityNeeded: 6, quantityReserved: 0, price: 7990 },
  { name: 'Tutos (Paños de gasa)', category: 'Accesorios', isReserved: false, isRepeatable: true, quantityNeeded: 10, quantityReserved: 0, price: 19990 },
  { name: 'Mantas (ligera y gruesa)', category: 'Ropa', isReserved: false, isRepeatable: true, quantityNeeded: 2, quantityReserved: 0, price: 15990 },
  { name: 'Colchón firme', category: 'Mobiliario', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 59990 },
  { name: 'Monitor de bebé', category: 'Seguridad', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 89990 },
  { name: 'Máquina de ruido blanco', category: 'Accesorios', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 24990 },
  { name: 'Almohada de embarazo (C o U)', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 39990 },
  { name: 'Sostenes de lactancia', category: 'Mamá', isReserved: false, isRepeatable: true, quantityNeeded: 3, quantityReserved: 0, price: 24990 },
  { name: 'Cojín de lactancia', category: 'Mamá', isReserved: false, isRepeatable: false, quantityNeeded: 1, quantityReserved: 0, price: 19990 },
  { name: 'Pañales RN', category: 'Higiene', isReserved: false, isRepeatable: true, quantityNeeded: 2, quantityReserved: 0, price: 12990 },
  { name: 'Pañales Talla P', category: 'Higiene', isReserved: false, isRepeatable: true, quantityNeeded: 4, quantityReserved: 0, price: 14990 }
];

export const PREGNANCY_PHASES = [
  {
    title: "Primer Trimestre",
    weeksLabel: "Semanas 1-12",
    shortTitle: "Trimestre 1",
    items: [
      "Confirmar embarazo",
      "Primera ecografía",
      "Elegir equipo médico",
      "Comenzar vitaminas prenatales"
    ]
  },
  {
    title: "Segundo Trimestre",
    weeksLabel: "Semanas 13-26",
    shortTitle: "Trimestre 2",
    items: [
      "Ecografía morfológica",
      "Conocer el sexo (opcional)",
      "Planificar el Baby Shower",
      "Preparar la habitación"
    ]
  },
  {
    title: "Tercer Trimestre",
    weeksLabel: "Semanas 27-34",
    shortTitle: "Trimestre 3",
    items: [
      "Clases de preparación al parto",
      "Comprar artículos esenciales",
      "Lavar ropita de recién nacido",
      "Instalar silla de auto"
    ]
  },
  {
    title: "Recta Final",
    weeksLabel: "Semanas 35-Parto",
    shortTitle: "Parto",
    items: [
      "Preparar maleta del hospital",
      "Plan de parto",
      "Abastecer despensa",
      "¡Bienvenida/o a casa!"
    ]
  }
];

export const MASTER_TASKS = [
  // Bebé
  { title: 'Bañera con soporte', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Termómetro de agua (37°C)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Kit de aseo (cortaúñas, cepillo, aspirador)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Termómetro corporal digital', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Botiquín básico (suero, gasas, alcohol 70%)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Cremas (coceduras e hidratante)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Bodies (apertura frontal)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Pijamas/Ositos con pies', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Gorritos', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Pares de calcetines', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Tutos (Paños de gasa)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Mantas (ligera y gruesa)', category: 'Bebé', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Colchón firme', category: 'Bebé', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Monitor de bebé', category: 'Bebé', phase: 'Early', priority: 'Medium', isCompleted: false },
  { title: 'Máquina de ruido blanco', category: 'Bebé', phase: 'Early', priority: 'Low', isCompleted: false },
  { title: 'Silla de Auto (certificada, ISOFIX)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Coche (Stroller) liviano y plegable', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Cuna o Colecho seguro', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Mobiliario básico (cómoda, mudador)', category: 'Bebé', phase: 'Mid', priority: 'High', isCompleted: false },
  // Mamá
  { title: 'Almohada de embarazo (C o U)', category: 'Mamá', phase: 'Early', priority: 'Medium', isCompleted: false },
  { title: 'Aceites/Cremas antiestrías', category: 'Mamá', phase: 'Early', priority: 'Medium', isCompleted: false },
  { title: 'Ropa de descanso holgada', category: 'Mamá', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Sostenes de lactancia', category: 'Mamá', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Discos absorbentes', category: 'Mamá', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Crema de lanolina', category: 'Mamá', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Cojín de lactancia', category: 'Mamá', phase: 'Mid', priority: 'Medium', isCompleted: false },
  { title: 'Apósitos postparto (alta absorción)', category: 'Mamá', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Botella de agua de 2 litros', category: 'Mamá', phase: 'Mid', priority: 'Medium', isCompleted: false },
  // Hospital
  { title: '3 Camisolas (apertura frontal)', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Bata y pantuflas', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Kit de aseo personal', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Protector labial', category: 'Hospital', phase: 'Late', priority: 'Low', isCompleted: false },
  { title: 'Ropa cómoda para el alta', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: '3 Mudas completas para el bebé', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: '2 Gorritos y calcetines', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Paquete de pañales RN', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Manta para la salida', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: '3 Tutos', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Ropa de cambio para acompañante', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Cargador de celular largo', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Cámara / Espacio en el móvil', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Snacks y efectivo', category: 'Hospital', phase: 'Late', priority: 'Medium', isCompleted: false },
  { title: 'Documentos (Identidad y Seguro)', category: 'Hospital', phase: 'Late', priority: 'High', isCompleted: false },
  // Misiones
  { title: 'Leer manual de la silla de auto', category: 'Misiones', phase: 'Early', priority: 'High', isCompleted: false },
  { title: 'Aprender a mudar rápido', category: 'Misiones', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Logística Alimentaria (Meal Prep)', category: 'Misiones', phase: 'Late', priority: 'High', isCompleted: false },
  { title: 'Investigar trámites (Registro Civil, Salud)', category: 'Misiones', phase: 'Mid', priority: 'High', isCompleted: false },
  { title: 'Curso de Primeros Auxilios (RCP)', category: 'Misiones', phase: 'Mid', priority: 'High', isCompleted: false }
];
