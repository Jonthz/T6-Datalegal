# CLAUDE.md — DataLegal 2.0

Este archivo es leído por **Claude Code** automáticamente al iniciar en este repo.
Sirve como contrato base; cada sprint puede extenderlo.

## Quién eres en este repo
Eres el **ejecutor** del proyecto DataLegal 2.0. El orquestador (otro agente)
te invoca con `claude -p` pasándote un *briefing* por sprint. Tu trabajo:
implementar EXACTAMENTE el alcance de ese sprint, con tests y documentación,
en una rama nueva, y abrir un PR contra `main`.

## Reglas no negociables
1. **Branching**: nunca commitees directo a `main`. Crea
   `sprint/NN-<slug-corto>` antes de tocar archivos.
2. **Scope**: implementa solo lo que el briefing pide. Si algo del sprint
   depende de algo aún no construido, mockéalo y deja un TODO marcado.
3. **Tests**: cada feature nueva trae test. Build/test deben quedar verdes.
4. **Docs**:
   - Actualiza este `CLAUDE.md` con decisiones nuevas relevantes para sprints
     futuros (stack, convenciones, comandos).
   - Crea/actualiza `docs/sprints/sprint-NN.md` con: objetivo, qué se hizo,
     cómo correrlo, qué quedó pendiente, riesgos.
5. **Commits**: estilo convencional (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
6. **PR**: al terminar, `git push -u origin sprint/NN-...` y abrir PR con
   checklist (alcance cubierto, tests, docs, screenshots si aplica).
7. **Sin secretos**: no metas tokens, credenciales ni datos personales reales
   en el repo. Usa `.env.example`.

## Identidad git
- `user.name = lacedeno11`
- `user.email = lacedeno@espol.edu.ec`

## Dónde está el contexto humano-curado
El orquestador te pasa el contexto del sprint en el prompt directamente.
Si necesitas el panorama general, lee `docs/PROJECT_BRIEF.md` y `ORCHESTRATOR.md`.

## Stack
Definido en Sprint 1 (`sprint/01-foundation`). Fijado para todos los sprints futuros.

### Backend
- **Runtime**: Python 3.12
- **Framework**: FastAPI 0.115+
- **ORM**: SQLAlchemy 2.0 (sync), Alembic (migrations — fase 2+)
- **Base de datos**: SQLite (dev/test), PostgreSQL 16 (producción via docker-compose)
- **Configuración**: pydantic-settings (lee `.env`)
- **Auth**: passlib[bcrypt] + bcrypt<5 (contraseñas), python-jose[cryptography] (JWT HS256), pyotp (TOTP/MFA)
- **Validación de passwords**: ≥8 chars, upper, lower, digit, símbolo especial
- **Virtualenv**: `.venv/` dentro de `backend/`

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **Estilos**: Tailwind CSS 3
- **Routing**: react-router-dom 6
- **HTTP**: axios (con interceptor JWT Bearer)
- **i18n**: react-i18next (strings en `src/i18n/en.json`)
- **QR MFA**: react-qrcode-logo

### Testing
- **Backend**: pytest + fastapi.testclient + SQLite in-memory (transacciones anidadas)
- **Cobertura**: pytest-cov

### Linting
- **Backend**: ruff (selección E, F, I; line-length 100)

### Contenedores
- `docker-compose.yml` en raíz: PostgreSQL + backend

### Comandos clave

```bash
# Backend — instalar y correr tests
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v

# Backend — servidor dev
uvicorn app.main:app --reload --port 8000

# Frontend — build
cd frontend
npm install
npm run build

# Frontend — servidor dev
npm run dev
```

### Convenciones de código
- Todos los modelos multi-tenant heredan de `TenantBase` (tiene `tenant_id`, timestamps)
- `AuditLog.create_log()` es el **único** punto de escritura del log; no existe `update`/`delete`
- JWT payload: `{"sub": user_id, "tenant_id": tenant_id, "role": role, "exp": ..., "iat": ...}`
- SUPER_ADMIN puede pasar `?tenant_id=` para operar cross-tenant
- MFA flow: login → `mfa_required + mfa_token` → `/auth/mfa-verify` → full token
- Lockout: 5 intentos fallidos → bloqueado 15 min (HTTP 423)
- RBAC: `require_permission(module, action)` como dependencia FastAPI; falla con 403 y escribe audit log
- **Inactividad (Sprint 2)**: `get_current_user` chequea `last_activity_at + 30 min`; rechaza con 401 si expirado; actualiza timestamp en cada request autenticado
- **Aislamiento por departamento (Sprint 2)**: `DEPT_HEAD` recibe solo datos con `department_id == user.department_id`; aplicar filtro en cada endpoint que exponga datos multi-dept
- **Campos JSON en modelos**: usar `JSON` type de SQLAlchemy para listas/dicts; evitar `Text` + manual `json.dumps` (causan objetos "dirty" y fallas de UPDATE)
- **Integridad referencial de catálogos (Sprint 2)**: antes de soft-delete de `CatalogEntry`, llamar a `_check_catalog_referential_integrity()` (HTTP 409 si referenciado)

### Estructura de directorios
```
backend/
  app/
    core/       # config, security, permissions
    db/         # base, session, init_db
    models/     # SQLAlchemy models (Sprint 1: user, dept, tenant, catalog, audit_log, training, portability)
                #                   (Sprint 2: treatment_activity, information_asset, risk_assessment, incident, retention)
    schemas/    # Pydantic schemas (matching models)
    api/v1/     # FastAPI routers (matching models)
  tests/        # pytest suite (141 tests passing after Sprint 2)
frontend/
  src/
    api/        # axios wrappers
    components/ # ProtectedRoute, Layout
    hooks/      # useAuth
    i18n/       # en.json
    pages/      # Login, MFAVerify, MFASetup, Dashboard, UserManagement
    types/      # TypeScript interfaces
```

- **PDF (Sprint 3)**: fpdf2 v2.7.9+. Usar `new_x="LMARGIN", new_y="NEXT"` (no `ln=True`, deprecado). Los fonts built-in son Latin-1; **nunca** usar em-dash `—` ni comillas tipograficas — sustituir con `-` o `"`.
- **ARCO ticket (Sprint 3)**: formato `ARCO-{YYYY}-{N:05d}`. `received_date = hoy`, `deadline_date = hoy + 30 dias`. Al hacer `PATCH` con status=RESPONDED se sella `responded_at`.
- **DPIA signing (Sprint 3)**: `POST /{id}/sign` requiere rol DPO o SUPER_ADMIN. Sella `signed_at`, `signed_by_id`, incrementa `version` y genera PDF en `pdf_bytes`. Tras firmar, `status` = SIGNED.
- **Action plan auto-generate (Sprint 3)**: `POST /action-plans/auto-generate` es idempotente: salta risk_assessments que ya tienen plan. Devuelve solo los planes NUEVOS creados (lista vacia si ya todos estan cubiertos).
- **Orden de rutas (critico)**: endpoints con paths estaticos (`/dashboard`, `/wizard/start`, `/auto-generate`) DEBEN declararse ANTES del parametrizado `/{id}` o FastAPI los trata como IDs.

### Módulos activos (post Sprint 3)

| Módulo | Endpoint prefix | Sprint |
|---|---|---|
| Auth | `/api/v1/auth` | 1 |
| Users | `/api/v1/users` | 1 |
| Departments | `/api/v1/departments` | 1 |
| Tenants | `/api/v1/tenants` | 1 |
| Catalogs | `/api/v1/catalogs` | 1 |
| Training | `/api/v1/training` | 1 |
| Audit | `/api/v1/audit` | 1 |
| Portability | `/api/v1/portability` | 1 |
| Treatment Activities | `/api/v1/treatment-activities` | 2 |
| Information Assets | `/api/v1/information-assets` | 2 |
| Risk Assessments | `/api/v1/risk-assessments` | 2 |
| Incidents | `/api/v1/incidents` | 2 |
| Retention | `/api/v1/retention` | 2 |
| Data Inventory | `/api/v1/data-inventory` | 2 |
| Company Profile | `/api/v1/company-profile` | 3 |
| DPIA | `/api/v1/dpias` | 3 |
| ARCO | `/api/v1/arco` | 3 |
| ROPA | `/api/v1/ropa` | 3 |
| Action Plans | `/api/v1/action-plans` | 3 |
| Consents | `/api/v1/consents`, `/api/v1/cookie-banners`, `/api/v1/cookie-consents` | 4 |
| Legal Documents | `/api/v1/legal-documents` | 4 |
| Audit Plans | `/api/v1/audit-plans` | 4 |
| Remediations | `/api/v1/remediations` | 4 |
| Sectors | `/api/v1/sectors` | 4 |
| Reports | `/api/v1/reports` | 4 |

### Convenciones Sprint 4
- **Sprint branch origin**: Sprints branch from the previous sprint branch (not from `main`). main only holds orchestrator docs. Sprint 5 was branched from `sprint/04-auditing-docs`.
- **PDF text encoding**: always call `text.encode("latin-1", errors="replace").decode("latin-1")` before passing to fpdf2 core fonts (built-in Helvetica is latin-1 only).
- **Consent immutability**: `ConsentRecord.is_revoked` is set to `True` once; API returns 400 if a second revoke is attempted. Never clear the flag.
- **LegalDocument versioning**: creating a new document of the same `doc_type` auto-sets all previous `is_current=True` to `False` before inserting.
- **Sector catalog**: code-only constant dict in `sectors.py`, not a DB table. 8 sectors defined.
- **CatalogEntry auto-classification**: static lookup `_LOPDP_AUTO_CLASSIFY` in `catalogs.py` maps known codes to `(sensitivity, criticality)` tuples.

### Convenciones Sprint 5
- **Alert model**: `TenantBase`-derived; `created_at` inherited from `TimestampMixin` (do NOT redefine it). `recipient_id=None` = broadcast to all DPOs in tenant.
- **Auto-alerts**: incidents with severity HIGH/CRITICAL auto-create a broadcast `Alert` on creation. ARCO requests auto-create a `TASK_ASSIGNED` alert for DPOs on creation.
- **ARCO SLA stoplight**: `GET /arco-requests/{id}/sla-status` returns `stoplight: GREEN/YELLOW/RED/GREY`. GREEN = >7 days, YELLOW = 1-7 days, RED = overdue, GREY = terminal state.
- **Backup path resolution**: `backups.py` probes `[url_path, datalegal.db, test_datalegal.db]` in order. For PostgreSQL URLs, status is PENDING and note instructs manual pg_dump.
- **CLI backup script**: `backend/scripts/backup.py` — run daily via cron. Retains last 30 backups, prunes older ones. Verifies checksum immediately after creation.
- **KPI endpoint**: `GET /reports/kpis` — on-time ARCO defaults to 100% when no terminal requests exist.
- **Trends endpoint**: `GET /reports/trends?months=N` — monthly breakdown using `created_at` (or `granted_at` for ConsentRecord). Uses timezone-aware UTC datetimes.
- **Consent stats**: `GET /consents/stats` — MUST be declared BEFORE `GET /consents/{record_id}` to avoid path conflict.

### Módulos Sprint 5
| Módulo | Endpoint prefix | US |
|---|---|---|
| Alerts | `/api/v1/alerts` | US-RF18-1 |
| Backups | `/api/v1/backups` | US-RF23-1 |
| Import/Export | `/api/v1/import`, `/api/v1/export` | US-RF21-1 |
| Reports (enhanced) | `/api/v1/reports/kpis`, `/reports/trends`, `/reports/summary/pdf`, `/reports/summary/csv` | US-RF15-1, US-RF16-1 |

### Convenciones Sprint 6 (hardening)
- **Env policy**: `app/core/config.py` is env-aware. `ENVIRONMENT=production` rejects missing/weak `SECRET_KEY` (`<32 chars` or the dev placeholder), missing `MFA_ENCRYPTION_KEY`, or empty `CORS_ORIGINS` — startup raises `RuntimeError`. Dev/test auto-fill `SECRET_KEY` and `MFA_ENCRYPTION_KEY` with safe placeholders (latter is an ephemeral Fernet key per process).
- **MFA secret at rest**: `User.mfa_secret` is Fernet-encrypted via `app.core.mfa_crypto`. Always use `encrypt_mfa_secret(plain)` before persisting and `decrypt_mfa_secret(stored)` before passing to `pyotp.TOTP`. Legacy plaintext rows are read transparently (no `gAAAA` prefix → passthrough); they are re-saved encrypted on next setup/confirm.
- **Rate limiting**: `app/core/rate_limit.limiter` is the project Limiter. Decorate sensitive endpoints with `@limiter.limit(settings.AUTH_RATE_LIMIT)` (default `20/minute`). Tests must `limiter.reset()` between cases — the autouse fixture in `tests/conftest.py` handles this.
- **Trusted-proxy IP**: never trust `X-Forwarded-For` blindly. Use `app.core.rate_limit.get_client_ip(request)`; it consults `settings.TRUSTED_PROXIES` (CIDRs) before honoring XFF.
- **Security headers**: `SecurityHeadersMiddleware` is mounted globally. Strict CSP for API JSON; relaxed CSP on `/api/docs*` and `/api/redoc*` so Swagger renders.
- **Docs guard**: `/api/docs`, `/api/redoc`, `/api/openapi.json` only mount when `SHOW_DOCS=True` and `ENVIRONMENT != "production"`. Prod ops can flip `SHOW_DOCS=true` env if they understand the exposure.
- **Backups (SQLite)**: `POST /backups/create` enforces `SUPER_ADMIN` when `DATABASE_URL` starts with `sqlite` — a SQLite snapshot is the full DB file and therefore cross-tenant. Tenant-scoped roles (DPO/ADMIN) get 403. PostgreSQL path is unchanged.
- **Alembic baseline**: `backend/alembic/versions/9ea2fa322267_baseline_schema_sprints_1_5.py` is the only revision. To bring up a clean DB: `DATABASE_URL=... alembic upgrade head`. `init_db()` is still used by `tests/conftest.py` for speed; do not remove until tests are migrated to alembic-driven schema.
- **RBAC entrypoint**: there is exactly one `require_permission` — it lives in `app/api/deps.py`. `app/core/permissions.py` only exports the `PERMISSIONS` matrix and `has_permission`. Never import `require_permission` from `app.core.permissions`.
- **Ruff baseline**: `ruff check .` must pass on every PR. Use `Column.is_(True)` (not `== True`) in SQLAlchemy filters. Pydantic-only request bodies must NOT use `dict` subclasses (see `BulkImportRequest` pattern in `import_export.py`).

### Convenciones Sprint 7 (organization + data inventory UI)
- **Real pages, not placeholders**: `/departments`, `/company-profile`,
  `/tenants`, `/sectors`, `/catalogs`, `/data-inventory`,
  `/treatment-activities`, `/information-assets`, `/retention`,
  `/import-export` are now real components in `frontend/src/pages/*`. The
  Sprint 6B `ModulePlaceholder` is still wired for Sprint 8/9 modules; do not
  delete it.
- **Error helper**: `frontend/src/lib/errors.ts` exports
  `extractErrorMessage(err, fallback)` and `getStatus(err)`. Use them in every
  new page that surfaces server errors — they handle FastAPI's `detail` string
  AND the pydantic `[{msg}]` array form. Never inline ad-hoc `err.response?.data?.detail` parsing.
- **Treatment activity wizard**: the 4-step flow MUST go through
  `wizardStart` → `wizardLegalBasis` → `wizardTransfers` → `wizardFinalize`.
  Each step posts/patches to the wizard endpoints (NOT to the generic
  CRUD endpoints). Step 1 creates a DRAFT; finalize flips status to ACTIVE.
  See `frontend/src/pages/TreatmentActivities.tsx`.
- **Catalog delete handling**: backend returns HTTP 409 when a catalog entry
  is still referenced by an information asset. Always branch on `getStatus(err) === 409`
  and surface `catalogs.deleteBlocked` instead of the generic error message.
- **Sectors endpoint shape**: `/sectors` returns
  `{ sector_code, label, suggested_data_types, suggested_activities, suggested_templates }`.
  Type lives in `frontend/src/types/organization.ts`. To set the current
  tenant's sector use `setCompanySector(code)` which posts `{ sector }` — NOT
  `{ sector_code }`.
- **Import payload**: `POST /import/treatment-activities` accepts
  `{ activities: [...] }` and responds `{ created: N, errors: [{row, detail}] }`.
  The wrapper in `frontend/src/api/importExport.ts` matches that exactly.
- **Retention contract**:
  - `GET /retention/records` filter is `record_status` (NOT `status`).
  - `POST /retention/execute` body is `{ policy_id?, run_type? }` where
    `run_type` defaults to `MANUAL` on the backend. There is NO `dry_run`.
  - `/retention/expired-under-review` ONLY returns rows where both
    `expiry_date < today` AND `legal_hold=true` — document this in any UI
    that surfaces the list.
- **Information asset catalog dropdowns**: code values come from
  `CatalogEntry` rows whose `type` is one of
  `ASSET_TYPE / ASSET_FORMAT / STORAGE_MEDIUM / CLASSIFICATION_LEVEL`. If a
  catalog is empty, classify-level falls back to the LOPDP defaults
  (`PUBLICA_USO_INTERNO`, `PUBLICA_CLASIFICADA`, `PUBLICA_RESERVADA`).
- **Navigation registration**: every new module page MUST be registered in
  BOTH `frontend/src/routes/routes.tsx` (path + Component + roles) AND
  `frontend/src/routes/navigation.ts` (sidebar group + labelKey). Forgetting
  the nav entry is the most common Sprint 6B/7 bug.
- **No test runner in frontend**: `npm run lint` is `tsc --noEmit` and
  `npm run build` is `tsc && vite build`. Type-checking is the smoke gate.
  Do not introduce a test framework as a side effect of feature PRs.

### Convenciones Sprint 8 (risk / DPIA / ARCO / incidents / portability UI)
- **Real pages, not placeholders**: `/risk-assessments`, `/dpias`, `/arco`,
  `/incidents`, `/portability` are now real components in `frontend/src/pages/*`.
  Their placeholder factories in `frontend/src/pages/placeholders/index.tsx`
  are kept on disk for documentation parity with Sprint 7, but no route uses
  them. Sprint 9 still owns the remaining placeholders.
- **Risk dashboard shape**: `GET /risk-assessments/dashboard` returns
  `{ total, green, yellow, red, by_level, avg_score, high_risk_activities[] }`.
  The matching TypeScript type is `RiskDashboard` in
  `frontend/src/types/risk.ts` — no `[key: string]: unknown` escape hatch. Each
  `high_risk_activities[i]` has `{ assessment_id, treatment_activity_id,
  risk_score, risk_level }`. Treat this as the source of truth and update both
  ends when adding a field.
- **Risk questionnaire is a gateway**: `Q1 = "Does this activity involve
  personal data?"` is the gateway. The frontend rejects submission when
  `q1 === false` (matches backend 422 in `risk_assessments.create_assessment`).
  Wizard validation happens client-side AND server-side; do not loosen either.
- **DPIA signing**: only DPO and SUPER_ADMIN can sign. Frontend uses
  `useAuth().auth.role` to disable the Sign button as UX, and surfaces
  `dpias.permissionRequired` if the backend returns HTTP 403. The "Download
  PDF" button only appears once `status === "SIGNED"`; backend returns 404 if
  `pdf_bytes` is empty.
- **ARCO SLA stoplight**: per-row SLA is computed via
  `GET /arco-requests/{id}/sla-status` (backend returns `ticket_number`,
  `status`, `stoplight: GREEN|YELLOW|RED|GREY`, `on_time`, `days_remaining`,
  `deadline_date`). Always render a colored dot AND a textual label — never
  rely on color alone for accessibility.
- **ARCO list status filter**: backend `list_arco_requests` exposes the query
  param as `status` (FastAPI aliases it internally to `request_status` to avoid
  shadowing the `status` module). The frontend wrapper sends `{ status: ... }`
  and that is the contract — do not rename.
- **Incident regulator deadline (5 days)**: backend stores `created_at` and
  `regulatory_notified_at`; the **5-day LOPDP regulator window** is computed
  client-side from `created_at` and displayed with `green / amber / rose`
  tones. If the backend ever exposes a server-authoritative deadline, the page
  should switch to that source.
- **SPDP checkbox** (`regulatory_notification_required`): the frontend renders
  a styled checkbox with hint copy. `POST /incidents/{id}/notify` is the
  one-shot regulator-notified marker; once set, the SPDP badge disappears and
  the deadline cell flips to `success` tone showing the notification timestamp.
- **Portability export builds blob client-side**:
  `GET /portability/{id}/export` returns JSON (not a `Blob`). The page calls
  the wrapper, gets a `PortabilityExport` object, then constructs `new Blob([
  JSON.stringify(payload, null, 2) ])` and pipes that to `downloadBlob()`. The
  filename is `portability_{id}_{sanitized_subject_name}.json`.
- **Portability response payload validation**: the "Complete & export" modal
  accepts a free-form JSON textarea (`response_data`). Empty body is treated
  as `undefined` (no `response_data` field sent). Invalid JSON is rejected
  before the PUT with `portability.invalidJson`. Valid JSON is parsed into
  `Record<string, unknown>` and persisted as-is by the backend.
- **Risk + KPI fan-out**: `/risk-assessments` dashboard tab fetches BOTH
  `/risk-assessments/dashboard` and `/reports/kpis` in parallel. If either
  fails, the page surfaces the failure but still renders whichever payload
  succeeded — both calls have `.catch(() => null)` fallbacks.

### Convenciones Sprint 9 (documents / operations / transversal UI)
- **Real pages, not placeholders**: `/consents`, `/legal-documents`, `/ropa`,
  `/action-plans`, `/audit-plans`, `/remediations`, `/reports`, `/alerts`,
  `/audit-log`, `/training`, `/backups` are now real components in
  `frontend/src/pages/*`. Only `/settings` still ships the Sprint 6B
  `ModulePlaceholder` (Sprint 10).
- **Backend status filter names**: action plans, audit plans, audit findings
  and remediations expose their list-status filter under a **prefixed** name
  so FastAPI does not shadow the `status` module — frontend wrappers MUST
  use `plan_status` for `/action-plans` and `/audit-plans`, `finding_status`
  for `/audit-plans/{id}/findings`, and `remediation_status` for
  `/remediations`. The ARCO route is the only exception (it uses `?status=`
  as a public alias). `/retention/records` keeps the Sprint 7 alias
  `?record_status=`.
- **Reports KPI / trends shape (authoritative)**: `GET /reports/kpis` returns
  `{ pct_activities_active, avg_risk_score, pct_arco_on_time, reported_breaches,
  alerts: { overdue_arco_requests, open_critical_findings,
  open_high_risk_assessments } }`. `GET /reports/trends?months=N` returns
  `{ months, trends: ReportTrendPoint[] }` where each point is
  `{ month, new_treatment_activities, new_risk_assessments, new_incidents,
  new_arco_requests, new_consents }`. The TypeScript types in
  `frontend/src/types/transversal.ts` mirror this exactly — DO NOT use the
  speculative names (`activities_registered_pct`, `arco_ontime_pct`,
  `breaches_reported`, `risk_scores`) that pre-Sprint-9 code referenced.
- **ROPA report shape (authoritative)**: `GET /ropa` returns
  `{ generated_at, tenant_id, total_activities, activities_by_legal_basis:
  Record<string, ROPAActivity[]> }`. The page groups by legal basis to match
  the PDF output. `ROPAActivity` lives in `frontend/src/types/documents.ts`.
- **Consents stats**: `GET /consents/stats` returns
  `{ total, active, revoked, sensitive, revocation_rate, by_legal_basis,
  by_treatment_activity }`. The KPI strip on `/consents` uses
  `revocation_rate * 100` formatted via `formatPercent` for human display.
- **Backups SUPER_ADMIN gate**: the UI shows the page to every role with
  `backups:r`, but disables the **Create backup** button and renders a
  warning `Alert` for non-SUPER_ADMIN. The backend still enforces the gate;
  the page surfaces HTTP 403 as `backups.forbidden`. RPO is target ≤ 24 h
  (configurable in the page constants), RTO badge is informational only
  (target ≤ 4 h).
- **Action plans auto-generate UI**: the button is idempotent and the toast
  reads "{count} new plans created" — when no new plans are produced the
  count is 0. This matches the Sprint 3 backend contract.
- **Audit findings inside Audit Plans page**: findings management lives
  inside the parent `/audit-plans` page in a modal, not a separate route.
  Backend findings filter is `?finding_status=`.
- **Alerts read access**: `/alerts` is NOT gated by `require_permission`
  read — every authenticated user can read their own alerts plus tenant
  broadcasts (`recipient_id IS NULL`). Create / update / delete still go
  through `alerts:c / alerts:u / alerts:d`; the UI hides the Create button
  when `auth.role` is not in `['SUPER_ADMIN', 'DPO', 'ADMIN']`.
- **Audit log CSV gate**: `GET /audit/export` requires the custom
  `audit:export` permission (currently SUPER_ADMIN, DPO, AUDITOR). The page
  surfaces HTTP 403 as `auditLog.exportForbidden` so non-privileged roles
  don't see a generic error message.
- **Training tri-pane**: the catalog tab on `/training` is a 3-column
  drilldown (Programs → Modules → Materials). Selecting a program loads its
  modules; selecting a module loads its materials. Module order is honored
  via the `order` field; we sort ascending on the client. Enrollments tab
  has its own DataTable, with ±25% progress controls and auto-set
  `completed_at` when progress reaches 100%.

### Convenciones Sprint 10 (final polish + QA)
- **Every protected route is live**: there are **no remaining placeholder
  routes**. `/settings` resolves to `frontend/src/pages/Settings.tsx` —
  identity (role/tenant/session preview), security (MFA management + sign
  out), preferences (locale label) and About (build label + Swagger link).
  `ModulePlaceholder` and `frontend/src/pages/placeholders/index.tsx` remain
  on disk as a historical reference but no `RouteDef` wires them. The
  Sprint 6B/9 `placeholder()` helper in `routes/routes.tsx` was removed —
  do not re-introduce it; if a future module ships incomplete, build the
  scaffolding inside `pages/` as a real component instead.
- **MFASetup i18n parity**: the manual-entry-key label and the "MFA enabled
  successfully" alert previously held hard-coded English literals. They now
  read `auth.mfaSetupManualKey` and `auth.mfaSetupSuccess` from
  `i18n/en.json`. Audit any new auth pages for stray literals.
- **Settings route is `useAuth`-only**: it intentionally does **not** call any
  `/api` endpoint. Identity comes from `useAuth().auth` (JWT-bound role +
  tenant ID stored in `localStorage`). Sign-out calls `clearAuth()` and
  `navigate('/login')`. If a future iteration needs a server-authoritative
  profile, add a `/auth/me` endpoint first — do not pull the user via
  `/users/{id}` because non-privileged roles (DEPT_HEAD, AUDITOR) lack
  `users:r`.
- **README is the canonical onboarding doc**: `README.md` (root) carries
  quickstart, env vars, module map, conventions and pointers to
  `docs/sprints/`, `docs/frontend/SCREEN_MAP.md`,
  `docs/frontend/API_INTEGRATION_MATRIX.md` and `CLAUDE.md`. Keep the four in
  sync: any new route lands in `routes.tsx`, `navigation.ts`,
  `SCREEN_MAP.md`, `API_INTEGRATION_MATRIX.md` and (if it changes the
  quickstart) `README.md`.
- **Verification gate (unchanged)**: `cd frontend && npm install && npm run
  lint && npm run build && npm audit --audit-level=low` plus `cd ../backend
  && pytest tests/ -v && ruff check .`. All gates must stay green on every
  Sprint 10+ PR.

### Convenciones Sprint 6B (frontend foundation)
- **Route config**: routes live in `frontend/src/routes/routes.tsx` (lazy-loaded
  `RouteDef[]`) and the sidebar tree lives in `frontend/src/routes/navigation.ts`.
  Adding a page = create the file under `pages/`, register a `RouteDef` with the
  required `roles`, register a `NavItem` in the right `NavGroup`, add i18n strings.
- **Design system**: every page composes from `frontend/src/components/ui/`
  (`GlassCard`, `GlassPanel`, `Button`, `Input`, `Select`, `Textarea`, `Badge`,
  `RiskBadge`, `StatusBadge`, `Alert`, `Skeleton`, `LoadingState`, `EmptyState`,
  `ErrorState`, `KPICard`, `DataTable`, `PageHeader`, `Modal`, `Tabs`). Do NOT
  re-roll buttons / inputs; extend the shared component if a variant is missing.
- **AppShell**: protected routes render inside `components/layout/AppShell.tsx`
  (sidebar + topbar + breadcrumbs). Auth routes (`/login`, `/mfa-*`) render
  outside the shell.
- **Glassmorphism tokens (Tailwind)**: `bg-shell-gradient` for the app body,
  `bg-auth-gradient` for sign-in screens, `.glass-surface` / `.glass-surface-light`
  utility classes for panels, custom `brand` / `ink` / `risk` palettes in
  `tailwind.config.js`. Focus rings come from the base layer — do not set
  `outline-none` without supplying an accessible replacement.
- **API layer**: HTTP requests go through `frontend/src/api/<module>.ts` wrappers
  that consume `frontend/src/api/client.ts`. Never call axios directly from a
  page. Blob downloads return `Blob` and feed `downloadBlob()` from
  `frontend/src/lib/format.ts`. 401 handling is centralised in the interceptor.
- **Types**: domain types live in `frontend/src/types/<area>.ts`
  (`auth`, `organization`, `dataRegistry`, `risk`, `rights`, `documents`,
  `operations`, `transversal`) and are re-exported from `types/index.ts`. Mirror
  backend Pydantic schemas exactly; do not invent fields.
- **i18n English-only**: every string the user sees is read from `i18n/en.json`
  (`react-i18next`). No hard-coded Spanish/English literals in components.
- **Permission gating**: `ProtectedRoute` accepts a `roles?: Role[]` array;
  Sidebar hides items the role can't reach. Always set `roles` on routes that
  represent restricted modules (SUPER_ADMIN-only, DPO-only, etc.).
- **Loading / error / empty**: every fetch must render `LoadingState`,
  `ErrorState`, or `EmptyState` from the UI kit. No silent spinners, no error
  toasts that obscure context. Tables and lists must use the `DataTable`
  built-in props (`loading`, `error`, `emptyTitle`, `emptyDescription`).
- **Frontend docs**: keep `docs/frontend/SCREEN_MAP.md` and
  `docs/frontend/API_INTEGRATION_MATRIX.md` in sync whenever a route or wrapper
  changes. They are the contract Sprint 7-9 sessions read.
- **Verification gate**: PRs to the foundation pass when `npm install && npm run
  lint && npm run build && npm audit --audit-level=low` all succeed.
