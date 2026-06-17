# Sprint 3 — Compliance Functionalities and Advanced Management

## Objetivo

Implementar las funcionalidades de cumplimiento avanzado de la LOPDP: configuracion de la empresa y DPO, wizard guiado de actividades de tratamiento, flujo DPIA con PDF firmado, dashboard de riesgos, ejecucion de politicas de retencion, flujo centralizado ARCO, reporte ROPA y generacion automatica de planes de accion.

## Cobertura de User Stories

| US | Descripcion | Estado |
|---|---|---|
| US-RF03-1 | Configuracion inicial empresa y DPO | Implementado |
| US-RF04-1 | Wizard guiado de Registro de Tratamiento | Implementado |
| US-RF09-1 | Flujo estructurado DPIA con PDF firmado | Implementado |
| US-RF10-1 | Calculo inmediato de score de riesgo y dashboard | Implementado |
| US-RF11-1 | Definicion, ejecucion y auditoria de politicas de retencion | Implementado |
| US-RF30-1 | Flujo centralizado ARCO para DPO | Implementado |
| US-RF31-1 | Reporte ROPA completo (JSON + PDF) | Implementado |
| US-RF43-1 | Generacion automatica de Planes de Accion desde evaluaciones de riesgo | Implementado |

## Que se implemento

### Modelos nuevos

- `app/models/dpia.py` — `DPIAssessment`: workflow DPIA en 3 pasos, firma, PDF almacenado
- `app/models/arco_request.py` — `ARCORequest`: ticket ARCO (ACCESS/RECTIFICATION/CANCELLATION/OPPOSITION), deadline automatico 30 dias
- `app/models/action_plan.py` — `ActionPlanTemplate` + `ActionPlan`: plantillas por nivel de riesgo y planes manuales/auto-generados

### Modelos extendidos

- `app/models/tenant.py` — Campos de perfil: `address`, `website`, `dpo_name`, `dpo_email`, `dpo_phone`
- `app/models/retention.py` — `RetentionExecutionLog`: audit trail de ejecuciones de politicas

### Endpoints nuevos

| Endpoint | Descripcion |
|---|---|
| `GET/PUT /api/v1/company-profile` | Perfil empresa y datos del DPO |
| `POST /api/v1/treatment-activities/wizard/start` | Paso 1: crear actividad DRAFT |
| `PATCH /api/v1/treatment-activities/wizard/{id}/legal-basis` | Paso 2: base legal |
| `PATCH /api/v1/treatment-activities/wizard/{id}/transfers` | Paso 3: transferencias |
| `POST /api/v1/treatment-activities/wizard/{id}/finalize` | Paso 4: activar (DRAFT->ACTIVE) |
| `POST/GET /api/v1/dpias` | CRUD de evaluaciones DPIA |
| `POST /api/v1/dpias/{id}/sign` | Firma DPIA y genera PDF |
| `GET /api/v1/dpias/{id}/pdf` | Descarga PDF firmado |
| `GET /api/v1/risk-assessments/dashboard` | Dashboard GREEN/YELLOW/RED con top-10 actividades de alto riesgo |
| `POST /api/v1/retention/execute` | Ejecutar politicas de retencion manualmente |
| `GET /api/v1/retention/execution-logs` | Historial de ejecuciones |
| `POST/GET /api/v1/arco` | CRUD de solicitudes ARCO |
| `PATCH /api/v1/arco/{id}` | Actualizar estado (RECEIVED->IN_REVIEW->RESPONDED/REJECTED) |
| `GET /api/v1/arco/dashboard` | Dashboard ARCO por estado y tipo |
| `GET /api/v1/ropa` | Reporte ROPA en JSON agrupado por base legal |
| `GET /api/v1/ropa/pdf` | Reporte ROPA en PDF |
| `POST /api/v1/action-plans/templates` | Crear plantilla de plan |
| `GET /api/v1/action-plans/templates` | Listar plantillas |
| `POST /api/v1/action-plans/auto-generate` | Generar planes automaticamente desde riesgos ALTO/MEDIO |
| `POST/GET /api/v1/action-plans` | CRUD planes de accion |
| `GET/PATCH /api/v1/action-plans/{id}` | Detalle y actualizacion de plan |

## Como correrlo

```bash
cd backend
rm -f test_datalegal.db
.venv/bin/pytest tests/ -v
# 186 tests passing

# Servidor dev
uvicorn app.main:app --reload --port 8000
# Swagger UI: http://localhost:8000/docs
```

## Decisiones tecnicas

- **fpdf2 Latin-1**: los fonts built-in de fpdf2 son Latin-1. Se sustituyen em-dashes y comillas tipograficas por equivalentes ASCII.
- **Rutas estaticas antes de parametrizadas**: `/dashboard`, `/wizard/start`, `/auto-generate` declarados ANTES de `/{id}` para evitar conflictos de routing en FastAPI.
- **ARCO ticket idempotente**: el numero de ticket se calcula con `COUNT(*) + 1` del tenant; formato `ARCO-YYYY-NNNNN`.
- **Auto-generate idempotente**: `POST /auto-generate` verifica que el `risk_assessment_id` no tenga plan existente antes de crear.
- **Retencion**: al ejecutar, los registros `ACTIVE` cuya fecha de vencimiento paso se marcan `UNDER_REVIEW`; se crea un `RetentionExecutionLog` por ejecucion.

## Pendientes / Carry-forward para Sprint 4

- [ ] Alembic migrations para todos los modelos (aun se usa `create_all` en dev/test)
- [ ] Notificaciones por email al DPO cuando llega nueva solicitud ARCO
- [ ] Scheduler automatico para ejecucion de politicas de retencion (actualmente solo manual)
- [ ] Frontend: paginas para DPIA, ARCO, ROPA, Action Plans, Company Profile
- [ ] Exportacion CSV de ROPA ademas de PDF
- [ ] Tests de integracion E2E con PostgreSQL real

## Riesgos

- El PDF de DPIA almacena los bytes directamente en SQLite (`BLOB`). En produccion con PostgreSQL considerar mover a object storage (S3/MinIO).
- `auto-generate` no tiene paginacion; si hay muchos risk_assessments sin plan puede ser lento.
