# Guía de diseño — DataLegal

**Versión:** 0.1 (borrador) · **Fecha:** julio 2026
**Fuente:** código real del frontend (`tailwind.config.js`, `src/index.css`, `src/components/ui/*`) y capturas del sistema corriendo en local (login, dashboard y 8 módulos: Alertas, Reportes, Perfil de organización, Actividades de tratamiento, Evaluaciones de riesgo, ARCO, Documentos legales, Planes de acción, Configuración).

Este documento adapta la estructura de una guía de diseño previa (escrita originalmente para un sistema contable) al contexto real de **DataLegal**, y consolida en un solo lugar lo que hoy están dispersos en tres documentos: [`datalegal-ui-direction.md`](./datalegal-ui-direction.md), [`datalegal-ui-audit.md`](./datalegal-ui-audit.md) y el skill [`datalegal-saas-design`](./datalegal-saas-design/SKILL.md). Esos tres documentos quedan como historial de la auditoría que originó los tokens actuales; esta guía es la referencia viva a partir de ahora.

---

## 1. Cómo usar esta guía

DataLegal es una **plataforma SaaS de cumplimiento LOPDP**, multi-tenant. Su público no es de diseño: son DPOs, administradores, jefes de departamento y auditores que entran a completar una tarea de cumplimiento concreta —registrar una actividad de tratamiento, resolver una solicitud ARCO antes de que venza el SLA, generar una ROPA— y salir. No es un sitio de marketing ni un landing page; es una herramienta operativa de auditoría y evidencia.

Reglas de lectura:

- Los **tokens** (secciones 3 a 5) están tomados directamente de `tailwind.config.js` y `src/index.css`. Si un valor no está en esas tablas, no existe en el sistema real — se propone antes de usarse.
- Los **componentes** (sección 8) documentan lo que ya está implementado en `src/components/ui/`. Es la primera opción antes de crear estilos nuevos por página.
- Cuando un patrón del sistema actual tiene un problema verificado (contraste insuficiente, texto demasiado pequeño, estado faltante), se marca explícitamente con **⚠ Hallazgo** y una recomendación. Esta guía no oculta las inconsistencias reales: las documenta para que se corrijan de forma centralizada.

---

## 2. Principios

**1. La tarea antes que la pantalla.** Cada vista responde a una pregunta operativa de cumplimiento: ¿qué está vencido?, ¿qué riesgo subió?, ¿qué solicitud ARCO necesita respuesta hoy? Si el usuario no puede identificar esto en cinco segundos, falta jerarquía.

**2. El estado manda.** Este es un producto de semáforos y plazos (SLA de ARCO, nivel de riesgo, vigencia de un documento legal). El estado de cada elemento —badge, color, icono— tiene que ser la primera señal visual, no una nota al pie.

**3. Vocabulario del usuario, no del sistema.** El usuario reconoce «ARCO», «DPIA», «actividad de tratamiento», «responsable del tratamiento». No reconoce «entidad», «tenant» (salvo para SUPER_ADMIN) ni «endpoint».

**4. Evidencia trazable.** Cada pantalla que representa una obligación legal (ROPA, DPIA, documentos legales, planes de acción) debe dejar claro qué se generó, cuándo, y en qué versión — el producto existe para poder demostrarle al regulador que algo se hizo.

**5. Sobriedad operativa.** Fondo neutro, tarjetas blancas, una sola familia de color de marca (cian/teal). El color se reserva para lo que hay que atender: estado, alerta, acción principal. Nada de heroes grandes ni degradados decorativos dentro del área autenticada (ver hallazgo 8.5 sobre las tarjetas con sombra).

---

## 3. Color

### 3.1 Escala de marca (`brand`, `tailwind.config.js`)

La escala real es una familia **cian/teal**, no azul marino. El botón primario usa `brand-700`.

| Token | Hex | Uso real |
|---|---|---|
| `brand-50` | `#ecfeff` | Fondo de chip de icono (`PageHeader`, `KPICard`), fondo de badge tono "brand" |
| `brand-100` | `#cffafe` | Borde de chip de icono |
| `brand-200` | `#a5f3fc` | Borde hover de `GlassCard`, borde de badge "brand" |
| `brand-300` | `#67e8f9` | Sin uso detectado — candidato a retirar o documentar |
| `brand-400` | `#22d3ee` | Barra decorativa superior del `BrandMark` |
| `brand-500` | `#06b6d4` | Anillo de foco global (`ring-brand-500/70` en `:focus-visible`) |
| `brand-600` | `#0891b2` | Hover del botón primario, borde de foco de inputs |
| `brand-700` | `#0e7490` | **Botón primario**, texto de enlaces/badge "brand", icono de `PageHeader`/`KPICard` |
| `brand-800` | `#155e75` | Activo/pressed del botón primario |
| `brand-900` | `#164e63` | Sin uso amplio detectado |
| `brand-950` | `#0b1220` | **Fondo del `BrandMark`** (el cuadrado "DL"), panel oscuro del login |

### 3.2 Escala de texto/superficie (`ink`, `tailwind.config.js`)

⚠ **Advertencia de nomenclatura:** esta escala está invertida respecto a la convención habitual de Tailwind — `ink-50` es el tono **más oscuro** (`#020617`) y `ink-950` es blanco puro. Documentarlo aquí para que nadie intente "aclarar" un texto subiendo el número, cuando en este sistema hay que bajarlo.

| Token | Hex | Uso real |
|---|---|---|
| `ink-50` | `#020617` | Títulos `h1`/`h2`, valor de KPI, texto de máxima jerarquía |
| `ink-100` | `#0f172a` | Cuerpo de texto por defecto (`body` en `index.css`), celdas de tabla |
| `ink-200` | `#1e293b` | Etiquetas de formulario, encabezado de tabla |
| `ink-300` | `#334155` | Descripciones bajo el `h1`, texto secundario |
| `ink-400` | `#475569` | Placeholders, hints, texto terciario |
| `ink-500`–`ink-900` | — | Grises intermedios, uso puntual |
| `ink-950` | `#ffffff` | Texto sobre fondos oscuros (`BrandMark`, panel de login) |

Superficies (`src/index.css`): fondo de app `bg-slate-50` (`#f8fafc`), tarjetas `bg-white` con `.glass-surface` (borde `rgba(15,23,42,.10)` + sombra, ver 5.3), borde general `border-slate-200` (`#e2e8f0`).

### 3.3 Colores semánticos

DataLegal tiene **dos** sistemas semánticos reales, no unificados entre sí — se documentan ambos porque ambos están en producción:

**a) Badges genéricos (`Badge.tsx`, tonos Tailwind estándar):**

| Tono | Texto | Fondo | Borde | Uso |
|---|---|---|---|---|
| `neutral` | `ink-100` | `slate-100` `#f1f5f9` | `slate-200` | Anulado, cerrado, sin clasificar |
| `brand` | `brand-700` `#0e7490` | `brand-50` | `brand-200` | Énfasis de marca (no-estado) |
| `success` | `emerald-700` `#047857` | `emerald-50` `#ecfdf5` | `emerald-200` | ACTIVE, RESOLVED, CLOSED, COMPLETED, SIGNED |
| `warning` | `amber-700` `#b45309` | `amber-50` `#fffbeb` | `amber-200` | PENDING, IN_PROGRESS, DRAFT, REVIEW, VERIFYING |
| `danger` | `rose-700` `#be123c` | `rose-50` `#fff1f2` | `rose-200` | REJECTED, FAILED, EXPIRED |
| `info` | `sky-700` `#0369a1` | `sky-50` `#f0f9ff` | `sky-200` | Estados informativos sin severidad |

**b) Riesgo (`risk`, `tailwind.config.js` — escala aparte, no pasa por `Badge`):**

| Token | Hex | Uso |
|---|---|---|
| `risk.low` | `#10b981` | Riesgo bajo |
| `risk.med` | `#f59e0b` | Riesgo medio |
| `risk.high` | `#ef4444` | Riesgo alto |
| `risk.crit` | `#b91c1c` | Riesgo crítico |

⚠ **Hallazgo:** `RiskBadge` en la práctica no usa esta escala `risk.*` — reutiliza los tonos de `Badge` (`success`/`warning`/`danger` para LOW/MEDIUM/HIGH-CRITICAL), y HIGH y CRITICAL comparten el mismo tono `danger`, por lo que en la tabla de Evaluaciones de riesgo "High risk" (20/25) no se distingue por color de un futuro "Critical" (ver captura de Evaluaciones de riesgo). **Recomendación:** dar a CRITICAL un tono propio (fondo `rose-100`/texto `rose-900` o el `risk.crit #b91c1c`) para que el semáforo de 4 niveles se vea como 4 niveles reales.

### 3.4 Contraste verificado (calculado, no estimado)

Se calculó la razón de contraste real (WCAG, luminancia relativa) de las combinaciones que aparecen en el código:

| Combinación | Ratio | Cumple |
|---|---|---|
| `ink-100` (cuerpo) sobre blanco | 17.85 | AAA |
| `ink-50` (títulos) sobre blanco | 20.17 | AAA |
| `ink-300` (descripción) sobre blanco | 10.35 | AAA |
| `ink-300` sobre `slate-50` (fondo app) | 9.90 | AAA |
| `ink-400` (hints) sobre blanco | 7.58 | AAA |
| `ink-500` (texto muted) sobre blanco | 4.76 | AA |
| Blanco sobre `brand-700` (botón primario, reposo) | 5.36 | AA |
| Blanco sobre `brand-800` (botón primario, activo) | 7.27 | AAA |
| Blanco sobre `brand-600` (botón primario, **hover**) | **3.68** | **No cumple** (normal text) |
| `brand-700` sobre `brand-50` (badge/chip "brand") | 5.15 | AA |
| `emerald-700` sobre `emerald-50` (badge éxito) | 5.21 | AA |
| `amber-700` sobre `amber-50` (badge advertencia) | 4.84 | AA |
| `rose-700` sobre `rose-50` (badge error) | 5.72 | AA |
| `sky-700` sobre `sky-50` (badge info) | 5.57 | AA |
| Blanco sobre `rose-500` (botón peligro, reposo) | 3.67 | **No cumple** |
| Blanco sobre `rose-400` (botón peligro, **hover**) | 2.69 | **No cumple** |
| Blanco sobre `rose-600` (botón peligro, activo) | 4.70 | AA (límite) |
| `rose-300` (texto de error de formulario) sobre blanco | **1.89** | **No cumple — prácticamente ilegible** |
| `rose-400` (asterisco de obligatorio) sobre blanco | 2.69 | No cumple (decorativo, tolerable) |

⚠ **Hallazgos priorizados (de mayor a menor impacto):**

1. **El mensaje de error de un campo de formulario (`FieldShell`, `text-rose-300`) tiene un contraste de 1.89:1.** Es el peor caso encontrado: un usuario con baja visión, o simplemente con un monitor mal calibrado, no puede leer por qué falló la validación. Corregir a `rose-700`/`rose-800` (≥4.5:1).
2. **El botón primario pierde contraste en `hover` (3.68:1) respecto al reposo (5.36:1) y al activo (7.27:1)** — el color se vuelve *más claro* al pasar el mouse, al revés de lo esperado. Recomendación: usar `brand-800` para hover y reservar `brand-600` para otro uso (p. ej. focus ring, que ya lo usa).
3. **El botón de peligro falla en los tres estados** (reposo 3.67, hover 2.69, activo 4.70 al límite). Recomendación: `rose-600` como reposo, `rose-700` como hover, `rose-800` como activo.

### 3.5 Color en gráficos

⚠ **Hallazgo:** no existe una paleta categórica definida. El único gráfico visto en producción (Dashboard → Trends) usa una sola línea sólida en `brand-600`/`brand-700` con relleno degradado — correcto para una serie única, pero el sistema no tiene aún una regla para cuando se necesiten 2 o más series (por ejemplo, comparar tendencias de riesgo por departamento).

**Propuesta** (derivada de los tokens ya existentes, no colores nuevos): paleta categórica de máximo 6, reutilizando lo que ya está en el sistema para no introducir una tercera familia de color:

`brand-700 (#0e7490)` · `ink-300 (#334155)` · `risk.low (#10b981)` · `risk.med (#f59e0b)` · `#7B5EA7` (púrpura, único color nuevo, solo si hace falta una 5ª serie) · `slate-300 (#cbd5e1)` para "Otros".

Reglas: toda categoría bajo 3% se agrupa en «Otros»; el color nunca es el único portador del dato (leyenda + valor siempre visibles); series de una sola variable usan `brand-700` con opacidad, como ya hace el gráfico de tendencias actual.

---

## 4. Tipografía

**Familia real (`src/index.css`):** `Aptos` / `Segoe UI Variable` (con `Aptos Display` para `h1`–`h3`), no Inter. No hay fuente monoespaciada configurada — DataLegal no maneja identificadores tipo RUC/factura que necesiten comparación columna a columna; los identificadores relevantes (número de ticket ARCO, ID de tenant) son cortos y no lo requieren hoy.

### Escala real (Tailwind, tal como se usa en los componentes)

| Token Tailwind | Tamaño / línea | Uso real observado |
|---|---|---|
| `text-3xl` | 30 / 36 | `h1` de página (`PageHeader`), valor de KPI (`KPICard`) |
| `text-lg` | 18 / 28 | `h2` de tarjeta (p. ej. "Sign in") |
| `text-base` | 16 / 24 | Título de estado vacío/error |
| `text-sm` | 14 / 20 | Cuerpo de texto, descripción bajo `h1`, celdas de tabla, inputs |
| `text-xs` | 12 / 16 | Etiquetas de formulario, encabezado de tabla, badges, etiqueta de KPI, hints |
| `text-[10px]` | 10 / — | **Encabezados de grupo del sidebar** ("OVERVIEW", "ORGANIZATION"...) |

⚠ **Hallazgo (el más visible de toda la auditoría):** el sistema actual **sí baja de 13px**, y en un punto llega a **10px** (`Sidebar.tsx`, encabezados de grupo). Es exactamente el problema que esta guía existe para prevenir hacia adelante. Además, etiquetas de formulario, badges, encabezados de tabla y etiquetas de KPI están en 12px — funcional, pero en el límite.

**Regla hacia adelante — mínimo absoluto 13px** (equivalente a `text-xs` con un ajuste, o introducir un token `text-2xs` explícito en `tailwind.config.js` si se necesita un tamaño intermedio documentado). El caso de 10px del sidebar debe subir primero, por ser el más extremo y el más usado (aparece en cada pantalla).

Otras reglas ya vigentes y correctas, mantenerlas: sentence case en botones y títulos (ver capturas: "Sign in", "Executive dashboard", "Risk assessments" — no hay texto en mayúsculas forzadas salvo siglas como ARCO, DPO, ROPA, SLA); un solo `h1` por página (`PageHeader` lo garantiza estructuralmente).

En tablas y KPIs con cifras (score de riesgo, porcentajes), activar `font-variant-numeric: tabular-nums`. ⚠ **Hallazgo:** hoy solo 3 páginas de más de 20 lo usan (`AuditLog`, `Backups`, `DPIAs`). Debería vivir en el componente `DataTable`/`KPICard`, no repetirse página por página.

---

## 5. Espaciado, radios y elevación

### 5.1 Espaciado

Base de 4px, igual que la escala por defecto de Tailwind: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Uso real observado:

| Situación | Valor |
|---|---|
| Padding interno de tarjeta (`GlassCard`) | 24px (`p-6`) |
| Padding horizontal de celda de tabla | 16px (`px-4`) |
| Padding vertical de celda de tabla | 12px (`py-3`) |
| Entre campos de formulario | 16–24px según el flujo |
| Gap entre icono y texto en botón | 8px (`md`) |
| Ancho fijo del sidebar | 288px (`w-72`) |

### 5.2 Radios

`rounded-md` (6px) es el radio por defecto real: botones, inputs, badges, chips de icono. `rounded-glass` (8px, token propio en `tailwind.config.js`) para tarjetas y paneles (`GlassCard`, `GlassPanel`). No hay uso de `rounded-full` documentado salvo el punto de color dentro de los badges.

### 5.3 Elevación

⚠ **Hallazgo:** el sistema define tres niveles de sombra en `tailwind.config.js` (`shadow-glass`, `shadow-glass-lg`, `ring`), pero **`.glass-surface` aplica sombra a toda tarjeta siempre**, no solo a modales/dropdowns — incluyendo `KPICard` y todas las `GlassCard`, que además usan borde `1px` al mismo tiempo. Esto es exactamente lo que el propio [`datalegal-ui-audit.md`](./datalegal-ui-audit.md) (hallazgo #4) señaló como "the current card style is soft and generic" y recomendó aplanar — la corrección no se aplicó todavía.

**Regla propuesta (a partir de lo que ya existe, sin inventar valores nuevos):**

- **Nivel 0** — borde `1px solid slate-200`, sin sombra: `DataTable`, filas, inputs. (Ya es así.)
- **Nivel 1** — `shadow-glass` (`0 10px 24px -18px rgba(15,23,42,.32)`): tarjetas de contenido agrupado (`GlassCard`, `KPICard`) *solo si son interactivas/hoverable*; las tarjetas estáticas de solo lectura deberían bajar a nivel 0 (borde) para no competir visualmente con las tarjetas que sí invitan a una acción.
- **Nivel 2** — `shadow-glass-lg`: modales.

---

## 6. Layout

### 6.1 Header (topbar)

A diferencia de un rail oscuro tradicional, el header real de DataLegal es **claro** (blanco, no `brand-950`):

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    [ 🔍 Search...                    ]        🔔  S ▾    │
└──────────────────────────────────────────────────────────────────────────┘
```

- Fondo blanco, sin el logo repetido (el logo vive en el sidebar, no en el topbar — diferencia real respecto a un layout con logo fijo arriba).
- Buscador centrado, placeholder "Search...".
- Notificaciones (icono campana) y menú de usuario (avatar circular con inicial + rol en texto, p. ej. "S · SUPER_ADMIN") a la derecha.
- El rol se muestra explícitamente junto al avatar — correcto para un producto multi-tenant donde el rol activo cambia el alcance de lo que se ve.

### 6.2 Sidebar

Fondo **blanco** (no oscuro), ancho fijo 288px, sin modo colapsado a solo-iconos (⚠ diferencia real: en desktop siempre se ve expandido; el colapso solo existe como drawer off-canvas en móvil). Estructura real (`Sidebar.tsx`, `navigation.ts`):

- Grupos con encabezado en mayúsculas + icono propio de 20×20 en contenedor `bg-slate-100` + chevron que rota al expandir/contraer (persistido en `localStorage`).
- Ítems como fila con un punto (`•`) de 6px como bullet, no icono — texto es la única señal de qué sección es.
- Ítem activo: fondo `brand-50`, texto `brand-800`, borde `brand-200` — reemplaza correctamente el "lavanda" que el audit anterior señaló como fuera de marca.

Los 8 grupos reales, en orden: **Overview** (Dashboard, Alerts, Reports) · **Organization** (Company profile, Users, Departments, Master catalogs, Economic sectors, Tenants) · **Data Registry** (Data inventory, Treatment activities, Information assets, Retention, Import/export) · **Risk & DPIA** (Risk assessments, DPIAs) · **Rights & Incidents** (ARCO, Portability, Incidents, Consents) · **Documents** (Legal documents, ROPA) · **Operations** (Action plans, Audit plans, Remediations) · **transversal** (Audit log, Training, Backups, Settings) — este último grupo no tiene etiqueta visible en la captura de Configuración ("SUPPORT" en pantalla parece ser este grupo con otra etiqueta de traducción).

### 6.3 Anatomía de página

Confirmada en las 8 capturas — es consistente en todas, buena señal:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Dashboard / Alerts                                     (breadcrumb)    │
├────────────────────────────────────────────────────────────────────────┤
│ [icono 36px]  Título de página              [Acción secund.][Acción 1ª]│
│               Descripción de una línea                                 │
├────────────────────────────────────────────────────────────────────────┤
│  Tabs (si aplica: Tickets / Dashboard, Plans / Templates...)            │
├────────────────────────────────────────────────────────────────────────┤
│  Tarjetas KPI (opcional)                                                │
├────────────────────────────────────────────────────────────────────────┤
│  Filtro simple (1 select + botón Refresh — no hay panel de filtros      │
│  avanzados ni chips de filtro activo)                                   │
├────────────────────────────────────────────────────────────────────────┤
│  Tabla / lista de resultados                                            │
└────────────────────────────────────────────────────────────────────────┘
```

⚠ **Hallazgo:** ninguna de las 8 pantallas muestra los filtros activos como chips removibles ni un contador de resultados ("N documentos") arriba de la tabla — a diferencia de lo que describía la guía original. Si el volumen de datos crece (tenants con cientos de actividades de tratamiento), esto se vuelve necesario.

### 6.4 Responsive

⚠ **Hallazgo:** `DataTable` solo implementa `overflow-x-auto` (scroll horizontal) para pantallas angostas. No hay una transformación a tarjetas apiladas en móvil. El propio audit anterior ya probó el dashboard en móvil (`05-dashboard-mobile.png`) y no encontró problemas de layout ahí, pero las tablas no se probaron en ese ancho.

---

## 7. Iconografía

### 7.1 Estado actual (documentado, no idealizado)

DataLegal **no usa una librería de iconos**. Todo lo que existe hoy son 5 SVG dibujados a mano en `src/components/ui/Icons.tsx`:

| Icono | Uso |
|---|---|
| `ModuleIcon` | Icono por defecto del chip de `PageHeader` cuando la página no define uno propio |
| `EmptyTableIcon` | Estado vacío de `DataTable` |
| `ChevronIcon` | Expandir/contraer grupo del sidebar |
| `CloseIcon` | Cerrar modal |
| `SidebarGroupIcon` | Un trazo distinto por cada uno de los 8 grupos del sidebar (definidos inline, sin nombres semánticos reutilizables fuera del sidebar) |

**Las acciones de las tablas son texto plano** ("Edit", "Delete", "View details", "Mark read", "Register ARCO request"...), no iconos — confirmado en las 8 capturas. Es consistente entre pantallas (buena señal: no hay mezcla de estilos), pero ocupa más ancho de columna que un botón de icono, y en tablas con muchas acciones (ARCO tiene solo "View details", pero Treatment Activities ya tiene "Next / Edit / Delete") empieza a apretar.

### 7.2 Recomendación (no un cambio ya hecho)

Si el equipo decide introducir una librería de iconos, esto es lo que se propondría — **documentado como opción, no como estándar vigente**, siguiendo la decisión de mantener el estado actual como referencia y solo señalar la mejora:

- Adoptar un set monolínea consistente con el trazo ya usado a mano en `Icons.tsx` (los SVG actuales usan `strokeWidth 1.5–1.8`, esquinas suaves) — Lucide o Phosphor (peso Regular) encajan mejor que un set más geométrico.
- Migrar primero **solo la columna de acciones de tabla** (mayor impacto, menor superficie de cambio): "Edit" → icono de lápiz + tooltip, "Delete" → icono de papelera + tooltip, resto en un menú `⋯`. Esto es exactamente el ejemplo que motivó esta guía.
- Mapa concepto → icono sugerido para el vocabulario propio de DataLegal (a definir si se adopta una librería):

| Concepto | Icono sugerido |
|---|---|
| Actividad de tratamiento | Documento con lista |
| Solicitud ARCO | Escudo con check / reloj (según SLA) |
| DPIA | Lupa sobre documento |
| Evaluación de riesgo | Escudo con signo de exclamación |
| ROPA | Documento con capas |
| Documento legal (política, contrato, aviso) | Documento con candado |
| Consentimiento | Check dentro de círculo |
| Plan de acción / remediación | Lista con check |
| Auditoría | Lupa |
| Tenant | Edificio |
| Backup | Base de datos con flecha hacia abajo |
| Capacitación (training) | Birrete/gorro académico |

- Tamaños: mantener consistencia con lo ya usado (`h-5 w-5`≈20px en `PageHeader`, `h-3.5 w-3.5`≈14px en sidebar, `h-6 w-6`≈24px en estados vacíos).

---

## 8. Componentes

Todo lo que sigue existe ya en `src/components/ui/` — se documenta tal cual, con los hallazgos de contraste de la sección 3.4 aplicados en contexto.

### 8.1 Botones (`Button.tsx`)

| Variante | Clases reales | Uso |
|---|---|---|
| `primary` | `bg-brand-700` texto blanco, hover `brand-600` ⚠, activo `brand-800` | Acción principal única por pantalla |
| `secondary` | Blanco, borde `slate-300`, texto `ink-50` | Acción secundaria |
| `ghost` | Blanco, borde `slate-200` | Acciones terciarias |
| `danger` | `bg-rose-500` ⚠, hover `rose-400` ⚠, activo `rose-600` | Eliminar, anular |
| `subtle` | `bg-slate-50`, borde `slate-200` | Acciones de baja jerarquía |

Tamaños reales: `sm` 32px, `md` 40px, `lg` 48px de alto. Loading: reemplaza el ícono izquierdo por un spinner y añade `aria-busy` — ya implementado correctamente. Foco: anillo `brand-100` con offset — ya implementado.

**Corrección pendiente (ver 3.4):** cambiar hover de `primary` a `brand-800` y renumerar los estados de `danger` (reposo `rose-600`, hover `rose-700`, activo `rose-800`) para que ningún estado interactivo caiga bajo 4.5:1.

### 8.2 Campos de formulario (`Input.tsx`, `FieldShell`)

**Ya cumple la corrección de mayor impacto de la guía original: la etiqueta va arriba, alineada a la izquierda.** No hay que cambiar nada de la estructura.

```
Company name *
┌───────────────────────────────────┐
│ DataLegal Demo                    │
└───────────────────────────────────┘
```

- Altura 40px, borde `slate-300`, foco `border-brand-600` + `ring-brand-100`.
- Obligatorio: asterisco `text-rose-400` (⚠ 2.69:1 — tolerable por ser decorativo y redundante con el atributo `required`, pero conviene subir a `rose-600` de todas formas ya que en algunas pantallas es la única marca visual).
- **Corrección obligatoria:** el mensaje de error (`text-rose-300`, 1.89:1) debe subir a `rose-700` u `rose-800` — ver 3.4, hallazgo #1.
- Deshabilitado: `disabled:opacity-60` + fondo `slate-50` — ya implementado.

### 8.3 Filtros

Estado real observado: un único `<select>` o par de selects + botón "Refresh", sin panel colapsable, sin chips de filtro activo, sin buscador dedicado por tabla (el buscador global vive solo en el topbar). Es funcional pero mínimo comparado con el resto del sistema. No hay una regla escrita hoy — se propone: mantenerlo simple mientras el volumen de datos por tenant sea bajo (decenas, no miles de registros), y solo introducir chips + colapsable cuando una tabla real necesite más de 2 filtros simultáneos.

### 8.4 Tablas (`DataTable.tsx`)

- Encabezado `bg-slate-50/90`, texto `text-xs uppercase tracking-wide ink-200` — **no es `sticky`** (⚠, a diferencia de lo deseable en tablas largas como Audit log).
- Filas sin altura fija (`py-3` por celda), separador `divide-slate-100`, hover `slate-50/80`.
- Alineación: por columna vía prop `align`, ya soportado — falta que cada página lo use consistentemente para importes/números.
- Sin densidad configurable, sin selección múltiple, sin paginación visible en el componente (algunas pantallas muestran pocos registros y no la necesitan aún; Treatment Activities con 5 filas no la ejercita).
- Estados de carga/vacío/error **ya delegados** a `LoadingState`/`EmptyState`/`ErrorState` — buen patrón, evita que cada página reinvente el estado vacío.
- Columna de acciones: texto plano (ver sección 7.1), alineación no siempre a la derecha en las capturas (en Treatment Activities "Actions" queda al final pero mezclada con una columna "Next" que rompe el patrón — revisar caso por caso).

### 8.5 Tarjetas de indicador — KPI (`KPICard.tsx`)

Estructura ya correcta y completa: etiqueta (`text-xs uppercase ink-300`) → valor (`text-3xl ink-50`, con skeleton de carga) → tendencia (`+`/`-`/`=` con color semántico) → chip de icono `brand-50`/`brand-700` a la derecha. Es el componente mejor resuelto del sistema actual — no requiere cambios, solo aplicar la corrección de sombra de 5.3 si se decide aplanar tarjetas de solo lectura.

### 8.6 Badges de estado (`Badge.tsx`, `StatusBadge`, `RiskBadge`)

Ver 3.3 para la tabla completa de tonos. Punto de color de 6px + texto, `rounded-md`, `px-2 py-0.5`, `text-xs font-semibold` (12px — en el límite, ver hallazgo de sección 4). `StatusBadge` mapea automáticamente cualquier string de estado del backend a un tono — es un patrón sólido porque no depende de que cada página mantenga su propio mapa de colores.

### 8.7 Modales (`Modal.tsx`)

No se navegó a un modal durante la captura de pantallas de esta sesión — pendiente de verificar contra el código si hace falta documentarlo con el mismo nivel de detalle. El [`datalegal-ui-audit.md`](./datalegal-ui-audit.md) (hallazgo #6) ya señaló "thick purple outline and heavy page blur" en el modal de tenants como pendiente de revisar; no hay evidencia en este documento de que se haya corregido.

### 8.8 Tabs (`Tabs.tsx`)

Vistos en Reports ("KPIs / Trends / Consolidated summary"), Risk assessments ("Assessments / Dashboard") y Action plans ("Plans / Templates"). No se inspeccionó el componente en detalle; visualmente consistente con subrayado en la pestaña activa en todas las capturas.

---

## 9. Estados

Ya implementados como componentes compartidos (`states.tsx`), lo cual es una fortaleza real del sistema — **no hay que inventarlos, ya existen y están en uso**:

- **Carga:** `LoadingState` (spinner + texto) o `Skeleton` (bloques grises con shimmer) para listas — DataLegal usa skeleton en `KPICard`, spinner en tablas vía `rows` prop.
- **Vacío:** `EmptyState` — icono 48px en chip `brand-50`, título, descripción, acción opcional.
- **Error:** `ErrorState` — tarjeta `rose-50` con borde `rose-200`, título y descripción por defecto en inglés ("Something went wrong" / "We could not complete that request").

⚠ **Hallazgo:** no existe un estado **"sin permiso"** compartido (no se encontró ningún componente ni texto tipo "Forbidden"/"no access" en el código). Con roles como `DEPT_HEAD` o `AUDITOR` que ven un subconjunto de módulos, alguien que reciba un enlace directo a una ruta fuera de su rol probablemente vea una pantalla vacía o un error genérico en vez de una explicación clara de a quién pedir acceso. Se recomienda un cuarto componente `ForbiddenState` con la misma forma que `ErrorState`.

---

## 10. Formato de datos

Reglas observadas directamente en las capturas (no inventadas):

| Dato | Formato real | Ejemplo visto |
|---|---|---|
| Fecha | `Mmm dd, aaaa` (en-US) | `Jul 26, 2026` |
| Fecha y hora | `Mmm dd, aaaa, HH:MM AM/PM` | `Jul 26, 2026, 08:28 PM` |
| Fecha relativa | Se muestra **junto con** la fecha exacta en la misma línea (no en tooltip) | `in 5 hours` + `Jul 26, 2026, 08:28 PM` |
| Score de riesgo | `x/25` con el detalle de factores | `20/25` · `4 × 5` |
| Porcentaje | Sin decimales en KPI, con 1 en detalle de reporte | `80%` (dashboard) / `80.0%` (reports) |
| Estado de SLA (ARCO) | Texto + color, en días | `Overdue by 3 day(s)` / `10 day(s) remaining` / `Closed on time` |
| Identificador de ticket | Prefijo + año + secuencial | `ARCO-2026-002` |
| Nombres de organización/persona | Como están registrados, sin mayúsculas forzadas | `DataLegal Demo`, `Camila Andrade` |

⚠ **Inconsistencia real:** el mismo KPI ("Activities registered"/"Activities active") se muestra como `80%` en el Dashboard y `80.0%` en Reports — un decimal de diferencia entre dos vistas del mismo dato. Unificar a un solo formato (se recomienda 1 decimal siempre, ya que "Average risk score" ya usa `13.4`/`13.40` con esa inconsistencia también presente entre las dos pantallas).

No hay manejo de moneda en el producto (no es un sistema de facturación) — si en el futuro se añaden costos de remediación o multas estimadas, definir el formato en ese momento; no inventarlo ahora sin un caso real.

---

## 11. Lenguaje y accesibilidad

### 11.1 Idioma

⚠ **Diferencia fundamental respecto a una guía en español:** la UI de DataLegal está **100% en inglés hoy**. La propia pantalla de Configuración lo declara: *"Interface language: English (en-US) — English is the MVP locale. Additional locales arrive after launch."* Solo existe `src/i18n/en.json`. Esta guía no impone tuteo ni reglas de español porque el producto, tal como está, no las usa todavía. Cuando se añada español (`es.json`), esta sección debe actualizarse con las reglas de tono (tú/usted, sentence case, microcopy) — no antes, para no documentar una decisión que nadie tomó.

Mientras tanto, mantener en inglés: sentence case consistente (ya se cumple: "Executive dashboard", "Risk assessments", nunca "Risk Assessments" con mayúscula en cada palabra salvo siglas ARCO/DPO/ROPA/SLA), y el verbo del resultado en los botones ("Sign in", "Save changes", "Register ARCO request").

### 11.2 Glosario y ayuda contextual

⚠ **Hallazgo:** no se observó ningún icono de ayuda contextual (tipo "info") junto a términos técnicos en las 8 capturas. Para una plataforma de cumplimiento legal, términos como ARCO, DPIA, ROPA, SLA, "legal basis" (CONTRACT/LEGAL_OBLIGATION/LEGITIMATE_INTEREST/CONSENT, vistos en Treatment Activities) son exactamente el tipo de vocabulario que un jefe de departamento sin formación legal necesita que se le explique en el punto donde aparece. Se recomienda el mismo patrón que la guía original proponía: icono de ayuda con definición de una frase, más un glosario centralizado accesible desde el menú de ayuda del topbar (que ya existe como icono, aunque no se verificó su contenido).

Glosario mínimo a cubrir: ARCO (Acceso, Rectificación, Cancelación, Oposición) · DPIA · ROPA · Legal basis (Contract / Legal obligation / Legitimate interest / Consent) · DPO · SLA · Retention · Cross-border transfer · Tenant.

### 11.3 Accesibilidad (objetivo WCAG 2.1 AA)

Lo que ya funciona bien y no requiere cambio:

- **Foco visible global:** `*:focus-visible { ring-2 ring-brand-500/70 ring-offset-2 }` en `index.css` — aplicado universalmente, sin necesidad de que cada componente lo repita. Cumple el principio de "nunca `outline: none`" sin que nadie tenga que acordarse.
- `<label>` asociado a cada input vía `useId()` en `FieldShell` — ya resuelto a nivel de componente.

Lo que hay que corregir (repetido de secciones anteriores, listado aquí para el checklist de accesibilidad):

- Contraste del texto de error de formulario (`rose-300` → subir, sección 3.4/8.2).
- Contraste de los estados hover de los botones `primary` y `danger` (sección 3.4/8.1).
- Texto de 10px en encabezados de sidebar (sección 4).
- Falta un estado "sin permiso" con mensaje explícito (sección 9).
- No se verificó `aria-live` en las validaciones de formulario ni `scope` en encabezados de tabla — pendiente de auditar directamente en el código de cada página (fuera del alcance de lo que se puede confirmar solo con capturas).

### 11.4 Responsive

Confirmado en el audit anterior: el dashboard en móvil (`375–428px`) funciona sin overlap. Pendiente de verificar (ver 6.4): tablas anchas en móvil, formularios largos (Treatment Activities wizard, DPIA) en pantallas angostas.

---

## 12. Checklist antes de publicar una pantalla

- [ ] Todos los colores, tamaños y espacios salen de las tablas de las secciones 3–5 — si un valor no está ahí, se propone antes de usarse.
- [ ] Ningún texto por debajo de 13px (el sidebar hoy tiene 10px — no repetir ese patrón en pantallas nuevas).
- [ ] Una sola acción primaria por pantalla, con el verbo del resultado ("Register ARCO request", no "Submit").
- [ ] Los cinco estados existen: carga, vacío, error, y — si la pantalla depende de rol — sin permiso.
- [ ] Los botones interactivos (hover/activo) mantienen ≥4.5:1 de contraste con su fondo — verificar con la tabla de 3.4 antes de introducir un nuevo tono.
- [ ] Badges de estado usan `StatusBadge`/`RiskBadge`, no colores sueltos por página.
- [ ] Fechas en formato `Mmm dd, aaaa` (en-US), consistente con el resto del producto.
- [ ] Porcentajes con la misma cantidad de decimales que el resto de KPIs equivalentes (ver hallazgo de sección 10).
- [ ] Revisado en al menos 375px (móvil) y 1440px (escritorio).
- [ ] Términos de LOPDP (ARCO, DPIA, ROPA, legal basis...) tienen ayuda contextual si la pantalla los introduce por primera vez.

---

## 13. Anexo: tokens CSS (valores reales)

```css
:root {
  /* Marca (cian/teal) — tailwind.config.js */
  --brand-50:  #ecfeff;
  --brand-100: #cffafe;
  --brand-200: #a5f3fc;
  --brand-300: #67e8f9;
  --brand-400: #22d3ee;
  --brand-500: #06b6d4;
  --brand-600: #0891b2;
  --brand-700: #0e7490; /* botón primario */
  --brand-800: #155e75; /* activo/pressed — recomendado también como hover corregido */
  --brand-900: #164e63;
  --brand-950: #0b1220; /* fondo del BrandMark */

  /* Texto/superficie (ink — escala invertida, ver 3.2) */
  --ink-50:  #020617; /* títulos */
  --ink-100: #0f172a; /* cuerpo */
  --ink-200: #1e293b; /* etiquetas */
  --ink-300: #334155; /* descripciones */
  --ink-400: #475569; /* hints */
  --ink-950: #ffffff; /* texto sobre fondo oscuro */

  --bg: #f8fafc;       /* slate-50 */
  --surface: #ffffff;
  --border: #e2e8f0;   /* slate-200 */
  --border-strong: #cbd5e1; /* slate-300 */

  /* Riesgo */
  --risk-low:  #10b981;
  --risk-med:  #f59e0b;
  --risk-high: #ef4444;
  --risk-crit: #b91c1c;

  /* Badges (tonos Tailwind estándar, ya en uso) */
  --success: #047857;  --success-bg: #ecfdf5;  --success-border: #a7f3d0;
  --warning: #b45309;  --warning-bg: #fffbeb;  --warning-border: #fde68a;
  --danger:  #be123c;  --danger-bg:  #fff1f2;  --danger-border:  #fecdd3;
  --info:    #0369a1;  --info-bg:    #f0f9ff;  --info-border:    #bae6fd;

  /* Danger — estados corregidos recomendados (ver 3.4) */
  --danger-btn-rest:   #e11d48; /* rose-600 */
  --danger-btn-hover:  #be123c; /* rose-700 */
  --danger-btn-active: #9f1239; /* rose-800 */

  /* Tipografía */
  --font-ui: 'Aptos', 'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Aptos Display', 'Segoe UI Variable Display', var(--font-ui);

  /* Radios */
  --radius-md: 6px;    /* rounded-md — default real */
  --radius-glass: 8px; /* rounded-glass — tarjetas */

  /* Elevación */
  --shadow-glass:    0 10px 24px -18px rgba(15, 23, 42, 0.32);
  --shadow-glass-lg: 0 24px 54px -34px rgba(11, 18, 32, 0.38);
  --ring-default:    0 0 0 1px rgba(15, 23, 42, 0.08);

  /* Estructura */
  --sidebar-w: 288px; /* w-72 */
  --focus-ring: 0 0 0 2px rgba(6, 182, 212, 0.7); /* brand-500/70, ya global */
}
```

---

## 14. Hallazgos respecto al estado actual (resumen)

A diferencia de una lista de "cambios propuestos" sobre un sistema hipotético, esto es lo que se **verificó en el código y las capturas reales** de esta sesión, ordenado por impacto:

1. **Texto de error de formulario casi ilegible** (`rose-300`, contraste 1.89:1) — el hallazgo de mayor severidad, sección 3.4/8.2.
2. **El botón primario y el botón de peligro pierden contraste en `hover`** en vez de ganarlo — sección 3.4/8.1.
3. **Encabezados de grupo del sidebar en 10px** — el mismo problema que motivó el "mínimo 13px" de la guía original, aquí verificado en el código, no supuesto — sección 4.
4. **`RiskBadge` no distingue HIGH de CRITICAL** (mismo tono `danger` para ambos) — sección 3.3.
5. **Las tarjetas (`GlassCard`/`KPICard`) siempre llevan sombra**, contradiciendo la recomendación ya escrita en `datalegal-ui-audit.md` de aplanarlas — sección 5.3.
6. **No hay un estado "sin permiso"** compartido para rutas fuera del rol del usuario — sección 9.
7. **Inconsistencia de decimales** en el mismo KPI mostrado en dos pantallas distintas (`80%` vs `80.0%`) — sección 10.
8. **`DataTable` no tiene encabezado `sticky`**, ni transformación a tarjetas en móvil, solo scroll horizontal — secciones 6.4/8.4.
9. **No hay paleta categórica de gráficos definida** más allá de la serie única del dashboard — sección 3.5.
10. **Acciones de tabla son texto plano**, sin iconos ni menú de "más acciones" — consistente entre pantallas, pero documentado como oportunidad, no como error — sección 7.
11. **No hay filtros activos visibles como chips**, ni contador de resultados sobre la tabla — sección 6.3.
12. Este documento reemplaza como referencia viva la dispersión entre `datalegal-ui-direction.md`, `datalegal-ui-audit.md` y el skill `datalegal-saas-design` — esos tres quedan como historial de por qué la paleta pasó de "índigo/púrpura genérico" a cian/teal.

---

## 15. Pendientes

- Corregir los 3 hallazgos de contraste de la sección 3.4/14 (son los únicos que afectan accesibilidad real, no solo estética).
- Definir si se introduce una librería de iconos (sección 7.2) o se sigue ampliando el set dibujado a mano.
- Decidir si el sidebar necesita modo colapsado a iconos en desktop (hoy no existe).
- Fecha de lanzamiento de `es.json` y, con ella, las reglas de tono en español (tuteo/usted) — no documentar hasta que exista la decisión de producto.
- Definir el componente `ForbiddenState` (sección 9) y dónde se dispara (guard de ruta vs. respuesta 403 del backend).
- Auditar `Modal.tsx` con el mismo nivel de detalle que el resto de componentes (no se navegó a un modal en esta sesión — ver hallazgo #6 de `datalegal-ui-audit.md`, no confirmado como resuelto).
- Definir paleta categórica de gráficos (sección 3.5) el día que un segundo gráfico con más de una serie entre a producción.
- Biblioteca de componentes versionada (Figma u otro) sincronizada con `src/components/ui/` — hoy el código es la única fuente de verdad, lo cual es aceptable en esta etapa pero no escala si el equipo de diseño crece.
