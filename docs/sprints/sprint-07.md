# Sprint 7 — Organization & Data Inventory UI

> Branch: `sprint/07-organization-inventory-ui`
> Base: `sprint/06-hardening-ui-foundation`
> Sprint scope (orchestrator): "Implement real screens (NOT placeholders) for
> Organization (4.1), Data Registry (4.2) and Transversal Import/Export (4.6)
> using the glassmorphism design system and real backend APIs."

## Objective

Replace the Sprint 6B module placeholders with production-quality React pages
for Module 4.1 (Organization Management), Module 4.2 (Data Registry &
Processing) and the Import/Export slice of Module 4.6 (Transversal & Support).
Every page must:

- Compose from the shared glassmorphism UI kit (`frontend/src/components/ui/*`).
- Call live backend endpoints via the project's `frontend/src/api/*` wrappers
  (no fake static data, no direct `axios` usage).
- Read every visible string from `frontend/src/i18n/en.json`
  (`react-i18next`), per RF-22 (English MVP).
- Render `LoadingState`, `ErrorState` and `EmptyState` from the kit (no silent
  spinners).
- Respect the role gating already declared in `frontend/src/routes/routes.tsx`
  and `frontend/src/routes/navigation.ts`.

## What was built

### Pages (real UI, not placeholders)

| Path                    | File                                                | Module | Highlights |
|-------------------------|-----------------------------------------------------|--------|------------|
| `/departments`          | `frontend/src/pages/Departments.tsx`                | 4.1    | CRUD with `DataTable`, create/edit modal, delete-confirm dialog, head-user picker pulled from `/users`. |
| `/company-profile`      | `frontend/src/pages/CompanyProfile.tsx`             | 4.1    | View/edit form for company + DPO. DPO/SUPER_ADMIN gate enforced client-side; RUC read-only; sector dropdown sourced from `/sectors`. |
| `/tenants`              | `frontend/src/pages/Tenants.tsx`                    | 4.1    | SUPER_ADMIN-only provisioning flow with two-section modal (tenant + initial admin). Posts to `/tenants/provision`. |
| `/sectors`              | `frontend/src/pages/Sectors.tsx`                    | 4.1    | Grid of economic sectors with suggested data types / activities / templates; click "Use this sector" to PATCH `/sectors/company/sector`. New route. |
| `/catalogs`             | `frontend/src/pages/Catalogs.tsx`                   | 4.1    | Type filter, edit modal, safe delete with HTTP 409 referential-integrity handling, CSV bulk-load modal (`POST /catalogs/bulk-load`). |
| `/data-inventory`       | `frontend/src/pages/DataInventory.tsx`              | 4.2    | KPI quad + three breakdown cards (status / risk / classification) over `/data-inventory/progress`. |
| `/treatment-activities` | `frontend/src/pages/TreatmentActivities.tsx`        | 4.2    | List + status filter + **4-step RoT wizard** (start → legal-basis → transfers → finalize) + standalone edit modal. |
| `/information-assets`   | `frontend/src/pages/InformationAssets.tsx`          | 4.2    | List with classification filter, create/edit with catalog-driven dropdowns (ASSET_TYPE / ASSET_FORMAT / STORAGE_MEDIUM / CLASSIFICATION_LEVEL). Fallback classifications match the LOPDP defaults if no catalog is loaded. |
| `/retention`            | `frontend/src/pages/Retention.tsx`                  | 4.2    | Four-tab layout (Policies / Records / Expired under review / Execution logs) + manual `POST /retention/execute` runner + review-decision modal. |
| `/import-export`        | `frontend/src/pages/ImportExport.tsx`               | 4.6    | Tabs: (1) Import CSV or JSON with preview, partial-success handling and row-error list; (2) Export treatment-activity CSV and compliance JSON. |

### Shared additions

- `frontend/src/lib/errors.ts` — `extractErrorMessage(err, fallback)` and
  `getStatus(err)` helpers that pull `response.data.detail` (string or pydantic
  array shape) consistently. Used everywhere new code surfaces a server error.
- `frontend/src/routes/navigation.ts` — added `/sectors` to the **Organization**
  group, gated to `SUPER_ADMIN / DPO / ADMIN`.
- `frontend/src/routes/routes.tsx` — replaced ten module placeholders with the
  real components. Sprint 8/9 placeholders left untouched.
- `frontend/src/i18n/en.json` — added top-level keys: `departments`,
  `companyProfile`, `tenants`, `sectors`, `catalogs`, `dataInventory`,
  `treatmentActivities`, `informationAssets`, `retention`, `importExport`, plus
  `common.*` extensions (`edit`, `previous`, `refresh`, etc.) and
  `nav.sectors`. Every user-visible string in the new pages reads from here.

### API/types contract fixes

While integrating the wrappers against the live backend I found three
mismatches with the FastAPI router signatures and corrected them:

| File | Fix |
|------|-----|
| `frontend/src/api/sectors.ts` | `setCompanySector(code)` now sends `{ sector }` (backend `SectorUpdate.sector`), not the old `{ sector_code }`. Returns the typed `SectorUpdateResponse` (`sector / label / suggestions / message`). |
| `frontend/src/api/importExport.ts` | `BulkImportRequest` body is `{ activities: […] }` (was `{ records }`); result is `{ created, errors[] }` with `BulkImportError { row, detail }`. |
| `frontend/src/api/retention.ts` | `listRetentionRecords` query param is `record_status` (was `status`); `RetentionExecuteBody.run_type` (was `dry_run`). |
| `frontend/src/types/organization.ts` | `SectorSuggestions` now matches the live `/sectors` payload (`sector_code / label / suggested_data_types / suggested_activities / suggested_templates`). |
| `frontend/src/types/dataRegistry.ts` | `DataInventoryProgress` now mirrors the nested backend shape (`treatment_activities: { total, draft, active, archived, with_risk_assessment, completion_pct }` plus `information_assets_total`, `risk_assessments_total`, `risk_distribution`, `classification_distribution`, `as_of`). |

These corrections were necessary for the new pages to type-check against the
backend, and the changes are transparent to the rest of the codebase.

## How to run

```bash
# Frontend dev (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:3000 by default (proxy → :8000)

# Backend dev (separate terminal)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Open `/login`, sign in as DPO/ADMIN to exercise Organization + Data Registry,
or as SUPER_ADMIN to additionally see `/tenants`. The Sprint 7 routes appear
under the existing **Organization** and **Data registry** groups in the
sidebar; Import/Export is under **Data registry**.

## Verification gate

All commands run from the repo root.

```bash
cd frontend
npm install                       # 171 packages, 0 vulns
npm run lint                      # tsc --noEmit         → clean
npm run build                     # tsc + vite build     → built in ~7s
npm audit --audit-level=low       # found 0 vulnerabilities

cd ../backend
source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -q                  # 290 passed
ruff check .                      # All checks passed!
```

Bundle deltas (gzipped, lazy-loaded chunks):

```
TreatmentActivities    3.57 kB    (largest new page; hosts the RoT wizard)
Retention              3.09 kB
InformationAssets      2.62 kB
ImportExport           2.51 kB
Catalogs               2.97 kB
Tenants                1.75 kB
Departments            1.64 kB
CompanyProfile         1.52 kB
DataInventory          1.40 kB
Sectors                1.20 kB
```

Each page lazy-loads from `routes.tsx`, so unrelated routes are unchanged.

## What is intentionally not in scope

- **Frontend test runner**. No `vitest`/`jest` is configured in `frontend/`;
  the `lint` script is `tsc --noEmit` and `build` runs `tsc && vite build`.
  Type-checking the new pages against the live API types already exercises the
  client/server contract end-to-end. Adding a test runner is a separate scope.
- **Sprint 8/9 modules**. Risk assessments, DPIAs, ARCO, portability,
  incidents, consents, legal documents, ROPA, action plans, audit plans,
  remediations, audit log, training, backups, settings — all still ship the
  Sprint 6B `ModulePlaceholder`. They are not part of Sprint 7's scope.
- **Catalog inline edit**. The catalogs page uses a modal (not inline cell
  editing) so the design system stays consistent with the rest of the app.
  Inline editing of catalog tables is a possible Sprint 9 polish.

## Risks & known gaps

- **CSV parsing** in `ImportExport` and `Catalogs` is a small hand-rolled
  parser (RFC-4180 quotes, comma-only delimiters). For the MVP it handles the
  documented columns; for richer inputs (TSV, escaped newlines inside fields)
  we should pull in `papaparse` in Sprint 9.
- **Tenants — sector dropdown** posts a plain code string. If a Super-Admin
  picks a sector that isn't in the backend's `SECTOR_CATALOG`, the backend
  rejects with HTTP 400. The page surfaces that via the form-level error.
- **Information assets — catalog dependency**. Asset type / format / storage
  medium dropdowns are sourced from `/catalogs/{type}` and the UI surfaces a
  hint ("No catalog entries configured for ASSET_TYPE…") when the catalog is
  empty. The classification dropdown falls back to the LOPDP defaults
  (`PUBLICA_USO_INTERNO`, `PUBLICA_CLASIFICADA`, `PUBLICA_RESERVADA`) when no
  `CLASSIFICATION_LEVEL` catalog rows exist, so an empty workspace can still
  create assets.
- **Retention — expired-under-review** only lists records that have both
  `expiry_date < today` **and** `legal_hold=true` (US-RF29-1). The page
  documents that constraint inline so DPOs aren't surprised.
- **DEPT_HEAD scoping** is enforced server-side. The new pages don't
  re-implement it; they just respect what the API returns.

## Screenshots checklist

When demoing Sprint 7 capture these in order:

1. `/departments` — list with at least two rows + edit modal open.
2. `/company-profile` — DPO section filled, with the "Save changes" button
   visible.
3. `/tenants` (SUPER_ADMIN) — provisioning modal open with the two sections.
4. `/sectors` — grid with one card visibly active (badge "Active").
5. `/catalogs` — type filter pulled to ASSET_TYPE + bulk-import modal open.
6. `/data-inventory` — KPI quad + three breakdown bars filled.
7. `/treatment-activities` — list + RoT wizard step 2 (legal basis & data).
8. `/information-assets` — create modal with all four catalog dropdowns
   populated.
9. `/retention` — Expired-under-review tab with the manual execute panel.
10. `/import-export` — Import tab with a 3-row CSV preview + green success
    banner.
