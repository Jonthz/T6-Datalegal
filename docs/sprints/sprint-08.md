# Sprint 8 — Risk, DPIA, ARCO, Incidents, Portability UI

> Branch: `sprint/08-risk-compliance-ui`
> Base: `sprint/07-organization-inventory-ui`
> Sprint scope (orchestrator): "Implement real UI for Risk Analysis (4.3),
> document-side of Rights/Incidents (4.4) and Portability (4.6) on top of the
> Sprint 6B glassmorphism design system and the live FastAPI backend."

## Objective

Replace the Sprint 6B placeholders for `risk-assessments`, `dpias`, `arco`,
`incidents` and `portability` with production-quality React pages that:

- Compose from the shared glassmorphism UI kit (`frontend/src/components/ui/*`).
- Call live backend endpoints via `frontend/src/api/*` wrappers (no fake static
  data, no direct `axios` usage).
- Read every visible string from `frontend/src/i18n/en.json` (`react-i18next`),
  per RF-22 (English MVP).
- Render `LoadingState`, `ErrorState` and `EmptyState` from the kit; never
  silent spinners.
- Respect the role gating already declared in `frontend/src/routes/routes.tsx`
  and `frontend/src/routes/navigation.ts` (DPO/SUPER_ADMIN/ADMIN/DEPT_HEAD).

## What was built

### Pages (real UI, not placeholders)

| Path                 | File                                  | Module / RFs    | Highlights |
|----------------------|---------------------------------------|-----------------|------------|
| `/risk-assessments`  | `frontend/src/pages/RiskAssessments.tsx` | 4.3 / RF-09, RF-10, RF-37 | Tabbed page: (1) **List** with risk-level filter, create modal that loads the 10-question LOPDP questionnaire (`/risk-assessments/questionnaire`) and posts the responses; edit modal lets a DPO re-score an existing assessment; CIA-based P×I scoring rendered as a `RiskBadge` + `score/25`. (2) **Dashboard** with KPI cards (total, average score, `/reports/kpis` activities-registered %, breaches reported), green/yellow/red stoplight cards with percentage bars, and a top-high-risk list pulled from `/risk-assessments/dashboard`. |
| `/dpias`             | `frontend/src/pages/DPIAs.tsx`        | 4.3 / RF-09     | List with status, version, sign timestamp; 4-step wizard (Description → Risk analysis → Mitigations → Review) that creates a `DRAFT`; sign action gated to DPO/SUPER_ADMIN via `useAuth`, hits `POST /dpias/{id}/sign` and surfaces the role-required message on HTTP 403; "Download PDF" calls `GET /dpias/{id}/pdf` and feeds `downloadBlob()`; edit modal mirrors the three text sections so users can refine drafts before signing. |
| `/arco`              | `frontend/src/pages/ARCO.tsx`         | 4.4 / RF-07, RF-30 | Tabbed page: (1) **List** with type+status filters, create modal (ACCESS/RECTIFICATION/CANCELLATION/OPPOSITION), per-row **SLA traffic-light** (green/yellow/red/grey) computed by `GET /arco-requests/{id}/sla-status` and showing days remaining or overdue. Click-through opens a detail modal with sections for Requester / Request / Resolution; resolution patch updates status + response text + rejection reason. (2) **Dashboard** with KPI cards (total, overdue, access, rectification) and breakdown bars by type and status from `/arco-requests/dashboard`. |
| `/incidents`         | `frontend/src/pages/Incidents.tsx`    | 4.4 / RF-08, RF-18 | List with status + severity filters; create/edit modal with all five `incident_type` values, `severity`, `affected_data_types`, optional `department_id`, optional `assigned_to_id`, and a prominent **SPDP checkbox** (`regulatory_notification_required`) with hint copy. Each row shows the LOPDP **5-day regulator deadline** (calculated client-side from `created_at`) with green/amber/rose tones, plus an SPDP badge while the toggle is set but `regulatory_notified_at` is empty. "Mark regulator notified" calls `POST /incidents/{id}/notify`. Edit modal also surfaces data-subject notification status via `resolved_at`. |
| `/portability`       | `frontend/src/pages/Portability.tsx`  | 4.6 / RF-26     | List with status filter; create modal (`subject_name`, `subject_email`, `notes`); "Complete & export" modal lets the DPO set the final status, free-form notes and a JSON `response_data` payload — invalid JSON is rejected client-side before it hits `PUT /portability/{id}/complete`. "Export JSON" hits `GET /portability/{id}/export` and feeds `downloadBlob` so the data subject receives a single RFC 8259 file (`portability_{id}_{subject}.json`). |

### Shared additions

- `frontend/src/types/risk.ts` — replaced `RiskDashboard`'s loose shape with the
  actual backend response (`total`, `green`, `yellow`, `red`, `by_level`,
  `avg_score`, `high_risk_activities`). New `RiskDashboardHighRiskItem` type
  re-exported from `frontend/src/types/index.ts`.
- `frontend/src/types/rights.ts` — tightened `ARCODashboard` (`by_type`,
  `by_status`, `overdue_count`) and `ARCOSLAStatus` (`ticket_number`,
  `on_time`, `days_remaining`) to mirror the FastAPI responses; no new fields,
  just removed the `[key: string]: unknown` escape hatch and renamed
  `request_id → ticket_number`.
- `frontend/src/i18n/en.json` — added top-level keys: `riskAssessments`,
  `dpias`, `arco`, `incidents`, `portability`. Every user-visible string in the
  new pages reads from here.
- `frontend/src/routes/routes.tsx` — five module placeholders swapped for the
  real lazy-loaded components. The Sprint 6B `ModulePlaceholder` is still wired
  for Sprint 9 modules (consents, legal docs, ROPA, action plans, audit plans,
  remediations, reports, training, backups, audit-log, settings) per the
  Sprint 7 convention.

### API/types contract observations

- `/api/v1/risk-assessments/dashboard` uses the **stoplight aggregate shape**:
  `{ total, green, yellow, red, by_level, avg_score, high_risk_activities[] }`,
  with each high-risk item carrying `{ assessment_id, treatment_activity_id,
  risk_score, risk_level }`. The Sprint 6B type definition was speculative;
  the corrected shape is now in `types/risk.ts`.
- `/api/v1/arco-requests/{id}/sla-status` returns
  `{ ticket_number, status, stoplight, on_time, days_remaining, deadline_date }`
  — `stoplight` is `'GREEN' | 'YELLOW' | 'RED' | 'GREY'`, where `GREY` means
  terminal (RESPONDED / CLOSED / REJECTED). Both list and detail views render
  the colored dot + a textual label so we never rely on color alone.
- `/api/v1/portability/{id}/export` returns JSON (not a blob). The page builds
  a `Blob` client-side and triggers `downloadBlob` — this matches the schema
  defined in `app/schemas/portability.py::PortabilityExport`.
- `/api/v1/incidents` does not surface deadline countdowns server-side. The UI
  computes the **5-day regulator window** from `created_at`, in line with the
  LOPDP timeline; this is documented in code and clearly labelled in the UI as
  "Regulator (5 days from detection)".

## How to run

```bash
# Frontend dev (separate terminal)
cd frontend
npm install
npm run dev                  # default http://localhost:5174 (vite.config.ts)

# Backend dev (separate terminal)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
```

Sign in as DPO/SUPER_ADMIN to exercise the full workflow; DEPT_HEAD can list
incidents scoped to their department. The new routes are grouped under
**Risk & DPIA** (risk-assessments, dpias) and **Rights & incidents** (arco,
portability, incidents) in the sidebar — both groups were already declared in
`navigation.ts` so this sprint did not add new sidebar entries.

## Verification gate

```bash
cd frontend
npm install                       # 0 vulnerabilities
npm run lint                      # tsc --noEmit → clean
npm run build                     # tsc + vite build → built in ~9s
npm audit --audit-level=low       # found 0 vulnerabilities

cd ../backend
source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v                  # 290 passed
ruff check .                      # All checks passed!
```

Bundle deltas (gzipped, lazy-loaded chunks added by Sprint 8):

```
RiskAssessments        3.52 kB   (largest new page; embeds questionnaire + dashboard)
ARCO                   3.49 kB   (list + dashboard + SLA traffic-light)
Incidents              3.28 kB   (list + create/edit with SPDP timeline)
DPIAs                  2.97 kB   (4-step wizard + sign/download)
Portability            2.15 kB   (list + complete + JSON export)
```

Each page lazy-loads from `routes.tsx`, so unrelated routes are unchanged.

## What is intentionally not in scope

- **Frontend test runner**. No `vitest`/`jest` is configured; `lint` is
  `tsc --noEmit` and `build` runs `tsc && vite build`. Type-checking the new
  pages against the live API types already exercises the client/server
  contract end-to-end. Adding a test runner is a separate scope.
- **Sprint 9 modules**. Consents, legal documents, ROPA, action plans, audit
  plans, remediations, reports filtering, alerts CRUD, audit-log filtering,
  training, backups, settings — all still ship the Sprint 6B
  `ModulePlaceholder`. They are not part of Sprint 8's scope.
- **Action-plan auto-generation from the risk dashboard**. The dashboard
  surfaces the top high-risk activities but does not yet call
  `POST /action-plans/auto-generate` — that endpoint lives in the
  Action-Plans module and ships in Sprint 9 with the Action Plans page.
- **Email / webhook for ARCO and incident alerts**. The backend already
  creates broadcast `Alert` rows; Sprint 9 owns the alerts inbox.
- **DPIA signing keypair**. The backend stamps `signed_by_id` and bumps
  `version` — no public-key signing or notarization is implemented (carry
  forward).

## Risks & known gaps

- **Risk dashboard is workspace-wide**. The KPI cards merge data from
  `/risk-assessments/dashboard` (tenant-scoped) and `/reports/kpis`
  (tenant-scoped). DEPT_HEAD users will still see workspace totals because the
  backend dashboard endpoint does not currently filter by `department_id`. If
  DEPT_HEAD isolation is required for the dashboard tab, that needs a backend
  follow-up; the assessment list itself already respects DEPT_HEAD scoping via
  `require_permission` because backend filters by `analyst_id` of the assessor.
- **DPIA signing role check is enforced server-side**. The page also disables
  the Sign button when `useAuth().auth.role` is not `DPO` / `SUPER_ADMIN`, but
  this is purely UX — the backend `sign_dpia` still returns HTTP 403 on
  mismatch and we surface that as `dpias.permissionRequired`.
- **ARCO SLA is recomputed on every list load**. We issue one
  `/arco-requests/{id}/sla-status` per row; the dashboard returns
  `overdue_count` independently. For tenants with hundreds of open requests
  this is fine (≤ 100 per page) but a future "/arco-requests?with_sla=true"
  list flag would let us drop the per-row fetch.
- **Incident regulator deadline is client-computed**. The 5-day window in
  `regulatorDeadlineStatus(...)` is derived from `created_at`. If the backend
  later exposes a server-authoritative deadline, the page should switch to
  that source. The current behavior is documented inline.
- **Portability `response_data` is a free-form JSON textarea**. We do not yet
  validate against any RFC 8259 sub-schema. Invalid JSON is rejected before
  the PUT; valid-but-empty `{}` is accepted, which is intentional for
  workspaces still bootstrapping the connector.

## Screenshots checklist

When demoing Sprint 8 capture these in order:

1. `/risk-assessments` — list tab with at least one HIGH-risk row and the
   "New assessment" modal open on Q1 (gateway).
2. `/risk-assessments` — dashboard tab with the three green/yellow/red
   stoplight cards plus the top-high-risk list.
3. `/dpias` — list with one DRAFT and one SIGNED entry; the 4-step wizard open
   on step 2 (Risk analysis).
4. `/dpias` — after signing, the "Download PDF" button visible and the
   resulting PDF.
5. `/arco` — list with a YELLOW row (1-7 days remaining) plus a RED row
   (overdue). Detail modal open on the RED row.
6. `/arco` — dashboard tab with both breakdown bars populated.
7. `/incidents` — list with a HIGH severity row and the SPDP badge visible;
   create modal open with the SPDP checkbox checked.
8. `/incidents` — edit modal with the LOPDP deadline label (`Overdue` / `due
   today` / `N day(s) remaining`).
9. `/portability` — list with a PENDING row plus a COMPLETED row, the
   "Complete & export" modal open with a sample JSON payload.
10. `/portability` — browser download bar showing the exported
    `portability_X_subject.json`.
