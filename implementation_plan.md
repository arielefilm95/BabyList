# 🍼 Auditoría Completa — BabyPlan App

Revisión exhaustiva de toda la lógica, funcionalidad y coherencia de la app para padres esperando un bebé.

---

## Resumen Ejecutivo

La app tiene una buena **base funcional**: onboarding, wishlist con carrito + checkout, checklist con categorías, timeline, galería y asistente IA. Sin embargo, hay **problemas significativos** de arquitectura, funcionalidad incompleta, y oportunidades de mejora para que cada sección tenga un propósito claro y coherente.

---

## 1. 🏗️ Problemas de Arquitectura (Críticos)

### App.tsx es un monolito de 2250 líneas
Todo vive en un solo archivo: `LandingPage`, `Navbar`, `MobileNav`, `Wishlist`, `Dashboard`, `Checklists`, `Gallery`, `Timeline`, `AIAssistant` y `App`. Esto es **insostenible**.

> [!CAUTION]
> **Riesgo**: Cualquier cambio puede romper todo. Depurar es una pesadilla. No se pueden optimizar renders individuales.

**Plan**: Separar cada componente en su propio archivo dentro de `src/components/`.

---

### Duplicación de listeners de Firestore
La wishlist y las tasks se escuchan **múltiples veces** en diferentes componentes:
- `Dashboard` escucha `wishlist` y `tasks` (líneas 1065-1074)
- `Wishlist` escucha `wishlist` (línea 631)
- `Checklists` escucha `tasks` y `wishlist` (líneas 1348-1372)
- `App` escucha `bankDetails` (línea 1854)

**Cada listener es una conexión abierta a Firestore** que cobra por lecturas.

**Plan**: Centralizar en un contexto global (`DataContext`) o usar un state manager ligero.

---

### Auto-seed ejecutándose en cada render
Tanto `Wishlist.seedWishlist()` como `Checklists.seedTasks()` pueden ejecutarse repetidamente:
```tsx
// Se ejecuta SI la colección está vacía Y es owner Y no está seeding
if (snapshot.empty && isOwner && !isSeeding) {
  seedWishlist(); // o seedTasks()
}
```
Pero `isSeeding` es un estado local que se reinicia si el componente re-monta. Esto causa **writes duplicados**.

**Plan**: Marcar en el perfil del usuario (`hasSeededWishlist: true`, `hasSeededTasks: true`) y verificar antes de seed.

---

## 2. 🎁 Wishlist — Análisis Detallado

### Lo que funciona bien ✅
- Sistema de reservas con carrito (multi-item checkout)
- Transacciones atómicas para reservar (evita race conditions)
- Soporte para items repetibles (pañales, etc.) con `quantityNeeded/quantityReserved`
- Filtros por categoría
- Link de compartir para invitados
- Checkout con 2 métodos (comprar vs. transferencia)
- Sincronización automática wish → task cuando alguien regala algo

### Problemas encontrados ⚠️

| Problema | Severidad | Detalle |
|----------|----------|---------|
| **Limpieza de picsum en loop** | 🔴 Alta | Cada vez que un snapshot llega, se ejecuta el cleanup de imágenes picsum (líneas 642-651, 1362-1371). Esto genera writes innecesarios en CADA snapshot, incluso si ya se limpió. |
| **Categoría "General" hardcodeada inconsistente** | 🟡 Media | `newGift` se resetea con `category: 'General'` (línea 699) pero las categorías válidas son: Bebé, Mamá, Casa, Alimentación, Hospital. |
| **Sin confirmación al eliminar** | 🟡 Media | El botón de eliminar regalo (línea 874) no pide confirmación. Un mis-click borra el item. |
| **Emoji fallback limitado** | 🟢 Baja | Solo hay 3 emojis fallback (🍼, 🛏️, 📦) para cuando no hay imagen. Debería haber uno por categoría. |
| **Precios hardcoded en CLP** | 🟡 Media | Los precios son fijos en pesos chilenos. No hay forma de que el usuario personalice la moneda. Está bien si el público es 100% chileno, pero limita. |

### Sugerencias de mejora funcional

1. **Agregar prioridad/importancia a los regalos**: Los invitados no saben qué es más urgente. Un badge "Esencial" vs "Nice to have".
2. **Agrupar por "Ya tenemos" / "Falta"**: Vista rápida del progreso.
3. **Agregar URL de compra sugerida**: Algunos regalos del seed no tienen `purchaseUrl`. El padre debería poder linkear a mercado libre, Amazon, etc.

---

## 3. ✅ Checklist — Análisis Detallado

### Lo que funciona bien ✅
- Categorías completas y coherentes (Bebé, Mamá, Casa, Alimentación, Hospital, Trámites, Misiones)
- Sincronización con regalos (si alguien regala algo, la tarea se marca como completada)
- Filtro por categoría
- Badge de "Regalado por: X" en tareas completadas por regalos

### Problemas encontrados ⚠️

| Problema | Severidad | Detalle |
|----------|----------|---------|
| **Las fases (Early/Mid/Late) no están vinculadas a la semana real** | 🔴 Alta | Las tareas tienen `phase: 'Early'|'Mid'|'Late'` pero la checklist **NO filtra ni ordena por la fase actual**. No hay indicación visual de "estas tareas las deberías haber hecho ya". |
| **Firestore rules desactualizadas** | 🔴 Alta | `isValidTask` valida `category in ["Pedrito", "Vanessa", "Hospital", "Misiones"]` (línea 96 de firestore.rules). Pero las categorías reales son "Bebé", "Mamá", "Casa", "Alimentación", "Hospital", "Trámites", "Misiones". **Los writes fallarán silenciosamente.** |
| **Sin prioridad visual** | 🟡 Media | Las tareas tienen `priority: 'Low'|'Medium'|'High'` pero NO se muestra en la UI. No hay color, ícono, ni orden por prioridad. |
| **`dueDate` asignado pero no calculado automáticamente** | 🟡 Media | Al crear una tarea manual, se pone la fecha de hoy. Las tareas del seed NO tienen `dueDate`. Debería calcularse basándose en la `phase` + `dueDate` del perfil. |
| **Sin agrupación visual por fase** | 🟡 Media | La checklist es una lista plana. Debería agrupar: "Lo que ya deberías tener listo", "Lo que viene ahora", "Para más adelante". |
| **Tareas solo de lectura para invitados** | 🟢 Baja | OK para seguridad, pero los invitados no ven las tasks, lo cual podría ser útil para coordinarse. |

### Sugerencias de mejora funcional

1. **Smart Sorting**: Ordenar tareas por: incompletas primero, luego por prioridad (High → Medium → Low), luego por fase.
2. **Indicador de atraso**: Si la fase actual es "Late" pero una tarea "Early" no está completada → marcarla en rojo como "ATRASADA".
3. **Fechas automáticas por fase**:
   - Early: semanas 1-12 → calcular fecha límite desde `pregnancyStartDate`
   - Mid: semanas 13-26
   - Late: semanas 27-parto
4. **Barra de progreso global**: "72% del checklist listo" con desglose por categoría.

---

## 4. 📅 Timeline — Análisis Detallado

### Estado actual
El Timeline es **puramente informativo/estático**. Muestra 4 fases con 4 items cada una:

```
Primer Trimestre (S1-12): Confirmar embarazo, Primera ecografía, Elegir equipo médico, Vitaminas
Segundo Trimestre (S13-26): Ecografía morfológica, Sexo, Baby Shower, Habitación
Tercer Trimestre (S27-34): Clases parto, Artículos esenciales, Lavar ropita, Silla auto
Recta Final (S35-Parto): Maleta hospital, Plan de parto, Despensa, ¡Bienvenida!
```

### Problemas encontrados ⚠️

| Problema | Severidad | Detalle |
|----------|----------|---------|
| **No es interactivo** | 🔴 Alta | Los items del timeline NO están vinculados a las tareas de la checklist. Son strings estáticos. No se pueden marcar como completados. |
| **Duplica información de la checklist** | 🔴 Alta | "Comprar artículos esenciales", "Preparar maleta del hospital", "Instalar silla de auto" ya existen como tareas en la checklist pero NO están conectados. |
| **No usa datos reales del embarazo** | 🟡 Media | No muestra fechas reales calculadas. Solo dice "Semanas 1-12" pero no "Ene 2026 - Mar 2026". |
| **Solo 4 items por fase** | 🟡 Media | Es muy simplificado. No refleja la realidad de la preparación. |

### ¿Cuál debería ser la función del Timeline?

El Timeline y la Checklist actualmente **compiten** en propósito. Propongo diferenciarlos así:

> [!IMPORTANT]
> **Timeline** = Vista de alto nivel, orientada al TIEMPO. "¿Qué debería estar pasando AHORA según mi semana de gestación?"
> 
> **Checklist** = Vista de detalle, orientada a la ACCIÓN. "¿Qué tareas específicas me faltan por completar?"

**Plan para Timeline**:
1. Vincularlo con las tareas reales de la checklist (agrupar tareas por fase)
2. Mostrar fechas reales basadas en la fecha de parto
3. Agregar un indicador de progreso por fase
4. Incluir tips médicos/informativos por semana (no solo tareas)
5. Calcular y mostrar: "Estás en la Semana 28. Te faltan 12 semanas."

---

## 5. 🔐 Seguridad — Issues

| Issue | Severidad | Detalle |
|-------|----------|---------|
| **Email hardcodeado como admin** | 🔴 Alta | `user?.email === 'aaes17@gmail.com'` en AuthContext (línea 139) y Firestore rules (línea 71). Si alguien encuentra ese email, sabe quién es el superadmin. |
| **Firestore rules task categories desactualizadas** | 🔴 Alta | Como se mencionó, las categorías en rules no coinciden con las reales. **Las nuevas tareas creadas podrían ser rechazadas por Firestore.** |
| **Settings legibles públicamente** | 🟡 Media | `match /settings/{settingId} { allow read: if true; }` — los datos bancarios (RUT, nombre, cuenta) son legibles por CUALQUIERA con el userId. Intencional (para mostrar al invitado), pero sensible. |
| **Sin rate limiting en notifications** | 🟡 Media | Cualquier usuario autenticado puede crear notificaciones sin límite (línea 139 de rules: `allow create: if isValidNotification(request.resource.data)`). |
| **Task reminders crean duplicados** | 🟡 Media | El `useEffect` de reminders (líneas 1965-1983) se ejecuta en CADA snapshot de tareas pendientes, creando una notificación el mismo día. Si las tareas cambian muchas veces, se crean muchas notificaciones duplicadas del mismo recordatorio. |

---

## 6. 💡 Funcionalidades faltantes para padres reales

Estas son features que padres esperando realmente necesitan y que darían **coherencia** a la app:

1. **Contador de semanas prominente en el Dashboard** ✅ (ya existe, bien)
2. **Semana a semana: info del desarrollo del bebé** ❌ — "Tu bebé mide X cm y pesa Y gramos esta semana"
3. **Lista de citas médicas** ❌ — Ecografías, controles, exámenes
4. **Notas/Diario de embarazo** ❌ — Cómo se siente la mamá, antojos, etc.
5. **Contactos de emergencia** ❌ — Número del doctor, hospital, etc.
6. **Maleta del hospital como sub-checklist especial** — Ya existe como categoría, pero debería tener su propio espacio destacado
7. **Compartir progreso con familia cercana** ❌ — Actualmente solo se comparte la wishlist

---

## 7. 🎯 Plan de Mejoras Priorizado

### Fase 1: Fixes Críticos (urgente)
- [ ] **Fix Firestore rules**: Actualizar las categorías válidas de tasks
- [ ] **Eliminar cleanup de picsum del listener**: Ejecutarlo solo una vez, no en cada snapshot
- [ ] **Fix auto-seed duplicados**: Usar flag en perfil para evitar re-seeding
- [ ] **Fix categoría "General" en reset de new gift**

### Fase 2: Checklist Inteligente
- [ ] **Agregar indicadores de prioridad visual** (colores/iconos para High/Medium/Low)
- [ ] **Smart sort**: Agrupar por fase actual, ordenar por prioridad
- [ ] **Mostrar barra de progreso** global y por categoría
- [ ] **Indicador de tareas atrasadas** (fase anterior + no completada = rojo)
- [ ] **Calcular fechas automáticas** por fase basándose en la fecha de parto

### Fase 3: Timeline con Propósito
- [ ] **Vincular timeline con tareas reales** de la checklist
- [ ] **Mostrar fechas reales** calculadas (no solo "Semanas 1-12")
- [ ] **Agregar progreso por fase**: "3/8 tareas completadas en esta fase"
- [ ] **Agregar tips informativos** por trimestre

### Fase 4: Refactorización
- [ ] **Separar App.tsx** en componentes individuales
- [ ] **Centralizar listeners de Firestore** en un DataContext
- [ ] **Eliminar hardcode de email admin**

### Fase 5: Features para Padres
- [ ] Información semanal del desarrollo del bebé
- [ ] Lista de citas médicas
- [ ] Contactos de emergencia
- [ ] Maleta del hospital como sección especial

---

## Open Questions

> [!IMPORTANT]
> 1. **¿Quieres que implemente las mejoras por fases?** Puedo empezar con los fixes críticos (Fase 1) que son rápidos y necesarios.
> 2. **¿El público es 100% chileno?** Los precios en CLP y el RUT sugieren que sí. Esto afecta si necesitamos i18n.
> 3. **¿El Timeline debería integrar las tareas de la checklist o mantener su propio contenido informativo (tips de embarazo)?** Mi recomendación es fusionar datos + agregar info educativa.
> 4. **¿Quieres separar el monolito de App.tsx primero (Fase 4) o prefieres features funcionales primero (Fases 2-3)?**
