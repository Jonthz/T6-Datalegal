# Sprint 2 — Data Inventory and Initial Risk Analysis

## Objective

Build the core data-inventory and risk-analysis modules: treatment activity registration via
guided questionnaire, technical metadata for information assets, risk scoring engine, incident
logging, data-retention management, and department-scoped access.

## What was done

### New modules (backend)

| Module | Files | US covered |
|---|---|---|
| Treatment Activities | `models/treatment_activity.py`, `api/v1/treatment_activities.py`, `schemas/treatment_activity.py` | US-RF35-1 |
| Information Assets | `models/information_asset.py`, `api/v1/information_assets.py`, `schemas/information_asset.py` | US-RF36-1, US-RF38-1 |
| Risk Assessments | `models/risk_assessment.py`, `api/v1/risk_assessments.py`, `schemas/risk_assessment.py` | US-RF37-1 |
| Incidents | `models/incident.py`, `api/v1/incidents.py`, `schemas/incident.py` | US-RF08-1 |
| Retention | `models/retention.py`, `api/v1/retention.py`, `schemas/retention.py` | US-RF29-1 |
| Data Inventory | `api/v1/data_inventory.py` | US-RF28-1 |

### Security enhancements

- **US-RF02-2 — Inactivity lockout**: `last_activity_at` field on `User` model; `get_current_user`
  dependency now checks inactivity > 30 min and refreshes timestamp on every authenticated request.
- **US-RF01-2 — Department isolation**: `DEPT_HEAD` role is restricted to their own
  `department_id` in treatment activities, information assets, and incidents (filter applied in
  list/get endpoints).
- **US-RF39-1 / RF-40 — Catalog referential integrity**: `DELETE /catalogs/{id}` now checks if
  the entry is referenced by any `InformationAsset` (by `asset_type_code`, `format_code`,
  `storage_medium_code`, `classification_level_code`) and returns HTTP 409 if referenced.

### RBAC updates

`app/core/permissions.py` extended with Sprint 2 modules for all roles. DEPT_HEAD can create/read/update
their department's treatment activities and information assets; AUDITORs have read-only access.

### Risk scoring engine

`GET /api/v1/risk-assessments/questionnaire` returns 10 standardized Yes/No questions.
`POST /api/v1/risk-assessments` validates gateway Q1 (`contains_personal_data`), then computes:
- **Probability** (1–5): driven by Q3 (opt-out), Q6 (volume), and missing controls Q8/Q9/Q10
- **Impact** (1–5): driven by Q2 (sensitive data), Q4 (monetary loss), Q5 (cross-border), Q7 (profiling)
- **Score** = P × I; **GREEN** 1–8, **YELLOW** 9–16, **RED** 17–25 (ISO/IEC 27005)

### Information classification (US-RF38-1)

Three standardized levels stored as catalog codes:
- `PUBLICA_USO_INTERNO`
- `PUBLICA_CLASIFICADA`
- `PUBLICA_RESERVADA`

### Retention alerts (US-RF29-1)

`GET /api/v1/retention/expired-under-review` returns all `RetentionRecord` entries where
`expiry_date < today` AND `legal_hold = True` AND `status IN (ACTIVE, UNDER_REVIEW)`.
Records are automatically transitioned to `UNDER_REVIEW` on first query. DPO can then
PATCH with a `review_decision` (RETAIN/DELETE/ANONYMIZE) to close them.

### Auto-progress report (US-RF28-1)

`GET /api/v1/data-inventory/progress` returns real-time counts of:
- Treatment activities by status (DRAFT/ACTIVE/ARCHIVED)
- Completion % (activities with at least one risk assessment)
- Risk distribution (LOW/MEDIUM/HIGH)
- Information asset classification distribution

## How to run

```bash
cd backend

# Install deps (first time)
uv sync

# Run tests
uv run pytest tests/ -v

# Start dev server
uv run uvicorn app.main:app --reload

# API docs
open http://localhost:8000/api/docs
```

### New endpoints (Sprint 2)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/treatment-activities` | List activities (dept-scoped for DEPT_HEAD) |
| POST | `/api/v1/treatment-activities` | Create activity (US-RF35-1) |
| PATCH | `/api/v1/treatment-activities/{id}` | Update activity |
| DELETE | `/api/v1/treatment-activities/{id}` | Archive activity |
| GET | `/api/v1/information-assets` | List assets |
| POST | `/api/v1/information-assets` | Create asset + metadata (US-RF36-1, US-RF38-1) |
| GET | `/api/v1/risk-assessments/questionnaire` | Get questionnaire (US-RF37-1) |
| POST | `/api/v1/risk-assessments` | Submit answers + compute score |
| GET | `/api/v1/incidents` | List incidents (US-RF08-1) |
| POST | `/api/v1/incidents` | Register incident |
| POST | `/api/v1/incidents/{id}/notify` | Mark regulatory notification |
| GET | `/api/v1/retention/policies` | List policies |
| POST | `/api/v1/retention/policies` | Create policy |
| GET | `/api/v1/retention/records` | List retention records |
| POST | `/api/v1/retention/records` | Create record |
| PATCH | `/api/v1/retention/records/{id}` | Update/decide on record |
| GET | `/api/v1/retention/expired-under-review` | Expired legal-hold report (US-RF29-1) |
| GET | `/api/v1/data-inventory/progress` | Automatic progress report (US-RF28-1) |

## What was left pending

- **Alembic migrations**: Sprint 1's `alembic.ini` placeholder — still using `create_all()` in tests.
  Sprint 3 should introduce proper migration scripts.
- **MFA secret encryption at rest**: Still plain base32 (from Sprint 1 carry-forward).
- **Frontend pages for Sprint 2 modules**: No React pages were added (scope: backend only).
  Sprint 3 or a dedicated frontend sprint should add UI for treatment activities, risk assessments,
  and incident management.
- **Email notifications**: `regulatory_notification_required` flag is stored and timestamped but
  actual email delivery is not yet implemented (RF-18).
- **Bulk-load via CSV**: Treatment activities can be created via questionnaire API; CSV import
  (RF-21) is not yet implemented.
- **passlib deprecation warning**: Carry-forward from Sprint 1.

## Risks / notes for Sprint 3

1. **Schema evolution**: New tables added via `create_all()`; Alembic must be introduced before
   any production deployment to avoid manual DDL.
2. **Department isolation**: Currently enforced in each endpoint manually. A middleware
   approach or query filter hook would be more robust as modules multiply.
3. **Retention automation**: The expired-under-review report marks records as `UNDER_REVIEW`
   on query (pull model). A push model via a background scheduler (APScheduler/Celery) would
   be more reliable for production.
4. **Risk questionnaire extensibility**: Questions are currently hardcoded in
   `schemas/risk_assessment.py`. A future sprint should make them configurable per tenant via
   catalog entries.
