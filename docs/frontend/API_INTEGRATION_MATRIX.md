# Frontend ↔ Backend API Integration Matrix

> One row per UI module. `Wrapper` is the TypeScript file under `frontend/src/api/`.
> `UI status` mirrors `SCREEN_MAP.md`.
>
> Refreshed in **Sprint 10** — every wrapper is now exercised by a live page.

| Module | UI route | Wrapper | Backend prefix | Key endpoints | RFs | UI status |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | `/login`, `/mfa-*` | `auth.ts` | `/api/v1/auth` | `POST /login`, `POST /mfa-verify`, `POST /mfa-setup`, `POST /mfa-confirm` | RF-02 | live |
| Users | `/users` | `users.ts` | `/api/v1/users` | `GET /`, `POST /`, `PUT /{id}`, `DELETE /{id}` | RF-01, RF-24 | live |
| Departments | `/departments` | `departments.ts` | `/api/v1/departments` | `GET /`, `POST /`, `PUT /{id}`, `DELETE /{id}` | RF-01 | live (Sprint 7) |
| Company profile | `/company-profile` | `companyProfile.ts` | `/api/v1/company-profile` | `GET /`, `PUT /` | RF-03 | live (Sprint 7) |
| Tenants | `/tenants` | `tenants.ts` | `/api/v1/tenants` | `GET /`, `GET /{id}`, `POST /provision` | RF-19, RF-41 | live (Sprint 7) |
| Catalogs | `/catalogs` | `catalogs.ts` | `/api/v1/catalogs` | `GET /`, `GET /{type}`, `POST /bulk-load`, `PATCH /{id}`, `DELETE /{id}` | RF-20, RF-39, RF-40 | live (Sprint 7) |
| Sectors | `/sectors`, `/company-profile` | `sectors.ts` | `/api/v1/sectors` | `GET /`, `GET /{code}`, `PATCH /company/sector` | RF-34 | live (Sprint 7) |
| Data inventory | `/data-inventory` | `dataInventory.ts` | `/api/v1/data-inventory` | `GET /progress` | RF-04, RF-29 | live (Sprint 7) |
| Treatment activities | `/treatment-activities` | `treatmentActivities.ts` | `/api/v1/treatment-activities` | `GET /`, `POST /`, `PATCH /{id}`, `DELETE /{id}`, wizard endpoints (`/wizard/start`, `/wizard/{id}/legal-basis`, `/wizard/{id}/transfers`, `/wizard/{id}/finalize`) | RF-04, RF-11 | live (Sprint 7) |
| Information assets | `/information-assets` | `informationAssets.ts` | `/api/v1/information-assets` | `GET /`, `POST /`, `PATCH /{id}`, `DELETE /{id}` | RF-35, RF-36, RF-38 | live (Sprint 7) |
| Retention | `/retention` | `retention.ts` | `/api/v1/retention` | `GET /policies`, `POST /policies`, `PATCH /policies/{id}`, `GET /records?record_status=`, `POST /records`, `GET /expired-under-review`, `POST /execute`, `GET /execution-logs` | RF-05, RF-11, RF-29 | live (Sprint 7) |
| Import / export | `/import-export` | `importExport.ts` | `/api/v1/{import,export}` | `POST /import/treatment-activities`, `GET /export/treatment-activities` (CSV blob), `GET /export/compliance-report` | RF-21 | live (Sprint 7) |
| Risks | `/risk-assessments` | `riskAssessments.ts` | `/api/v1/risk-assessments` | `GET /questionnaire`, `GET /dashboard`, `GET /`, `POST /`, `PATCH /{id}` | RF-10, RF-37 | live (Sprint 8) |
| DPIA | `/dpias` | `dpias.ts` | `/api/v1/dpias` | `GET /`, `POST /`, `PATCH /{id}`, `POST /{id}/sign`, `GET /{id}/pdf` (blob) | RF-09 | live (Sprint 8) |
| ARCO | `/arco` | `arco.ts` | `/api/v1/arco-requests` | `GET /dashboard`, `GET /?status=`, `POST /`, `PATCH /{id}`, `GET /{id}/sla-status` | RF-07, RF-30 | live (Sprint 8) |
| Portability | `/portability` | `portability.ts` | `/api/v1/portability` | `GET /`, `POST /`, `PUT /{id}/complete`, `GET /{id}/export` (JSON; client builds the Blob) | RF-26 | live (Sprint 8) |
| Incidents | `/incidents` | `incidents.ts` | `/api/v1/incidents` | `GET /`, `POST /`, `PATCH /{id}`, `POST /{id}/notify` | RF-08 | live (Sprint 8) |
| Consents | `/consents` | `consents.ts` | `/api/v1/consents`, `/cookie-banners`, `/cookie-consents` | `GET /consents/stats`, `GET /consents`, `POST /consents`, `POST /consents/{id}/revoke`, cookie banners + consents | RF-06, RF-25, RF-32 | live (Sprint 9) |
| Legal documents | `/legal-documents` | `legalDocuments.ts` | `/api/v1/legal-documents` | `GET /template-types`, `GET /`, `POST /`, `GET /{id}/pdf` (blob) | RF-14, RF-33 | live (Sprint 9) |
| ROPA | `/ropa` | `ropa.ts` | `/api/v1/ropa` | `GET /`, `GET /pdf` (blob) | RF-31 | live (Sprint 9) |
| Action plans | `/action-plans` | `actionPlans.ts` | `/api/v1/action-plans` | `GET /templates`, `POST /templates`, `POST /auto-generate`, `GET /?plan_status=`, `POST /`, `PATCH /{id}` | RF-12, RF-43 | live (Sprint 9) |
| Audit plans | `/audit-plans` | `auditPlans.ts` | `/api/v1/audit-plans` | `GET /?plan_status=`, `POST /`, `PATCH /{id}`, `POST /findings`, `GET /{id}/findings?finding_status=`, `PATCH /findings/{id}`, `GET /{id}/report` (blob) | RF-13 | live (Sprint 9) |
| Remediations | `/remediations` | `remediations.ts` | `/api/v1/remediations` | `GET /?remediation_status=`, `POST /`, `PATCH /{id}` | RF-12, RF-13 | live (Sprint 9) |
| Reports | `/reports`, `/dashboard` | `reports.ts` | `/api/v1/reports` | `GET /kpis`, `GET /trends?months=`, `GET /summary`, `GET /summary/pdf` (blob), `GET /summary/csv` (blob) | RF-15, RF-16, RF-42 | live (Sprint 9) |
| Alerts | `/alerts`, AppShell topbar | `alerts.ts` | `/api/v1/alerts` | `GET /unread-count`, `GET /`, `POST /`, `PATCH /{id}/read`, `DELETE /{id}` | RF-18 | live (Sprint 9) |
| Audit log | `/audit-log` | `audit.ts` | `/api/v1/audit` | `GET /`, `GET /export` (CSV blob; requires `audit:export`) | RF-17 | live (Sprint 9) |
| Training | `/training` | `training.ts` | `/api/v1/training` | programs / modules / materials / enrollments CRUD | RF-27, RF-28 | live (Sprint 9) |
| Backups | `/backups` | `backups.ts` | `/api/v1/backups` | `GET /`, `POST /create` (SUPER_ADMIN for SQLite), `POST /{id}/verify` | RF-23 | live (Sprint 9) |
| Settings | `/settings` | (no wrapper) | — | Reads `localStorage` (token / role / tenant) via `useAuth`; links to `/mfa-setup` and clears local session on sign-out. | RF-22 | live (Sprint 10) |

## Conventions enforced in this matrix

- Every wrapper imports `apiClient` from `src/api/client.ts`. Never call axios directly.
- All blob downloads use `responseType: 'blob'` (or build a Blob client-side, as in
  `/portability/{id}/export`) and feed `downloadBlob(blob, filename)` from
  `src/lib/format.ts`.
- Wrappers return strongly typed payloads from `src/types/*` — no `any` and no
  `[key: string]: unknown` escape hatches at the wrapper boundary.
- Wrappers do not handle 401 — the global axios response interceptor clears auth
  state and redirects to `/login`.
- Wrappers never read `localStorage`; auth headers are attached by the
  interceptor.
- 403 / 404 / 422 surface as rejected promises; pages render `<ErrorState />`
  or inline `Alert` tone components. No silent swallow.
- The `?status=` parameter is the **public** alias on `/arco-requests`. Action
  plans, audit plans, findings and remediations expose their list filter as
  `plan_status`, `finding_status` and `remediation_status` respectively so
  FastAPI does not shadow the `status` module — wrappers must match the public
  name. Retention keeps the Sprint 7 alias `?record_status=`.

## Known gaps (post-Sprint 10)

- No client-side cache layer. Pages re-fetch on mount; acceptable for the MVP.
- No request cancellation. Acceptable for the navigations we ship (< 200 ms).
- No optimistic state. Loading flashes are deliberate.
- No `/me` endpoint. Settings derives identity from the JWT-bound role and
  tenant ID stored in `localStorage`. If a per-user profile screen is added
  later, a dedicated `/auth/me` endpoint should land first.
