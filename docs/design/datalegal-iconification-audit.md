# Auditoria de iconografia DataLegal

Fecha: 2026-08-05

## Referencias

- Guia base: `docs/guia-de-diseno-datalegal.md`
- Figma de referencia: Contifico, frame `Contifico | Online` (`1:338`)

## Lectura del Figma

Contifico usa un patron ERP compacto:

- Sidebar tipo rail: ancho cercano a 64px, iconos como primer elemento de reconocimiento, texto secundario o contextual.
- Header superior con controles de alta frecuencia compactos: selector de empresa, accesos rapidos, perfil.
- Area principal clara y sobria: superficies blancas, bordes finos, radios pequenos, poca sombra.
- Accesos directos como tiles iconograficos: icono grande, etiqueta breve.
- No todos los botones son icon-only: acciones de formulario como actualizar, habilitar, guardar o cancelar conservan texto cuando la accion puede tener consecuencia o requiere precision.

## Regla aplicada

Convertir a icono:

- Acciones repetidas en tablas: editar, eliminar, ver, verificar, descargar.
- Toolbars de pagina: refrescar, exportar, crear rapido, generar/auto-generar.
- Acciones compactas dentro de tarjetas/listas cuando el contexto ya nombra el objeto.

Conservar texto:

- Submit de formularios y modales: guardar, guardar cambios, cancelar, cerrar.
- Acciones destructivas de confirmacion o flujo sensible cuando aparecen fuera de una tabla.
- Pasos de wizard: anterior, siguiente, finalizar.
- Empty states, porque el texto explica la accion cuando no hay contexto de tabla.

## Cambios implementados en esta fase

- `IconButton` ahora soporta variantes `primary`, `secondary`, `ghost`, `danger`, `subtle` y tamanos `sm`/`md`.
- Sidebar:
  - Se reemplazo el punto decorativo de cada ruta por iconos semanticos de `lucide-react`.
  - Se mantuvo el texto de navegacion para no reducir orientacion en una aplicacion con muchos modulos.
- Headers y toolbars convertidos a iconos:
  - Dashboard: exportar PDF/CSV.
  - Legal Documents: crear documento, refrescar plantillas, refrescar documentos.
  - Audit Log: refrescar, exportar CSV.
  - Reports: refrescar, exportar CSV, exportar PDF.
  - ROPA: refrescar, descargar PDF.
  - Backups: refrescar, crear backup.
  - ARCO: refrescar, crear solicitud.
  - Risk Assessments: refrescar, crear evaluacion.
  - Action Plans: refrescar, auto-generar, crear plan; crear plantilla en el tab correspondiente.
  - Audit Plans: crear plan, refrescar.
  - Catalogs: carga masiva, limpiar/refrescar filtro.
  - Treatment Activities: crear actividad, refrescar.
  - Information Assets: crear activo, refrescar.
  - Departments: crear departamento.
  - Remediations: crear remediacion, refrescar.
- Tablas convertidas o reforzadas:
  - Usuarios: eliminar.
  - Documentos legales: descargar.
  - Evaluaciones de riesgo: editar.
  - ARCO: ver detalle.
  - Planes de accion: editar y eliminar tareas.
  - Backups: verificar.
  - Auditorias: ver hallazgos, editar, descargar reporte; editar hallazgo.
  - Catalogos: editar, eliminar.
  - Actividades de tratamiento: continuar wizard, editar, eliminar.
  - Activos de informacion: editar, eliminar.
  - Departamentos: editar, eliminar.
  - Remediaciones: editar.

## Pendiente recomendado

- Revisar screenshots de la fase v3 en `docs/design/screenshots-local/v3/`.
- Crear una matriz visual de iconos por accion para evitar iconos duplicados con significados distintos.

## Cambios implementados en tercera ola

- Alerts:
  - Refrescar y crear alerta pasaron a iconos.
  - Marcar como leida y eliminar pasaron a iconos en la lista.
- Data Inventory:
  - Refrescar paso a icono.
- DPIAs:
  - Refrescar, crear, editar, firmar y descargar pasaron a iconos.
- Portability:
  - Refrescar, crear, completar y exportar pasaron a iconos.
- Incidents:
  - Refrescar, crear, editar, notificar, cerrar y descargar reporte pasaron a iconos.
- Consents:
  - Refrescar, crear registro, crear banner, revocar registro y activar/desactivar banner pasaron a iconos.
- Retention:
  - Refrescar, crear politica, editar politica, revisar vencidos y ejecutar retencion pasaron a iconos.
- Training:
  - Crear programa/modulo/material, editar programa/modulo, refrescar inscripciones y crear inscripcion pasaron a iconos.

## QA requerido

- [x] `npm run lint`
- [x] `npm run build`
- [x] Screenshot desktop 1440px y mobile 375px en:
  - Dashboard
  - Legal Documents
  - Users
  - Audit Log
  - Reports
  - Treatment Activities
  - Catalogs
- Verificar:
  - [x] Todo `IconButton` tiene `aria-label` y tooltip.
  - [x] No hay overflow horizontal en 375px.
  - [x] Los botones de submit/cancel siguen con texto.
  - [x] Las acciones destructivas en tabla siguen pidiendo confirmacion cuando ya la tenian.

## Evidencia v2

- Carpeta: `docs/design/screenshots-local/v2/`
- Capturas: 16 archivos PNG, desktop 1440px y mobile 375px.
- Resumen automatico: `docs/design/screenshots-local/v2/summary.json`
- Resultado: sin errores de consola y sin overflow horizontal detectado en Alerts, Data Inventory, DPIAs, Portability, Incidents, Consents, Retention y Training.

## Cambios implementados en fase v3

- Sidebar:
  - Se agrego modo colapsado real en desktop con persistencia `datalegal.sidebar.collapsed`.
  - El modo colapsado usa rail de iconos plano para que todos los modulos visibles sigan navegables.
  - El drawer movil conserva el sidebar expandido.
  - El activo visual baja intensidad: fondo y borde sutil, sin sombra permanente.
- Marca:
  - `DataLegalWordmark` se simplifico, eliminando el simbolo decorativo final.
  - Se removio letter spacing negativo y se mantuvo un acento cyan discreto bajo `Legal`.
- Dashboard:
  - Quick actions pasaron de enlaces textuales a tiles compactos con icono y affordance visual.
- Incidents:
  - Se creo `ActionMenu` para agrupar acciones secundarias.
  - Editar queda visible; notificar, cerrar y descargar reporte pasan al menu de mas acciones.

## QA requerido v3

- [x] `npm run lint`
- [x] `npm run build`
- [x] Screenshot desktop 1440px y mobile 375px en Dashboard.
- [x] Screenshot desktop 1440px y mobile 375px en Incidents.
- [x] Screenshot desktop 1440px con sidebar colapsado.
- Verificar:
  - [x] La busqueda del topbar sigue visible.
  - [x] El sidebar colapsado muestra todos los modulos visibles como iconos navegables.
  - [x] El estado colapsado se aplica desde `localStorage` al recargar la ruta.
  - [x] El menu de Incidents abre acciones secundarias sin errores de consola.

## Evidencia v3

- Carpeta: `docs/design/screenshots-local/v3/`
- Capturas: dashboard expandido desktop, dashboard colapsado desktop, dashboard mobile, incidents con menu desktop e incidents mobile.
- Resumen automatico: `docs/design/screenshots-local/v3/summary.json`
- Resultado: sin errores de consola y sin overflow horizontal detectado en el check automatizado.
