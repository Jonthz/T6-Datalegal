# Sprint 10 — Final Polish, QA, and Release Documentation

> Branch: `sprint/10-final-polish-qa`
> Base: `sprint/09-documents-operations-ui`
> Sprint scope (orchestrator): "Walk every route, fix the last gaps, finish
> the `/settings` placeholder, refresh frontend docs + README, and prove the
> verification gates stay green."

## Objective

Bring the UI chain to a release-ready state. Sprint 9 already wired every
business module to a live page; Sprint 10 closes the final loop:

- Last placeholder route (`/settings`) becomes a real page.
- Last hard-coded English strings (MFASetup) move into `i18n/en.json`.
- Dead code (the `placeholder()` route helper) is removed now that no route
  uses it.
- Frontend docs (`SCREEN_MAP.md`, `API_INTEGRATION_MATRIX.md`) and the root
  `README.md` are rewritten to reflect post-Sprint-10 reality.
- `CLAUDE.md` gains a Sprint 10 conventions section.
- Verification gates re-run to confirm both backend (290 tests, ruff clean)
  and frontend (lint / build / audit) stay green.

## What was built

### New page

| Path | File | Notes |
| --- | --- | --- |
| `/settings` | `frontend/src/pages/Settings.tsx` | Identity (role / tenant / session token preview), Security (MFA management entry + sign-out), Preferences (English locale label + post-launch hint), About (build label + Swagger link + support hint). Reads `useAuth()` only — no `/api` call. |

### Frontend QA fixes

- `frontend/src/pages/MFASetup.tsx` — replaced the two remaining hard-coded
  English literals (`"Manual entry key"`, `"MFA enabled successfully.
  Redirecting…"`) with `t('auth.mfaSetupManualKey')` and
  `t('auth.mfaSetupSuccess')`. Added both keys to
  `frontend/src/i18n/en.json`.
- `frontend/src/routes/routes.tsx` — removed the dead `placeholder()` helper
  and the `Placeholders` lazy bridge now that every protected route resolves
  to a real component. Added a header comment documenting that
  `pages/placeholders/index.tsx` remains on disk for reference only.
- `frontend/src/i18n/en.json` — added a top-level `settings.*` section
  (`title`, `description`, `sections.*`, `identity.*`, `security.*`,
  `preferences.*`, `about.*`).

### Documentation refresh

- `docs/frontend/SCREEN_MAP.md` — rewritten. Every protected route now
  carries `live` status with the sprint it landed in. Old placeholder rows
  removed. Screenshot checklist updated to the Sprint 10 demo set.
- `docs/frontend/API_INTEGRATION_MATRIX.md` — refreshed: every wrapper
  marked `live (Sprint N)`. Documents the public ARCO `?status=` alias and
  the `plan_status / finding_status / remediation_status / record_status`
  filters as the live contract. Adds a Settings row (no wrapper —
  `useAuth`-only). Known-gaps section trimmed to post-Sprint-10 reality.
- `README.md` (root) — rewritten as the canonical onboarding document.
  Repository layout, backend/frontend/docker quickstart, env-var table,
  auth/MFA/lockout/inactivity model, module map, conventions, pointers to
  `CLAUDE.md` + `docs/sprints/` + `ORCHESTRATOR.md`. Replaces the
  three-line Spanish bootstrap stub from Sprint 1.
- `CLAUDE.md` — added a "Convenciones Sprint 10" section above the Sprint 6B
  baseline. Documents the every-route-live state, the MFASetup i18n parity
  fix, the `useAuth`-only Settings rule, the unchanged verification gate,
  and the README/SCREEN_MAP/MATRIX sync rule.

## How to run

Same as Sprints 6B-9 — no new environment variables, no new dependencies.

```bash
# Frontend dev
cd frontend
npm install
npm run dev                  # http://localhost:5174 (see vite.config.ts)

# Backend dev
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

The `/settings` page is reachable from the topbar profile menu and from the
sidebar (Support → Settings). All roles can open it.

## Verification gate

```bash
# Frontend
cd frontend
npm install                       # 171 packages, up to date
npm run lint                      # tsc --noEmit → clean
npm run build                     # tsc && vite build → 31 chunks emitted, no warnings
npm audit --audit-level=low       # 0 vulnerabilities

# Backend
cd ../backend
source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v                  # 290 passed in ~154 s
ruff check .                      # All checks passed!
```

Sprint 10 bundle additions (gzipped):

```
Settings              1.07 kB
```

No other chunk changed beyond Vite's hash rotation. The main bundle moved
from 107.87 kB → 108.27 kB gzipped (negligible).

## Manual walk-through

For each route I verified the page renders, the API wrappers resolve to the
correct endpoint, blob downloads call `downloadBlob()`, and no string falls
through `t(...)`:

| Group | Routes walked | Result |
| --- | --- | --- |
| Auth | `/login`, `/mfa-verify`, `/mfa-setup` | OK after MFASetup i18n fix |
| Overview | `/dashboard`, `/alerts`, `/reports` | KPIs/trends/alerts from real APIs; PDF + CSV exports wired |
| Organization | `/users`, `/departments`, `/company-profile`, `/catalogs`, `/sectors`, `/tenants` | OK |
| Data registry | `/data-inventory`, `/treatment-activities`, `/information-assets`, `/retention`, `/import-export` | OK; wizard + CSV import preserved |
| Risk | `/risk-assessments`, `/dpias` | DPIA PDF download + sign gate OK |
| Rights | `/arco`, `/portability`, `/incidents`, `/consents` | ARCO SLA stoplight + portability JSON export OK |
| Documents | `/legal-documents`, `/ropa` | ROPA + legal docs PDF downloads OK |
| Operations | `/action-plans`, `/audit-plans`, `/remediations` | Auto-generate idempotent; findings modal renders inside `/audit-plans` |
| Transversal | `/audit-log`, `/training`, `/backups`, `/settings` | Audit CSV export 403-safe; training tri-pane; backups SUPER_ADMIN gate; new Settings page live |

Console: no `console.log` / `console.warn` / `console.error` left in the
codebase (`grep -rn "console\."` across `frontend/src` returned 0). No
`TODO` / `FIXME` markers either.

## What is intentionally not in scope

- **No new backend endpoints**. Settings is `useAuth`-only — adding a
  server-authoritative `/auth/me` for richer profile data is deferred.
- **No frontend test runner**. The contract since Sprint 6B is that
  `tsc --noEmit` plus `vite build` is the smoke gate. Adding `vitest`/`jest`
  is a separate scope.
- **No alembic migration**. The schema has been stable since Sprint 6;
  Sprint 10 changes zero models.
- **No locale beyond English**. The Settings page exposes the locale label
  (`English (en-US)`) as a placeholder for future locales — the i18n
  contract is still English-only (RF-22).
- **No removal of `pages/placeholders/*`**. The Sprint 7/8/9 placeholder
  factories stay on disk as a historical reference. The `placeholder()`
  route helper was removed because it was truly unreachable.

## Risks & known gaps

- **Settings token preview** shows the last six characters of the JWT to
  help users confirm the local session looks sane. This is a UX hint only,
  not a security feature — the full token never leaves localStorage and the
  preview is `••••` + suffix.
- **Build size**. The main bundle is 330 kB raw / 108 kB gzipped. We
  considered manual chunking by route group but Vite's default per-route
  split already produces 27 lazy chunks; further splitting would not move
  the needle for first-paint and would inflate request count.
- **No request cancellation**. Identical to Sprint 9 — acceptable for the
  navigations we ship.
- **README and CLAUDE.md drift**. If a future sprint changes the route
  layout, it must touch all four documents (`routes.tsx`, `navigation.ts`,
  `SCREEN_MAP.md`, `API_INTEGRATION_MATRIX.md`) plus `README.md` if the
  quickstart changes.

## Screenshots checklist (Sprint 10 demo)

Capture at 1440×900 and 390×844 for the release deck:

1. `/login`, `/mfa-verify`, `/mfa-setup` (with the new Manual entry key
   label localized).
2. `/dashboard` with KPI cards populated and at least one row in the alerts
   panel.
3. `/reports` KPIs tab + trends tab + summary tab.
4. `/risk-assessments` dashboard tab (green/yellow/red).
5. `/dpias` wizard step 3 + signed-PDF download.
6. `/arco` list with SLA stoplight + ticket detail.
7. `/incidents` list with regulator deadline cell.
8. `/treatment-activities` wizard step 1-4.
9. `/audit-plans` findings modal open.
10. `/training` catalog drilldown + enrollments tab.
11. `/backups` DR posture card.
12. `/settings` — new identity card + security card + about card.
13. Sidebar collapsed / open on mobile width.

Screenshots themselves live alongside the deck (not in the repository).
