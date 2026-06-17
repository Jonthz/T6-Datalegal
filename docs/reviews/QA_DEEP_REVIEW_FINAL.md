# DataLegal 2.0 — Exhaustive QA Review

**Repo under review:** `/tmp/datalegal-qa-review` (detached checkout of `origin/sprint/05-operations-reports`)
**HEAD:** `b66c042 feat: Sprint 5 — operations, reports, and dashboards`
**Reviewed:** 2026-05-18 by Claude (Opus 4.7), independent QA pass
**Worktree state:** clean except untracked `QA_PROMPT.md` (review prompt itself; not part of repo).

---

## Executive verdict

| | |
|---|---|
| **Overall status** | **FAIL** (PASS for backend in isolation; FAIL when judged against the project's stated 45-US MVP scope and "production readiness" claim) |
| **Production readiness** | **Not ready** |
| **Merge readiness for sprint chain into `main`** | **Needs changes** — backend chain is mergeable as an internal milestone, but the product cannot ship to end users because the frontend covers only ~7% of the user stories (auth + user management only). |

### TL;DR
- Backend: 268/268 tests pass, 92% coverage, no high-severity security findings, multi-tenant isolation looks correctly applied across 26 routers. Solid foundation.
- Frontend: typecheck and build succeed but **only 5 pages exist** (Login, MFA-Verify, MFA-Setup, Dashboard, UserManagement). All other 40+ user stories have zero UI. Dashboard is a static label card — it does not call any API. This is the single largest gap.
- Operational gaps that prevent production deploy: no Alembic migration scripts (only an `alembic.ini` placeholder), default `SECRET_KEY` in `app/core/config.py`, `mfa_secret` stored plaintext, no rate-limiting on login, CORS in dev is `*` with credentials, and the SQLite backup endpoint exposes a cross-tenant snapshot on disk.
- Quality nits: 92 ruff lint errors (mostly unused imports / sort order), one duplicate `require_permission` definition (dead-code footgun), `app/db/init_db.py` is out of sync with `models/__init__` (missing `alert`, `backup`).

---

## Commands executed

| Command | CWD | Exit | Result |
|---|---|---:|---|
| `git status -sb`, `git log -1`, `git branch -a` | repo root | 0 | Detached HEAD on `b66c042`; only `QA_PROMPT.md` untracked |
| `python3 -m venv .venv` | `backend/` | 0 | venv created |
| `pip install -e ".[dev]"` | `backend/` | 0 | All deps installed; **note**: `fpdf2` is imported by `audit_plans.py` / `reports.py` but NOT in `pyproject.toml` dependencies |
| `pip install fpdf2` | `backend/` | 0 | Required to import `app.main`; without this, the app fails to start |
| `python -c "from app.main import app"` | `backend/` | 0 | 153 routes registered |
| `pytest tests/ -v` | `backend/` | 0 | **268 passed, 35 warnings, 111 s** |
| `pytest --cov=app --cov-report=term-missing` | `backend/` | 0 | **92% line coverage** (3665 stmts, 275 missed) |
| `ruff check .` | `backend/` | 1 | **92 errors** (65 F401 unused import, 19 I001 import sort, 4 E712, 2 F841, 1 E402, 1 F811) |
| `ruff check app` | `backend/` | 1 | 58 errors in app/ (rest in tests/) |
| `bandit -r app` | `backend/` | 0 | 1 LOW false-positive (string literal `"mfa_pending"`) |
| `pip freeze \| pip-audit` | `backend/` | 0 | **No known vulnerabilities** in installed Python deps |
| `npm install --no-audit --no-fund` | `frontend/` | 0 | 169 packages, 1 deprecation warning (lodash.isequal) |
| `npm run lint` (`tsc --noEmit`) | `frontend/` | 0 | TypeScript clean |
| `npm run build` | `frontend/` | 0 | 120 modules; `index.js` 318.88 kB / 105.91 kB gzip |
| `npm audit --audit-level=low --json` | `frontend/` | 0 | **0 vulnerabilities** at any level |
| Smoke `TestClient`: `/health`, `/api/openapi.json`, `POST /auth/login`, `GET /users` | repo | 0 | 200 / **107 paths** / 422 (validation) / 401 (auth) — app correctly enforces auth |

Artifacts written to `/home/ubuntu/workspace/reports/datalegal-2.0/qa-artifacts/coverage.txt`.

---

## Test summary

- **Backend pytest:** 268 passed in 111 s.
- **Coverage (app/):** 92% — every router file ≥ 70%; lowest = `app/db/init_db.py` (0%, unused at runtime since `tests/conftest.py` reimplements create_all) and `app/core/permissions.py` (53% — dead-code `require_permission` decoy never invoked).
- **Ruff:** 92 errors; **none are correctness bugs** but the project's own CLAUDE.md mandates `ruff` as the lint baseline, so CI would currently fail.
- **Frontend typecheck:** passes.
- **Frontend build:** passes (3.95 s, single JS bundle 319 kB).
- **npm audit:** clean.
- **pip-audit:** clean (after stripping the editable-install line that fails because `backend/backups/` is created at runtime and confuses setuptools discovery — see Medium #M-3).
- **Bandit:** 1 LOW only.

---

## Critical blockers

### 🔴 C-1 — Frontend covers ~7% of the 45 user stories
- **Severity:** Critical (product-ready claim is unsupportable).
- **Evidence:** `frontend/src/App.tsx` registers exactly 5 routes: `/login`, `/mfa-verify`, `/mfa-setup`, `/dashboard`, `/users`. `frontend/src/pages/` contains the same 5 files. `frontend/src/api/` exports only `auth.ts` and `users.ts`. The dashboard (`Dashboard.tsx`) reads `role` and `tenant_id` from `localStorage` and renders two static cards — it makes **zero** API calls. There is no UI for treatment activities, risk, ARCO, DPIA, ROPA, action plans, consents, legal documents, audit plans, remediations, sectors, reports, KPIs, trends, alerts, backups, incidents, retention, training, portability, company profile, or import/export. The whole compliance product is API-only.
- **Why it matters:** US-RF03 through US-RF43 (40+ stories) explicitly describe user-facing flows (wizards, reports, dashboards, banners). The platform cannot be used by non-developers.
- **Suggested fix:** Either (a) scope down the published MVP to "backend-first API platform + admin UI" and rewrite docs accordingly, or (b) plan dedicated UI sprints. This is many weeks of frontend work, not a one-PR fix.

### 🔴 C-2 — Default `SECRET_KEY` baked into source and used at import time
- **Severity:** Critical for production.
- **Evidence:** `app/core/config.py:8` — `SECRET_KEY: str = "dev-secret-key-change-in-production-please"`. `pydantic-settings` will silently use this default if `.env` is missing. There is no startup assertion or environment guard.
- **Why it matters:** A misconfigured prod deploy issues JWTs anyone with this codebase can forge.
- **Suggested fix:** In `config.py`, set no default and raise on missing `SECRET_KEY` when `ENVIRONMENT != "development"`, e.g. with a `@model_validator`.

### 🔴 C-3 — Cross-tenant data exposure in SQLite backup endpoint
- **Severity:** Critical for any SaaS deployment.
- **Evidence:** `app/api/v1/backups.py:50-72`. `POST /backups/create` copies the **entire** SQLite DB file to `backups/backup_<timestamp>.db` regardless of caller's `tenant_id`. The resulting `BackupRecord` is tenant-scoped, but the file on disk contains every tenant's data. A DPO of Tenant A who has `backups:c` permission can trigger creation of a snapshot containing Tenant B's data; even though there is currently no download endpoint, the file is durable on the application host. The CLI script `scripts/backup.py` (referenced in CLAUDE.md) does the same.
- **Why it matters:** Violates the project's own US-RF19-1 "Isolation by company" requirement at the storage layer; LOPDP-grade compliance for a privacy platform cannot allow this.
- **Suggested fix:** In multi-tenant deploys, mandate PostgreSQL (then the per-tenant pg_dump pattern is at least possible). For SQLite, restrict backup creation to `SUPER_ADMIN` only and document that backups are global, not tenant-scoped. Add explicit RBAC: `backups:c` for DPO is currently allowed and is unsafe.

### 🔴 C-4 — `fpdf2` is imported but missing from `pyproject.toml`
- **Severity:** Critical for any clean install.
- **Evidence:** `pip install -e ".[dev]"` succeeds but `python -c "from app.main import app"` fails with `ModuleNotFoundError: No module named 'fpdf'` at `app/api/v1/audit_plans.py:6` and `reports.py:15`. Only ad-hoc `pip install fpdf2` makes the app importable.
- **Why it matters:** Docker build (`backend/Dockerfile`) and CI will produce a broken artifact. No tests in CI would catch this if they install via `pyproject.toml` alone — they pass here only because the human reviewer noticed.
- **Suggested fix:** Add `fpdf2>=2.7.9` to `[project] dependencies` in `backend/pyproject.toml`.

### 🔴 C-5 — Alembic is a placeholder; production has no migration story
- **Severity:** Critical for any environment that needs to evolve the schema after first deploy.
- **Evidence:** `backend/alembic.ini` exists but the header reads "*This is a placeholder for Sprint 1 — migrations are handled by `init_db.py` in tests. Full Alembic integration is planned for Sprint 2.*" Five sprints later there is no `backend/alembic/` directory and no migration scripts. `app/db/init_db.py` is the only DDL path, and even it is missing `alert` and `backup` model imports (so it would not create those tables for someone running it for dev).
- **Why it matters:** Cannot deploy v0.1.0 → v0.1.1 to PostgreSQL without dropping the DB.
- **Suggested fix:** Run `alembic init alembic`, generate an initial revision off current models, replace `init_db.py` callers, and wire Alembic into the Docker image entrypoint.

---

## High findings

### 🟠 H-1 — `mfa_secret` stored in plaintext
- `app/models/user.py` stores `mfa_secret` as a plain string. CLAUDE.md memory acknowledges this as a Sprint 1 TODO but the carry-forward is still open after Sprint 5. Anyone with DB read access can clone every user's MFA seed.
- **Fix:** Encrypt with `cryptography.fernet` using a key from settings; rotate-aware decrypt at verify.

### 🟠 H-2 — No login throttling / rate-limit
- `auth.py login` implements per-user lockout after `MAX_FAILED_ATTEMPTS=5` but there is no per-IP rate limit. A botnet can iterate one attempt per account across many users without ever locking anyone.
- **Fix:** Add slowapi/redis-token-bucket on `/auth/login` and `/auth/mfa-verify`.

### 🟠 H-3 — CORS misconfiguration risk
- `app/main.py:18` — `allow_origins=["*"] if ENVIRONMENT == "development" else []` combined with `allow_credentials=True`. The dev value `*` + credentials is rejected by browsers, so dev works only because credentials aren't actually used cross-origin; but the prod value `[]` will block every cross-origin call, silently breaking a separately-hosted frontend. The CORS policy is effectively unconfigured for production.
- **Fix:** Replace with a settings-driven explicit origin list (`CORS_ORIGINS`).

### 🟠 H-4 — Duplicate `require_permission` definition (dead-code footgun)
- `app/api/deps.py` and `app/core/permissions.py` both define `require_permission`. The one in `permissions.py` references an undefined-by-design `_get_current_user_for_permission` placeholder; if any new module accidentally imports it instead of the deps version, RBAC is silently bypassed (returns `None`, no exception, no audit log).
- **Fix:** Delete `permissions.require_permission` and `_get_current_user_for_permission`; keep only `has_permission` there.

### 🟠 H-5 — `init_db.py` is out of sync with the models package
- Missing imports for `alert` and `backup` (see line 11 onward). Anyone running `init_db(engine)` for local dev gets a broken DB. Tests pass only because `tests/conftest.py` imports the models directly.
- **Fix:** Either delete `init_db.py` once Alembic exists (preferred), or sync its import list.

### 🟠 H-6 — No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, etc.
- No security headers middleware. FastAPI app exposes Swagger at `/api/docs` and ReDoc at `/api/redoc` in all environments with no auth.
- **Fix:** Add `secure-headers` or a thin custom middleware; gate `/api/docs` behind auth in production.

---

## Medium findings

### 🟡 M-1 — Ruff is not green (92 errors)
- 65 unused imports, 19 unsorted imports, 4 `== True/False`, 2 unused vars, 1 module-import-not-at-top, 1 redefined. 84 auto-fixable. CLAUDE.md treats ruff as the linter contract.
- **Fix:** `ruff check . --fix` then audit the remaining 8 hidden-unsafe.

### 🟡 M-2 — `from pydantic import BaseModel` placed mid-file, plus dead `BulkImportBody`
- `app/api/v1/import_export.py:39-46` defines a useless `BulkImportBody(dict)` then does an in-function `from pydantic import BaseModel` immediately below it. Ruff flags E402. Code smell, not a defect.
- **Fix:** Remove `BulkImportBody`, move the import to top of file.

### 🟡 M-3 — Runtime artifacts leak into project root
- Running tests creates `backend/backups/`, `backend/test_datalegal.db`, and a `datalegal_backend.egg-info/`. None are in `.gitignore` explicitly (only `*.db` and `*.egg-info/` cover them). Running `pip-audit -r <(pip freeze)` fails because setuptools sees `backups/` as a second top-level package.
- **Fix:** Add `backups/`, `datalegal.db`, `test_datalegal.db` to `.gitignore`; configure `tool.setuptools.packages.find` in `pyproject.toml` to whitelist `app`.

### 🟡 M-4 — Frontend bundle has no auth UX for password reset, registration, or session expiry
- Only `Login.tsx` exists; no "forgot password" or first-time provisioning UI. The 401 interceptor in `api/client.ts` does `window.location.href = '/login'` — works, but loses any unsaved state without warning.
- **Fix:** Add `/forgot-password` and a soft "your session expired" modal.

### 🟡 M-5 — `mfa_verify` accepts a token whose `type` is mfa_pending but does not validate `iat`/`exp` clock skew or single-use
- An MFA token is replayable inside its 5-minute window. Not catastrophic (still needs the TOTP code, which is itself replay-resistant within the 30 s window) but worth tightening.
- **Fix:** Track issued `mfa_token` jti in DB; invalidate after first successful verify.

### 🟡 M-6 — `data_inventory`, `ropa`, `sectors`, `company_profile` aren't grep-visible by US tag
- The implementations exist (`grep -h "@router\." …` confirms endpoints) but the source files don't carry their US tag in docstrings, so traceability is weaker than for the rest. Mostly a documentation hygiene issue.

### 🟡 M-7 — fpdf2 deprecation warnings (`ln=True`) in `reports.py`
- 33 warnings across the test run. fpdf2 v3 will remove the parameter. CLAUDE.md already calls this out for sprint-03; the new sprint-05 code re-introduced it.
- **Fix:** Switch to `new_x=XPos.LMARGIN, new_y=YPos.NEXT`.

### 🟡 M-8 — `passlib` uses deprecated `crypt` module (Py 3.13 removal)
- DeprecationWarning at test start. Project pins Python 3.12 so it works for now, but Python 3.13 will break the install.
- **Fix:** Move to `argon2-cffi` or `bcrypt` directly; passlib 1.7.4 is unmaintained.

### 🟡 M-9 — Inactivity timeout enforced via `last_activity_at` written on every request → write amplification
- `app/api/deps.py:71` writes `user.last_activity_at = now; db.commit()` on *every* authenticated request. For PostgreSQL this is N UPDATEs per request and a guaranteed row-level contention point per user. Also means every read is a write — observability tools will see all "read" endpoints as state-changing.
- **Fix:** Batch-update (e.g. only write if last activity > 1 min old), or use a sliding refresh-token model.

### 🟡 M-10 — `_get_client_ip` trusts unvalidated `X-Forwarded-For`
- `app/api/v1/auth.py:34`. If the app isn't behind a trusted proxy, anyone can spoof their IP in audit logs.
- **Fix:** Only honor XFF if `request.client.host` is in a configured trusted-proxy list.

---

## Low findings

- **L-1** — Test conftest comment says "in-memory" but uses a file (`test_datalegal.db`). Misleading.
- **L-2** — `frontend/src/i18n/en.json` is loaded but no language switching UI; "English-only MVP" is documented but i18n machinery is overhead with no payoff.
- **L-3** — Tailwind/PostCSS configs are present and used by the 5 pages; styling consistency cannot be evaluated meaningfully on such a small surface.
- **L-4** — `package-lock.json` is git-ignored. Reproducibility of the frontend build is not guaranteed across machines.
- **L-5** — `docs/sprints/sprint-NN.md` and `docs/plan/sprints/sprint-NN.md` are not cross-referenced; reviewers must open both manually.
- **L-6** — `app/api/v1/reports.py:101` uses `**filters` with attribute lookups — fine, but reduces grep-ability for future maintenance.

---

## Frontend findings

**Verdict: the frontend, as a product, is broken.** It runs (build + typecheck clean), but only the authentication and user-management slices ship. None of the compliance modules (US-RF03+) have any UI artifact in `frontend/src/`. The Dashboard, which is the "destination" after login, is two static cards reading from `localStorage`. There are no API helpers for any of treatment-activities, risk, ARCO, DPIA, ROPA, consents, legal documents, audit plans, remediations, reports, alerts, backups, incidents, retention, training, portability, company-profile, sectors, import/export. End-users have no entry point to ~93% of the platform.

The technical foundations of the frontend are fine: TypeScript clean, axios interceptor handles 401, ProtectedRoute uses localStorage token, `Layout.tsx` is a basic shell. So if frontend dev continues, the runway exists — but right now the product is API-only.

---

## Backend/API findings

**Verdict: backend is solid as an internal API platform, not ready as an integrated product.** 107 OpenAPI paths, 26 routers, 30 tables, 268 passing tests with 92% coverage. Tenant scoping is consistently applied — every router except `__init__.py`/`router.py` references `tenant_id` (229 occurrences). RBAC is enforced via `require_permission` from `app/api/deps.py` in 25 routers; `auth.py` and `tenants.py` use specialized dependencies (`require_super_admin`). DEPT_HEAD scoping (`require_department_scope`) is applied where US-RF01-2 requires it.

Notable backend strengths:
- AuditLog has a single creation entrypoint (`AuditLog.create_log`); no `update`/`delete` paths, matching CLAUDE.md's immutability contract.
- Consent immutability (`is_revoked` set once) is enforced at the API layer.
- ARCO SLA stoplight, KPI fallback (100% when no terminal requests), and trends month-bucketing all read sensibly.
- Static routes (`/dashboard`, `/wizard/start`, `/auto-generate`, `/stats`) are declared before `/{id}` parameterized routes where it matters — checked `consents.py:31` (`/consents/stats` before `/consents/{record_id}`); the routing convention from sprint-04 is being followed.

Notable backend gaps:
- No idempotency keys on mutating endpoints; bulk-import can be triggered twice and duplicate.
- No pagination metadata (`X-Total-Count` or envelope) — every list endpoint takes `skip/limit` but returns a bare list, so the frontend cannot show "page N of M".
- No request-id middleware; correlating audit logs to HTTP requests is impossible.
- Backup module unsafe for multi-tenant (see C-3).

---

## Security findings

**Verdict: PASS with caveats** for the *application* security model in isolation; **FAIL** for production-deployable hardening.

Verified OK:
- bcrypt password hashing via passlib.
- Password strength validator enforces 8+ chars, upper/lower/digit/special.
- JWT HS256 with `exp` and `iat` set on every token.
- MFA verify rejects tokens whose `type` is not `mfa_pending`.
- Inactivity timeout server-enforced (30 min).
- Lockout after 5 failed attempts, 15 min hold.
- No raw SQL `text()` / `execute()` / `eval()` / `pickle.load` / `subprocess` / `os.system` in `app/`.
- No hardcoded credentials (grep on `(SECRET_KEY|password|api_key|secret)\s*=\s*['\"][^'\"]{8,}['\"]`) returns nothing real — only the documented default in config.py.
- Tenant isolation: every list/get/update/delete in tenant-scoped modules filters on `tenant_id`; `SUPER_ADMIN` is the only role allowed to pass `?tenant_id=` override (`app/api/deps.py:81-89`).
- npm audit clean; pip-audit clean; bandit only finds a `nosec`-grade false positive.

Caveats / issues already covered above:
- Default SECRET_KEY (C-2).
- Plaintext `mfa_secret` (H-1).
- No login rate limit (H-2).
- CORS misconfig (H-3).
- Spoofable XFF in audit IP (M-10).
- MFA token replay within 5 min (M-5).
- No security headers (H-6).

---

## Requirement coverage matrix

Legend: ✅ Implemented (router + tests) · 🟡 Backend only (no UI) · ⚠️ Partial / stubbed · ❌ Missing · 🔍 Unverified.
All but US-RF01-1, US-RF02-1, US-RF17-1, US-RF19-1, US-RF22-1, US-RF24-1, US-RF26-1, US-RF27-1, US-RF40-1, US-RF41-1 carry an explicit `US-RF…` tag in source; the unmarked ones are inferred from endpoint behavior.

### Sprint 1 — Foundation
| US | Title | Backend | UI | Tests | Status |
|---|---|---|---|---|---|
| US-RF01-1 | Account creation with role & dept | `users.py` | `UserManagement.tsx` | `test_users.py` | ✅ |
| US-RF02-1 | Login with MFA | `auth.py` | `Login`, `MFAVerify`, `MFASetup` | `test_auth.py` | ✅ |
| US-RF17-1 | Immutable & exportable audit log | `audit.py`, `AuditLog.create_log()` | none | `test_audit.py` | 🟡 |
| US-RF19-1 | Isolation by company | `deps.get_current_tenant_id`, `tenant_id` filters everywhere | implicit | `test_tenants.py::TestTenantIsolation` | 🟡 |
| US-RF22-1 | English-only MVP | `frontend/src/i18n/en.json` | partial | none | 🟡 |
| US-RF24-1 | Permissions matrix | `core/permissions.PERMISSIONS` | none | `test_permissions.py` | 🟡 |
| US-RF26-1 | Portability — interoperable export | `portability.py` (`/export`) | none | `test_portability.py` | 🟡 |
| US-RF27-1 | Training plans & materials | `training.py` (programs/modules/materials/enrollments) | none | `test_training.py` | 🟡 |
| US-RF40-1 | Master Catalog Bulk Load (duplicate-named) | `catalogs.py::POST /bulk-load` | none | `test_catalogs.py` | 🟡 |
| US-RF41-1 | Tenant Provisioning Workflow | `tenants.py::POST /provision` | none | `test_tenants.py::TestTenantProvisioning` | 🟡 |

### Sprint 2 — Data Inventory & Risk
| US | Title | Status |
|---|---|---|
| US-RF01-2 | Isolation by department | 🟡 backend + tests, no UI |
| US-RF02-2 | Lockout + inactivity closure | 🟡 backend + `test_inactivity.py`, no UI other than 401 redirect |
| US-RF08-1 | Incident registration + regulator notification | 🟡 |
| US-RF28-1 | Data inventory progress reports | 🟡 |
| US-RF29-1 | Expired data alerts | 🟡 |
| US-RF35-1 | Treatment activity via questionnaire | 🟡 |
| US-RF36-1 | Technical metadata registration (assets) | 🟡 |
| US-RF37-1 | Risk assessment questionnaire | 🟡 |
| US-RF38-1 | Information classification levels | 🟡 |
| US-RF39-1 | Master Catalog Bulk Load | 🟡 |

### Sprint 3 — Compliance Functions
| US | Title | Status |
|---|---|---|
| US-RF03-1 | Initial company / DPO setup | 🟡 (`company_profile.py`) |
| US-RF04-1 | Guided RoT wizard | 🟡 (`treatment_activities.py::/wizard/start`) |
| US-RF09-1 | DPIA structured flow + signed PDF | 🟡 |
| US-RF10-1 | Immediate risk calc & viz | 🟡 (no viz — viz is the frontend that doesn't exist) |
| US-RF11-1 | Retention define/execute/audit | 🟡 |
| US-RF30-1 | ARCO flow for DPO | 🟡 |
| US-RF31-1 | Complete ROPA report | 🟡 |
| US-RF43-1 | Automated Action Plan Generation | 🟡 |

### Sprint 4 — Auditing & Docs
| US | Title | Status |
|---|---|---|
| US-RF05-1 | Catalog + auto-classification | 🟡 |
| US-RF12-1 | Remediations w/ risk impact | 🟡 |
| US-RF13-1 | Audit planning, findings, report | 🟡 |
| US-RF14-1 | Parameterized & versioned doc gen | 🟡 |
| US-RF20-1 | Editable & versioned catalogs | 🟡 |
| US-RF25-1 | Permissions matrix per module (≈ US-RF24-1 duplicate) | 🟡 |
| US-RF32-1 | Explicit immutable consent revocation | 🟡 |
| US-RF33-1 | Expanded contractual docs | 🟡 |
| US-RF34-1 | Economic Sector configuration | 🟡 (`sectors.py` is a static dict, not a CRUD module — design choice noted in CLAUDE.md) |
| US-RF42-1 | Consolidated summary report | 🟡 (`/reports/summary` JSON + PDF + CSV) |

### Sprint 5 — Operations & Reports
| US | Title | Status |
|---|---|---|
| US-RF06-1 | Consent registration & revocation | 🟡 |
| US-RF07-1 | Consent registration & revocation (dup name) | 🟡 |
| US-RF15-1 | Filterable reports to PDF/CSV | 🟡 |
| US-RF16-1 | KPIs, trends, alerts performance | 🟡 (KPI/trends endpoints exist; alerts only as `/alerts` CRUD — no SSE/websocket push) |
| US-RF18-1 | Internal alerts for critical events | 🟡 (HIGH/CRITICAL incidents and new ARCO auto-create broadcast Alerts; no email/webhook delivery — TODO carry-forward) |
| US-RF21-1 | Standard Import/Export | 🟡 |
| US-RF23-1 | Daily backups RPO/RTO | ⚠️ **Partial + risky** — see C-3. SQLite only; PostgreSQL path is documented as manual pg_dump TODO. CLI retention exists; verify endpoint exists. RPO/RTO not measured. |

**Aggregate:** of 45 user stories, **0 are end-user-ready** (none have UI beyond auth/users). 43 are backend+tests-complete (🟡). 1 is partial/risky (US-RF23-1). 1 (US-RF22-1 English-only) is structurally in place but trivially satisfied by the sparse UI.

---

## Recommendations

**Before any production deploy:**
1. Fix C-2, C-3, C-4, C-5 (SECRET_KEY guard, backup tenant isolation, missing fpdf2 dep, Alembic).
2. Fix H-1 (encrypt `mfa_secret`), H-2 (login rate limit), H-3 (CORS), H-6 (security headers).
3. Resolve the duplicate `require_permission` (H-4).

**Before declaring MVP feature-complete:**
4. Build the missing 40+ frontend pages (or formally narrow the scope and update docs/marketing). Without this, "MVP" is misleading.
5. Implement end-to-end tests (Playwright/Cypress) that drive at least: login → MFA → create treatment activity → run wizard → generate ROPA PDF → register consent → revoke → generate summary PDF.

**Hardening sprint candidates:**
6. Replace passlib (M-8). Move to argon2 or maintained bcrypt wrapper.
7. Replace per-request `last_activity_at` write with throttled refresh (M-9).
8. Add idempotency keys for `POST /import/*`, `POST /action-plans/auto-generate`, `POST /backups/create`.
9. Add `X-Request-ID` middleware and propagate to AuditLog.
10. Add structured logging (`structlog`) and OpenTelemetry hooks; current setup logs nothing observable.
11. Wire `npm audit` and `pip-audit` and `ruff --output-format=github` into CI.
12. Gate `/api/docs` and `/api/redoc` behind a `SHOW_DOCS` setting and basic auth in non-dev.
13. Trust XFF only from a configured proxy CIDR (M-10).
14. Add Alembic + autogenerate baseline + a `docker-compose up` migration step.
15. Reconsider the "English-only" i18n carryover — either commit to it (delete `react-i18next` overhead) or use it.

**Documentation cleanup:**
16. Cross-link `docs/plan/sprints/sprint-NN.md` ↔ `docs/sprints/sprint-NN.md` and add per-US implementation status pages.
17. Remove the `BulkImportBody(dict)` dead class and mid-file imports.
18. Sync `init_db.py` with `models/__init__.py` or delete it once Alembic exists.

---

*End of report. Reviewer signature: Claude Opus 4.7, 2026-05-18, independent QA pass against detached worktree at commit `b66c042`.*
