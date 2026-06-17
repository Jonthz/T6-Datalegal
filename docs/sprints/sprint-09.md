# Sprint 9 — Documents, Operations, Reports, Alerts, Training, Backups UI

> Branch: `sprint/09-documents-operations-ui`
> Base: `sprint/08-risk-compliance-ui`
> Sprint scope (orchestrator): "Implement the remaining real UI pages for
> Consents, Legal Documents, ROPA, Action Plans, Audit Plans, Remediations,
> Reports, Alerts, Audit Log, Training and Backups on top of the Sprint 6B
> glassmorphism design system and the live FastAPI backend."

## Objective

Replace the last Sprint 6B placeholders with production-quality React pages,
matching the Sprint 7/8 conventions:

- Compose from the shared glassmorphism UI kit (`frontend/src/components/ui/*`).
- Call live backend endpoints via `frontend/src/api/*` wrappers (no fake static
  data, no direct `axios` usage).
- Read every visible string from `frontend/src/i18n/en.json` (`react-i18next`),
  per RF-22 (English MVP).
- Render `LoadingState`, `ErrorState`, `EmptyState` and `Alert` from the kit;
  never silent spinners.
- Respect the role gating already declared in `frontend/src/routes/routes.tsx`
  and `frontend/src/routes/navigation.ts`.

## What was built

### Pages (real UI, not placeholders)

| Path                | File                                | Module / RFs    | Highlights |
|---------------------|-------------------------------------|-----------------|------------|
| `/consents`         | `frontend/src/pages/Consents.tsx`   | 4.4 / RF-32, RF-33 | Tabbed page: (1) **Records** with filter (all/active/revoked), create modal (`data_subject_token`, `purpose`, `legal_basis`, optional `treatment_activity_id`, `is_sensitive`), per-row **Revoke** action with reason. (2) **Cookie banners** with create + activate/deactivate. (3) **Cookie consents** record/revoke flow. KPI strip with `total / active / revoked / sensitive` from `/consents/stats` plus the backend's revocation rate. |
| `/legal-documents`  | `frontend/src/pages/LegalDocuments.tsx` | 4.4 / RF-31 | Catalog of template types loaded from `/legal-documents/template-types` rendered as glass cards with **Generate** button per template, filter (doc_type + current-only), list with version badge, "current" badge, download-PDF button per row. Creating a new document automatically demotes prior `is_current` per backend contract. |
| `/ropa`             | `frontend/src/pages/ROPA.tsx`       | 4.4 / RF-31     | View page grouped **by legal basis** (using the live backend response shape `{ tenant_id, total_activities, activities_by_legal_basis }`), with per-activity card showing purpose, data types, subjects, retention, cross-border flag, processor. KPI strip + Download PDF. |
| `/action-plans`     | `frontend/src/pages/ActionPlans.tsx` | 4.5 / RF-11    | Tabbed page: (1) **Plans** with status filter, create modal (template selector, link-to-risk-assessment, target date, inline **task editor**), edit modal mirroring it, **Auto-generate** button calling `POST /action-plans/auto-generate` (idempotent), per-row overdue badge and auto-generated badge. (2) **Templates** with create modal. |
| `/audit-plans`      | `frontend/src/pages/AuditPlans.tsx` | 4.5 / RF-12     | Plans list with status filter, create/edit modals (name/scope/period/notes), **Findings** modal opened per plan with embedded DataTable, add-finding modal (title/description/evidence/severity/remediation date), edit-finding modal with status, **Report PDF** download per plan. |
| `/remediations`     | `frontend/src/pages/Remediations.tsx` | 4.5 / RF-13   | Linked to risk assessments. List with status and risk filters, create modal, edit modal capturing pre/post risk score + level + completion date. Per-row overdue badge. |
| `/reports`          | `frontend/src/pages/Reports.tsx`    | 4.6 / RF-15, RF-16 | Tabbed page: (1) **KPIs** (4 cards from `/reports/kpis` matching backend shape `pct_activities_active / avg_risk_score / pct_arco_on_time / reported_breaches` + 3-row live alerts panel for overdue ARCO / open critical findings / open high-risk). (2) **Trends** with 3/6/12/24 month range selector and a bar-style trend table for activities/risks/incidents/arco/consents. (3) **Consolidated summary** grouped cards. PDF + CSV export buttons. |
| `/alerts`           | `frontend/src/pages/Alerts.tsx`     | 4.6 / RF-18     | Centered-max-width layout per scope. Unread-count KPI strip; tabs for unread vs. all; create modal gated to DPO/ADMIN/SUPER_ADMIN; mark-read and delete actions per row; broadcast badge for tenant-wide alerts. |
| `/audit-log`        | `frontend/src/pages/AuditLog.tsx`   | 4.6 / RF-19     | Filter panel (action / user_id / from / to), action-badge tone derived from verb (CREATE→success, DELETE→danger, UPDATE→warning, LOGIN/VIEW→info), CSV export with 403 surfaced as `auditLog.exportForbidden`. |
| `/training`         | `frontend/src/pages/Training.tsx`   | 4.6 / RF-20     | Two-tab page: (1) **Catalog** with three-column drilldown (Programs → Modules → Materials), all CRUD inline. (2) **Enrollments** with user/program selector, progress bar + ±25% controls; auto-marks `completed_at` at 100%. |
| `/backups`          | `frontend/src/pages/Backups.tsx`    | 4.6 / RF-23     | SUPER_ADMIN gated: page renders for everyone but **Create** button is disabled and a warning Alert explains the cross-tenant snapshot constraint. KPI strip (total / verified / time-since-last-backup vs RPO / target RTO). DR posture card with RPO/RTO badges. Verify button per row with checksum mismatch surfaced. |

### Shared additions and fixes

- `frontend/src/types/documents.ts` — replaced the loose `ROPAReport` shape
  with the actual backend response (`tenant_id`, `total_activities`,
  `activities_by_legal_basis: Record<string, ROPAActivity[]>`). New
  `ROPAActivity` interface re-exported from `frontend/src/types/index.ts`.
- `frontend/src/types/transversal.ts` — replaced the speculative
  `ReportKPIs` / `ReportTrends` / `ConsolidatedSummaryReport` shapes with the
  live FastAPI ones (`pct_activities_active`, `avg_risk_score`,
  `pct_arco_on_time`, `reported_breaches`, `alerts.{...}`; `trends: ReportTrendPoint[]`;
  consolidated `risks/arco/incidents/action_plans/audits/consents` subobjects).
  Removed every `[key: string]: unknown` escape hatch — the page now type-checks
  against the live API.
- `frontend/src/types/rights.ts` — tightened `ConsentStats` to the actual
  backend shape (`total / active / revoked / sensitive / revocation_rate /
  by_legal_basis / by_treatment_activity`), same goal as above.
- `frontend/src/api/actionPlans.ts`, `auditPlans.ts`, `remediations.ts` —
  renamed the list query param from `status` to the backend's real alias
  (`plan_status` for action-plans and audit-plans, `finding_status` for
  audit-plan findings, `remediation_status` for remediations). The previous
  wrappers silently dropped the filter because FastAPI shadowed `status` with
  the `status` module import.
- `frontend/src/pages/Dashboard.tsx` and `frontend/src/pages/RiskAssessments.tsx`
  — updated to read the corrected `ReportKPIs` field names. The Sprint 6B
  speculative names (`activities_registered_pct`, `arco_ontime_pct`,
  `breaches_reported`, `risk_scores`) were never returned by the backend, so
  the prior KPI tiles always rendered "—".
- `frontend/src/i18n/en.json` — added top-level keys: `consents`,
  `legalDocuments`, `ropa`, `actionPlans`, `auditPlans`, `remediations`,
  `reports`, `auditLog`, `training`, `backups`, plus extra keys under `alerts`
  (`create`, `kpis`, `fields`, etc.).
- `frontend/src/routes/routes.tsx` — eleven module placeholders swapped for
  the real lazy-loaded components. The Sprint 6B `ModulePlaceholder` is now
  only wired for `/settings`, per the Sprint 7 convention. The Sprint 9
  placeholders themselves remain on disk in
  `frontend/src/pages/placeholders/index.tsx` for documentation parity with
  Sprint 7 and Sprint 8 — no route uses them.

### API/types contract observations

- `/api/v1/reports/kpis` returns `{ pct_activities_active, avg_risk_score,
  pct_arco_on_time, reported_breaches, alerts: { overdue_arco_requests,
  open_critical_findings, open_high_risk_assessments } }`. The previous
  TypeScript type was speculative — the page now mirrors the real response.
- `/api/v1/reports/trends?months=N` returns
  `{ months: N, trends: [{ month, new_treatment_activities, new_incidents,
  new_arco_requests, new_consents, new_risk_assessments }] }`. The trends
  table in `Reports.tsx` and the Dashboard SVG trend chart both consume that
  shape directly.
- `/api/v1/ropa` returns `{ generated_at, tenant_id, total_activities,
  activities_by_legal_basis: Record<string, ROPAActivity[]> }`. The page
  groups visually by legal basis to match the PDF layout.
- `/api/v1/action-plans?plan_status=...`, `/api/v1/audit-plans?plan_status=...`,
  `/api/v1/audit-plans/{id}/findings?finding_status=...`,
  `/api/v1/remediations?remediation_status=...`. FastAPI internally aliases
  these to avoid shadowing the `status` module — the frontend wrappers had to
  match the **public** param name (the alias is intentional in the backend).
- `/api/v1/backups/create` returns HTTP 403 when the backend runs on SQLite
  and the caller is not SUPER_ADMIN. The frontend surfaces that as
  `backups.forbidden`. PostgreSQL runs return PENDING status with a manual
  pg_dump note, surfaced as `backups.createPending`.
- `/api/v1/alerts` is the only resource where read access is **not** gated by
  the central `require_permission` matrix — tenant-scoped users see their own
  alerts plus broadcasts (recipient_id null) regardless of role. Creation,
  update and delete still go through `alerts:c / alerts:u / alerts:d` and
  surface `auditLog.exportForbidden`-style 403 messages.

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

Sign in as DPO/SUPER_ADMIN to exercise the full workflow; AUDITOR can reach
`/ropa`, `/audit-plans` and `/audit-log`; SUPER_ADMIN is required for
`/backups` (button enabled). The new routes are grouped under **Rights &
incidents** (`consents`), **Documents** (`legal-documents`, `ropa`),
**Operations** (`action-plans`, `audit-plans`, `remediations`) and **Support**
(`audit-log`, `training`, `backups`) in the sidebar — those groups were already
declared in `navigation.ts` so this sprint did not add new sidebar entries.

## Verification gate

```bash
cd frontend
npm install                       # up to date, audited 171 packages
npm run lint                      # tsc --noEmit -> clean
npm run build                     # vite build -> 14 new lazy chunks emitted
npm audit --audit-level=low       # 0 vulnerabilities

cd ../backend
source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v                  # 290 passed
ruff check .                      # All checks passed!
```

Bundle deltas (gzipped, lazy-loaded chunks added by Sprint 9):

```
Training              3.91 kB   (3-column drilldown + enrollments)
Consents              3.77 kB   (records + banners + cookie consents)
ActionPlans           3.48 kB   (plans + templates + task editor)
AuditPlans            3.12 kB   (plans + findings + report PDF)
Reports               2.59 kB   (KPIs + trends + summary)
Remediations          2.45 kB   (linked to risks)
LegalDocuments        2.42 kB   (catalog + version list)
Alerts                2.22 kB   (centered, create + KPIs)
Backups               2.04 kB   (SUPER_ADMIN gate + RPO/RTO)
AuditLog              1.62 kB   (filterable + CSV export)
ROPA                  1.59 kB   (grouped by legal basis)
```

Each page lazy-loads from `routes.tsx`, so unrelated routes are unchanged.

## What is intentionally not in scope

- **Frontend test runner**. No `vitest`/`jest` is configured; `lint` is
  `tsc --noEmit` and `build` runs `tsc && vite build`. Type-checking the new
  pages against the corrected API types already exercises the client/server
  contract end-to-end. Adding a test runner is a separate scope.
- **Settings page**. Sprint 10 owns `/settings` — the Sprint 6B placeholder
  is still wired.
- **Alembic migrations / pg_dump**. The backend `/backups/create` route still
  returns PENDING for PostgreSQL and SUPER_ADMIN must run `pg_dump`
  separately. The UI labels this clearly.
- **Email notifications**. Alerts remain in-app only; nothing is sent over
  SMTP. Sprint 9 wires the inbox, not the relay.
- **Risk + remediation closed-loop**. Updating `risk_score_after`/`risk_level_after`
  on a remediation does **not** mutate the linked `RiskAssessment` row — the
  backend keeps both rows distinct for audit. The UI now surfaces the before/after
  values so a DPO can compare them visually.

## Risks & known gaps

- **Backup checksum verification** runs synchronously inside the request. For
  multi-GB PostgreSQL dumps this is intentionally not done in the UI — the
  `verifyBackup` button only works against SQLite snapshots and the page
  shows "Checksum unverified" in the DR posture badge until at least one row
  has `status=VERIFIED`.
- **CSV export of the audit log** uses the `audit:export` permission, which
  is currently only granted to SUPER_ADMIN, DPO and AUDITOR. We surface the
  403 explicitly so other roles don't see a generic "Something went wrong".
- **ROPA PDF size**. For tenants with hundreds of activities the generated
  PDF can exceed 1 MB. We do not stream — the existing backend endpoint
  buffers the full PDF in memory. The button shows a loading spinner so the
  user knows the click was accepted.
- **Action-plan auto-generate is idempotent**. The button always succeeds even
  when no new plans are created (`{count: 0}` toast). This matches the
  backend contract documented in Sprint 3.
- **Alerts mark-read race**. If two tabs are open the unread counter can drift
  by one until the next refresh; we refresh on tab change and explicit
  Refresh, but we do not poll.

## Screenshots checklist

When demoing Sprint 9 capture these in order:

1. `/consents` — Records tab with at least one active + one revoked record;
   create modal open; revoke modal open with reason.
2. `/consents` — Cookie banners tab with one active banner; cookie-consents
   tab showing the record/revoke flow.
3. `/legal-documents` — catalog of templates + version list with a "current"
   badge; PDF download triggered.
4. `/ropa` — grouped-by-legal-basis layout with a cross-border activity
   visible; PDF download triggered.
5. `/action-plans` — plans tab with one DRAFT + one ACTIVE + one OVERDUE row;
   auto-generate succeeded toast.
6. `/action-plans` — create modal with task editor populated from a template.
7. `/audit-plans` — list + findings modal open on a plan; add-finding modal
   open with CRITICAL severity.
8. `/audit-plans` — report PDF downloaded.
9. `/remediations` — list with overdue row and pre/post risk badges.
10. `/reports` — KPIs tab with the 3-row live alerts panel populated.
11. `/reports` — trends tab with bar-style table; PDF + CSV downloads.
12. `/alerts` — centered layout with unread badge + create modal (DPO).
13. `/audit-log` — filter panel narrowing to LOGIN actions; CSV export
    triggered.
14. `/training` — Catalog tab with a program → module → material drilldown;
    enrollments tab with progress bars + ±25% controls.
15. `/backups` — DR posture card with RPO badge + verify result toast.
