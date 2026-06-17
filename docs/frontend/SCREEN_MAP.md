# Frontend Screen Map — DataLegal 2.0

> Source of truth for every route the React app declares.
> Refreshed in **Sprint 10** (final polish) to reflect the live state after
> Sprints 6B / 7 / 8 / 9 / 10.

Legend for **Status**:

- `live` — page is fully implemented and hits real backend endpoints.
- `auth` — unauthenticated screen (no AppShell).

There are no `placeholder` routes after Sprint 10. The `ModulePlaceholder`
component and `pages/placeholders/index.tsx` remain on disk as a historical
reference but no route wires them.

## Public / authentication

| Route | Page | Status | Roles | Notes |
| --- | --- | --- | --- | --- |
| `/login` | `pages/Login.tsx` | auth | any | Email + password, redirects to `/mfa-verify` on `mfa_required`. |
| `/mfa-verify` | `pages/MFAVerify.tsx` | auth | any | Consumes `sessionStorage.mfa_token`. |
| `/mfa-setup` | `pages/MFASetup.tsx` | live | authenticated | QR + manual key + 6-digit confirm. All copy now reads from `i18n/en.json`. |

## Overview

| Route | Page | Status | Roles | Notes |
| --- | --- | --- | --- | --- |
| `/` → `/dashboard` | redirect | — | any | Default route. |
| `/dashboard` | `pages/Dashboard.tsx` | live | all | KPI grid + trend SVG + alert feed + quick actions. Calls `/reports/kpis`, `/reports/trends`, `/alerts?limit=5`. PDF/CSV export wired to `/reports/summary/{pdf,csv}`. |
| `/alerts` | `pages/Alerts.tsx` | live | all | Tabs: unread / all. Mark read + delete. Create gated to DPO/ADMIN/SUPER_ADMIN. Calls `/alerts`. |
| `/reports` | `pages/Reports.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD, AUDITOR | KPIs + trends + consolidated summary + PDF/CSV export. |

## Organization (RF-01, RF-03, RF-19, RF-24, RF-34, RF-39-41)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/users` | `pages/UserManagement.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 6B |
| `/departments` | `pages/Departments.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 7 |
| `/company-profile` | `pages/CompanyProfile.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 7 |
| `/catalogs` | `pages/Catalogs.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 7 |
| `/sectors` | `pages/Sectors.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 7 |
| `/tenants` | `pages/Tenants.tsx` | live | SUPER_ADMIN | 7 |

## Data registry (RF-04, RF-05, RF-11, RF-21, RF-29, RF-35, RF-36, RF-38)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/data-inventory` | `pages/DataInventory.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 7 |
| `/treatment-activities` | `pages/TreatmentActivities.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 7 |
| `/information-assets` | `pages/InformationAssets.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 7 |
| `/retention` | `pages/Retention.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 7 |
| `/import-export` | `pages/ImportExport.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 7 |

## Risk and DPIA (RF-09, RF-10, RF-37, RF-40)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/risk-assessments` | `pages/RiskAssessments.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 8 |
| `/dpias` | `pages/DPIAs.tsx` | live | SUPER_ADMIN, DPO | 8 |

## Rights and incidents (RF-07, RF-08, RF-26, RF-30, RF-32)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/arco` | `pages/ARCO.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 8 |
| `/portability` | `pages/Portability.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 8 |
| `/incidents` | `pages/Incidents.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 8 |
| `/consents` | `pages/Consents.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 9 |

## Documents (RF-14, RF-25, RF-31, RF-33)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/legal-documents` | `pages/LegalDocuments.tsx` | live | SUPER_ADMIN, DPO, ADMIN | 9 |
| `/ropa` | `pages/ROPA.tsx` | live | SUPER_ADMIN, DPO, ADMIN, AUDITOR | 9 |

## Operations (RF-12, RF-13, RF-15, RF-16, RF-42, RF-43)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/action-plans` | `pages/ActionPlans.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 9 |
| `/audit-plans` | `pages/AuditPlans.tsx` | live | SUPER_ADMIN, DPO, AUDITOR | 9 |
| `/remediations` | `pages/Remediations.tsx` | live | SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD | 9 |

## Support / transversal (RF-17, RF-18, RF-22, RF-23, RF-27, RF-28)

| Route | Page | Status | Roles | Sprint |
| --- | --- | --- | --- | --- |
| `/audit-log` | `pages/AuditLog.tsx` | live | SUPER_ADMIN, DPO, AUDITOR | 9 |
| `/training` | `pages/Training.tsx` | live | all | 9 |
| `/backups` | `pages/Backups.tsx` | live | SUPER_ADMIN (create); all read | 9 |
| `/settings` | `pages/Settings.tsx` | live | all | 10 |

## Catch-all

`*` → redirects to `/dashboard` via `App.tsx`.

## Navigation source of truth

Sidebar groups are declared in `frontend/src/routes/navigation.ts`. Route
protection and lazy-import wiring lives in `frontend/src/routes/routes.tsx`.
To add a new route:

1. Add the page under `frontend/src/pages/`.
2. Register a `RouteDef` entry in `routes.tsx` with the right `roles` array.
3. Add a `NavItem` to the appropriate `NavGroup` in `navigation.ts`.
4. Add `nav.<key>` and any module-specific strings to `i18n/en.json`.
5. Update this file and `API_INTEGRATION_MATRIX.md` in the same PR.

## Screenshot checklist (Sprint 10 release demo)

Capture at 1440×900 (desktop) and 390×844 (mobile) for the launch deck:

- [ ] `/login` and `/mfa-verify`
- [ ] `/dashboard` with populated KPIs + trends + recent alerts
- [ ] `/reports` KPIs tab + trends tab + summary tab
- [ ] `/risk-assessments` dashboard tab (green/yellow/red distribution)
- [ ] `/dpias` list + wizard step 3 + signed-DPIA PDF download
- [ ] `/arco` list + SLA traffic light + ticket detail
- [ ] `/incidents` list with regulator-deadline cell visible
- [ ] `/treatment-activities` wizard step 1-4
- [ ] `/audit-plans` findings modal open
- [ ] `/training` catalog drilldown + enrollments tab
- [ ] `/backups` DR posture card (SUPER_ADMIN)
- [ ] `/settings` (Sprint 10 — identity / security / preferences / about)
- [ ] Sidebar collapsed/open on mobile width
