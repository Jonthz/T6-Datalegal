# Sprint 5 — Operations, Reports, and Dashboards

> Branch: `sprint/05-operations-reports` — branched from `sprint/04-auditing-docs`

## Objetivo

Completar el MVP con visibilidad estratégica y resiliencia operacional:
- Dashboards ejecutivos con KPIs
- Reportes exportables (PDF / CSV)
- Notificaciones operacionales para eventos críticos
- Sistema de backups con RPO/RTO definidos
- Import/Export masivo estándar

---

## User Stories implementadas

| US | Título | Estado |
|----|--------|--------|
| US-RF06-1 | Consent registration and revocation | ✅ Completo |
| US-RF07-1 | Comprehensive management with legal SLA | ✅ Completo |
| US-RF15-1 | Filterable reports to PDF/CSV | ✅ Completo |
| US-RF16-1 | KPIs, trends, and alerts with performance | ✅ Completo |
| US-RF18-1 | Internal alerts for critical events | ✅ Completo |
| US-RF21-1 | Standard Import/Export | ✅ Completo |
| US-RF23-1 | Daily backups with RPO/RTO | ✅ Completo |

---

## Qué se hizo

### US-RF06-1: Consent stats endpoint
- `GET /api/v1/consents/stats` — retorna total, activos, revocados, tasa de revocación, breakdown por base legal y por actividad de tratamiento.

### US-RF07-1: ARCO SLA tracking + auto-alert
- `GET /api/v1/arco-requests/{id}/sla-status` — semáforo SLA: GREEN (>7 días), YELLOW (1–7 días), RED (vencido), GREY (estado terminal).
- Al crear un ticket ARCO, se genera automáticamente una alerta broadcast a DPOs del tenant (≤1 min, criterio de aceptación).

### US-RF15-1: Reports PDF/CSV export
- `GET /api/v1/reports/summary/pdf` — descarga PDF con resumen consolidado (fpdf2).
- `GET /api/v1/reports/summary/csv` — descarga CSV con las mismas métricas.

### US-RF16-1: KPIs + tendencias 6 meses
- `GET /api/v1/reports/kpis` — retorna: % actividades activas, score promedio de riesgo, % ARCO respondidos on-time, incidentes críticos, alertas urgentes (ARCO vencidos, hallazgos CRITICAL, RA de alto riesgo).
- `GET /api/v1/reports/trends?months=N` — desglose mensual (default 6): nuevas actividades, incidentes, solicitudes ARCO, consentimientos, evaluaciones de riesgo.

### US-RF18-1: Alertas internas para eventos críticos
- Modelo `Alert` (TenantBase) + schema + CRUD completo.
- `GET /api/v1/alerts` — lista alertas; DPO/Admin ve todas, otros solo las propias + broadcasts.
- `GET /api/v1/alerts/unread-count` — contador para badge de UI.
- `POST /api/v1/alerts` — crear alerta manual.
- `PATCH /api/v1/alerts/{id}/read` — marcar como leída.
- `DELETE /api/v1/alerts/{id}` — eliminar alerta.
- Auto-alertas: incidentes HIGH/CRITICAL auto-generan una alerta broadcast al crearse.

### US-RF21-1: Standard Import/Export
- `POST /api/v1/import/treatment-activities` — bulk JSON import de actividades de tratamiento. Devuelve `{created: N, errors: [...]}`.
- `GET /api/v1/export/treatment-activities` — streaming CSV con todas las actividades del tenant.
- `GET /api/v1/export/compliance-report` — JSON snapshot completo de métricas de cumplimiento.

### US-RF23-1: Daily backups con RPO/RTO
- `POST /api/v1/backups/create` — copia el archivo SQLite con timestamp, computa SHA-256, registra en `BackupRecord`.
- `GET /api/v1/backups` — lista registros de backup.
- `GET /api/v1/backups/{id}` — detalle de un backup.
- `POST /api/v1/backups/{id}/verify` — re-computa SHA-256 y compara; status = VERIFIED o FAILED.
- `backend/scripts/backup.py` — script CLI para cron diario, retención 30 días, verificación inmediata post-copia.
- RPO ≤ 24h (via cron diario), RTO ≤ 4h (restore del último backup VERIFIED).

### Permisos actualizados
- Módulos nuevos `alerts` y `backups` añadidos al `PERMISSIONS` dict en `app/core/permissions.py`.

---

## Cómo correrlo

```bash
cd backend
source .venv/bin/activate

# Tests (268 passing)
pytest tests/ -v

# Servidor dev
uvicorn app.main:app --reload --port 8000

# Backup manual
python scripts/backup.py --db-path datalegal.db --backup-dir backups/ --retention 30

# Cron diario (ejemplo)
# 0 2 * * * cd /path/to/backend && /path/to/.venv/bin/python scripts/backup.py >> /var/log/datalegal-backup.log 2>&1
```

### Endpoints nuevos de ejemplo

```bash
TOKEN="Bearer <jwt>"

# KPIs
curl -H "Authorization: $TOKEN" http://localhost:8000/api/v1/reports/kpis

# 6-month trends
curl -H "Authorization: $TOKEN" http://localhost:8000/api/v1/reports/trends?months=6

# PDF report download
curl -H "Authorization: $TOKEN" -o report.pdf http://localhost:8000/api/v1/reports/summary/pdf

# CSV report download
curl -H "Authorization: $TOKEN" -o report.csv http://localhost:8000/api/v1/reports/summary/csv

# Create alert
curl -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"alert_type":"GENERAL","title":"Test","message":"Hello","severity":"INFO"}' \
  http://localhost:8000/api/v1/alerts

# Create backup
curl -X POST -H "Authorization: $TOKEN" http://localhost:8000/api/v1/backups/create

# Import activities
curl -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"activities":[{"name":"Test","purpose":"demo","legal_basis":"CONSENT"}]}' \
  http://localhost:8000/api/v1/import/treatment-activities

# ARCO SLA status
curl -H "Authorization: $TOKEN" http://localhost:8000/api/v1/arco-requests/1/sla-status

# Consent stats
curl -H "Authorization: $TOKEN" http://localhost:8000/api/v1/consents/stats
```

---

## Tests añadidos

Archivo: `backend/tests/test_sprint5.py` — **39 tests**, todos verdes.

| Clase | Tests | Cobertura |
|-------|-------|-----------|
| `TestConsentStats` | 3 | US-RF06-1 |
| `TestARCOSLA` | 6 | US-RF07-1 |
| `TestReportExports` | 5 | US-RF15-1 |
| `TestKPIsAndTrends` | 7 | US-RF16-1 |
| `TestAlerts` | 7 | US-RF18-1 |
| `TestImportExport` | 5 | US-RF21-1 |
| `TestBackups` | 6 | US-RF23-1 |

Suite completa: **268 passing, 0 failing**.

---

## Qué quedó pendiente

1. **Alembic migrations**: aún sin migraciones formales (Sprint 1 carry-forward). Tablas creadas via `Base.metadata.create_all` en tests; en producción requiere Alembic.
2. **Passlib deprecation**: `passlib[bcrypt]` usa API deprecada de bcrypt. Migrar a `bcrypt` directo o `argon2-cffi`.
3. **Email notifications** (RF-18 full): el sistema de alertas es in-app. Las notificaciones por email mencionadas en RF-18 son TODO — requieren SMTP config + plantillas.
4. **Backup para PostgreSQL**: el script CLI y el endpoint crean `PENDING` records para Postgres; se necesita integrar `pg_dump` subprocess en producción.
5. **Frontend**: las páginas de dashboard (KPIs, trends, alertas) no se implementaron — el briefing del Sprint 5 no incluía US de frontend.
6. **MFA encryption**: clave secreta para tokens TOTP aún en config plain-text (carry-forward de Sprint 1).
7. **Redis sessions**: sessions aún en JWT stateless, sin Redis (carry-forward Sprint 1).

---

## Riesgos detectados

- **Backup atomicity**: para SQLite en uso activo, `shutil.copy2` puede capturar un estado inconsistente durante escrituras concurrentes. Producción debe usar el SQLite online backup API (`VACUUM INTO`) o pg_dump para PostgreSQL.
- **Broadcast alerts scale**: alertas con `recipient_id=None` son filtradas en cada request con `OR` SQL. Con muchas alertas y usuarios, puede ser lento. Solución futura: tabla de lectura por usuario.
- **PDF Unicode**: fpdf2 con fuentes built-in (Helvetica) es Latin-1 únicamente. Cualquier texto con caracteres fuera de Latin-1 se reemplaza con `?`. Para textos completamente en español/inglés es suficiente para el MVP.
