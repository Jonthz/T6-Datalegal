# DataLegal Design Implementation Plan

## Estado

- Estado actual: fases 1 y 2 implementadas; QA automatizado aprobado; QA visual local con Playwright aprobado.
- Fuente principal: `docs/guia-de-diseno-datalegal.md`.
- Contexto historico: `docs/design/datalegal-ui-audit.md` y `docs/design/datalegal-ui-direction.md`.
- Alcance: frontend visual y componentes compartidos. No tocar backend, rutas, permisos, endpoints ni contratos de datos.

## Diagnostico

DataLegal ya tiene una estructura consistente de ERP SaaS: shell autenticado, sidebar agrupado, tablas reutilizables, KPIs, badges y modales. La deuda principal esta en detalles que afectan operacion y accesibilidad:

- Acciones repetidas en tablas usan texto y consumen ancho visual.
- Algunos contrastes no cumplen AA: errores de formulario, hover primario y danger.
- El sidebar usa texto de 10px en grupos y badges pequenos.
- `HIGH` y `CRITICAL` no se distinguen visualmente.
- Las superficies estaticas tienen sombra permanente, lo que se siente mas SaaS generico que ERP operativo.
- Falta un estado compartido para accesos sin permiso.

## Principios De Implementacion

- Mantener acciones principales con texto: crear, registrar, guardar, exportar reporte.
- Usar iconos solo para acciones repetidas o compactas, especialmente en columnas `Actions`.
- Cada boton de icono debe tener `aria-label`, tooltip y estado disabled/loading.
- Priorizar estados legales, SLA y riesgo sobre decoracion.
- Mantener tablas densas, legibles y con encabezados claros.
- No cambiar logica de datos, submit, delete, download, verify, permisos ni navegacion.

## Fases

### Fase 1 - Base Compartida

- [x] Agregar `lucide-react`.
- [x] Crear `IconButton`.
- [x] Corregir contraste de `Button`, `Input` y danger states.
- [x] Ajustar `RiskBadge` para diferenciar `CRITICAL`.
- [x] Mejorar `DataTable`: encabezado sticky, numeros tabulares, columna de acciones consistente.
- [x] Agregar render movil tipo tarjeta en `DataTable` para evitar tablas truncadas en 375px.
- [x] Agregar `ForbiddenState`.
- [x] Conectar `ForbiddenState` al guard de rutas cuando el rol no tiene acceso.
- [x] Reducir sombra permanente de `.glass-surface`.

### Fase 2 - Pantallas Prioritarias

- [x] Migrar acciones de tabla a iconos en Users.
- [x] Migrar acciones de tabla a iconos en Legal Documents.
- [x] Migrar acciones de tabla a iconos en Risk Assessments.
- [x] Migrar acciones de tabla a iconos en ARCO.
- [x] Migrar acciones de tabla a iconos en Action Plans.
- [x] Migrar acciones de tabla a iconos en Backups.
- [x] Mantener Audit Log sin acciones de fila; solo validar densidad de tabla y export principal con texto.

### Fase 3 - QA Visual Y Accesibilidad

- [x] Ejecutar `npm run lint`.
- [x] Ejecutar `npm run build`.
- [x] Revisar con Playwright local desktop 1440px y mobile 390px usando API mockeada:
  - Login.
  - Dashboard.
  - Users.
  - Legal Documents.
  - Risk Assessments.
  - ARCO.
  - Action Plans.
  - Backups.

### Fase 4 - Iconografia Basada En Figma Contifico

- [x] Analizar el frame de Figma `Contifico | Online` como referencia de ERP compacto.
- [x] Documentar la auditoria en `docs/design/datalegal-iconification-audit.md`.
- [x] Ampliar `IconButton` con variante `primary` y tamano `md`.
- [x] Reemplazar puntos del sidebar por iconos semanticos de modulo.
- [x] Convertir acciones de toolbar/header a iconos en Dashboard, Legal Documents, Audit Log, Reports, ROPA, Backups, ARCO, Risk Assessments, Action Plans, Audit Plans, Catalogs, Treatment Activities, Information Assets, Departments y Remediations.
- [x] Convertir acciones repetidas adicionales en tablas de Audit Plans, Catalogs, Treatment Activities, Information Assets, Departments y Remediations.
- [x] Tercera ola implementada: Training, Consents, Incidents, Portability, DPIAs, Retention, Alerts y DataInventory.
- [x] QA visual v2 generado en `docs/design/screenshots-local/v2/`.

### Fase 5 - Rail ERP, Marca Y Acciones Agrupadas

- [x] Agregar modo colapsado de sidebar en desktop con persistencia `datalegal.sidebar.collapsed`.
- [x] Mantener el drawer movil expandido para no romper navegacion en pantallas pequenas.
- [x] Renderizar el sidebar colapsado como rail plano de iconos con tooltips y separadores por grupo.
- [x] Reducir el activo del sidebar a fondo/borde sutil sin sombra permanente.
- [x] Simplificar `DataLegalWordmark`: sin simbolo decorativo final, sin letter spacing negativo y con acento cyan discreto.
- [x] Convertir quick actions del dashboard en tiles operativos con iconos.
- [x] Crear `ActionMenu` reutilizable con cierre por Escape/click externo, roles ARIA, items disabled/loading y trigger `MoreHorizontal`.
- [x] Aplicar `ActionMenu` en Incidents: editar visible; notificar, cerrar y descargar en menu secundario.
- [x] Ejecutar `npm run lint`.
- [x] Ejecutar `npm run build`.
- [x] Generar QA visual v3 en `docs/design/screenshots-local/v3/`.

## Checklist QA

- [x] No hay texto explicito menor a 13px y `text-xs` se normalizo a 13px.
- [x] Acciones de tabla tienen tooltip y `aria-label`.
- [x] Acciones primarias conservan texto.
- [x] `HIGH` y `CRITICAL` se distinguen visualmente.
- [x] Botones primarios y danger mantienen contraste AA en hover/active.
- [x] Errores de formulario son legibles.
- [x] Tablas conservan `scope="col"` y no cambian datos/columnas.
- [x] No hay cambios funcionales intencionales en create, edit, delete, download, verify ni navegacion.
- [x] QA visual local con Playwright: sin errores de consola ni overflow horizontal detectado.
- [x] Segunda ola de iconografia: `npm run lint` y `npm run build` pasaron.
- [x] Tercera ola de iconografia: `npm run lint` y `npm run build` pasaron.
- [x] Screenshots v2: 16 capturas desktop/mobile, sin errores de consola ni overflow horizontal detectado.
- [x] Fase 5: `npm run lint` y `npm run build` pasaron.
- [x] Fase 5: validar sidebar expandido/colapsado, quick actions y menu de Incidents con Playwright local.

## Evidencia De QA Visual Local

- Capturas generadas en `docs/design/screenshots-local/` (ignorado por git).
- Capturas de la tercera ola generadas en `docs/design/screenshots-local/v2/` (ignorado por git).
- Capturas de la fase 5 generadas en `docs/design/screenshots-local/v3/` (ignorado por git).
- `summary.json` generado con checks de overflow y botones.
- Ajustes derivados del QA:
  - `IconButton` danger paso de rojo solido a estado sutil para tablas.
  - `DataTable` ahora renderiza tarjetas en movil con acciones visibles.
  - Fase 5: capturas V3 generadas en `docs/design/screenshots-local/v3/` usando Chrome local y API mockeada.

## Recuperacion Si Se Corta

Continuar desde este archivo. Verificar `git status --short`, revisar los archivos tocados y ejecutar `npm run lint` y `npm run build` antes de cerrar. Si una pantalla quedo a medias, priorizar terminar el reemplazo de botones de texto por `IconButton` sin modificar handlers existentes.
