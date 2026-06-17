# DataLegal 2.0 — Backend/Frontend Unification + Glassmorphism UI Plan

> **For Hermes:** Use subagent-driven-development discipline, but execute implementation with Claude Code CLI (`claude -p`) because this project already uses Claude Code as the coding executor. Hermes is the orchestrator: it prepares context, launches one Claude Code session per phase, reviews, then launches the next phase.

**Goal:** Convert the current backend-first DataLegal implementation into a usable MVP where every required compliance module has a polished English frontend connected to the existing FastAPI backend, with production blockers fixed before UI expansion.

**Architecture:** Keep the existing FastAPI + React/Vite/Tailwind stack. Do not rewrite the backend. Add a proper frontend application shell, API client layer, shared domain types, module pages, forms, tables, dashboards, export/download flows, and E2E-style integration checks. Use glassmorphism as the visual system while preserving accessibility, responsive behavior, and professional legal/compliance tone.

**Tech Stack:** Backend FastAPI, SQLAlchemy, Alembic, pytest, ruff. Frontend React 18, TypeScript, Vite, Tailwind CSS, axios, react-router-dom, i18next. Add only small frontend libraries if justified: charting (`recharts` or equivalent), form validation (`zod` optional), icons (`lucide-react` optional). Avoid heavy UI frameworks unless Claude Code proves they reduce risk.

---

## 0. Current state and problem statement

Source evidence:
- `docs/PROJECT_BRIEF.md`
- `docs/plan/INDEX.md`
- `docs/plan/requirements/module-4-1-organization.md` through `module-4-6-transversal.md`
- `docs/plan/requirements/rnf.md`
- `docs/reviews/QA_DEEP_REVIEW_FINAL.md`
- Current backend branch: `origin/sprint/05-operations-reports`

Current backend status:
- 107 OpenAPI paths.
- Backend tests pass in QA: 268/268, 92% coverage.
- Backend modules exist for auth, users, departments, tenants, catalogs, training, audit, portability, treatment activities, information assets, risk assessments, incidents, retention, data inventory, company profile, DPIA, ARCO, ROPA, action plans, consents, legal documents, audit plans, remediations, sectors, reports, alerts, backups, import/export.

Current frontend status:
- Only pages: Login, MFA Verify, MFA Setup, Dashboard, User Management.
- Current dashboard is static and does not consume the compliance APIs.
- Missing UI for most RFs/US.

Production blockers from QA that must be fixed before frontend expansion:
1. `fpdf2` missing in backend dependencies.
2. Default `SECRET_KEY` in source.
3. SQLite backup endpoint can snapshot all tenants.
4. No real Alembic migrations.
5. MFA secret stored plaintext.
6. No IP/user rate limiting on auth/MFA.
7. CORS production settings not hardened.
8. `ruff check .` fails.
9. `init_db.py` out of sync with models.
10. Security headers/docs exposure need hardening.

---

## 1. Success definition

The plan is complete when:

1. Backend/frontend are integrated on a single sprint chain branch from `origin/sprint/05-operations-reports`.
2. The app can be used by a non-developer DPO/admin through the browser for all high-priority modules.
3. All MVP UI text is English by default per RF-22/RNF-12.
4. The visual system is consistently glassmorphic, responsive, and accessible.
5. Frontend consumes real API endpoints, not static mock cards, except where a placeholder is explicitly documented with a TODO and acceptance reason.
6. Backend production blockers above are resolved or explicitly gated/documented if impossible in this sprint chain.
7. Verification commands pass:
   - Backend: `pip install -e ".[dev]"`, `python -c "from app.main import app"`, `pytest tests/ -v`, `ruff check .`, `pip-audit`.
   - Frontend: `npm install`, `npm run lint`, `npm run build`, `npm audit --audit-level=low`.
8. Documentation updated:
   - `CLAUDE.md`
   - `docs/sprints/sprint-06.md` onward
   - `docs/frontend/SCREEN_MAP.md`
   - `docs/frontend/API_INTEGRATION_MATRIX.md`
   - screenshots or textual screenshots checklist for each core page.

---

## 2. Branching model

Base branch for this work:

```bash
git fetch origin
git checkout -b sprint/06-hardening-ui-foundation origin/sprint/05-operations-reports
```

Then continue sequentially:

- `sprint/06-hardening-ui-foundation` from `origin/sprint/05-operations-reports`
- `sprint/07-organization-inventory-ui` from `sprint/06-hardening-ui-foundation`
- `sprint/08-risk-compliance-ui` from `sprint/07-organization-inventory-ui`
- `sprint/09-documents-arco-operations-ui` from `sprint/08-risk-compliance-ui`
- `sprint/10-final-polish-qa` from `sprint/09-documents-arco-operations-ui`

Important: keep each branch pushed and PR opened against the previous sprint branch unless the team decides to fast-forward the full chain later.

---

## 3. Target information architecture / screen map

### 3.1 App shell

Routes and shell required in Sprint 6:

- `/login`
- `/mfa-verify`
- `/mfa-setup`
- `/dashboard`
- `/users`
- `/departments`
- `/company-profile`
- `/catalogs`
- `/data-inventory`
- `/treatment-activities`
- `/information-assets`
- `/risk-assessments`
- `/dpias`
- `/arco`
- `/portability`
- `/incidents`
- `/consents`
- `/legal-documents`
- `/ropa`
- `/action-plans`
- `/audit-plans`
- `/remediations`
- `/reports`
- `/alerts`
- `/training`
- `/backups`
- `/import-export`
- `/audit-log`
- `/settings`

Layout requirements:
- Left sidebar with grouped modules.
- Top bar with tenant/company, role, alert badge, user menu.
- Breadcrumbs.
- Protected routes using current auth flow.
- Permission-aware navigation: hide or disable unauthorized modules.
- Empty/error/loading states standardized.
- All strings in `frontend/src/i18n/en.json`.

### 3.2 Minimum pages by module and requirement mapping

Organization Management:
- Users page: existing but improve UX and connect permissions. RF-01, RF-02, RF-24.
- Departments page: CRUD departments. RF-01, RF-24.
- Company Profile page: company/DPO setup. RF-03.
- Tenants/provisioning page for SUPER_ADMIN only. RF-19, RF-41.
- Sectors page or company profile section for economic sector. RF-34.
- Catalogs page with editable/versioned master catalogs and bulk load. RF-20, RF-39, RF-40.

Data Registry and Processing:
- Data Inventory dashboard with progress cards. RF-04, RF-29.
- Treatment Activities page with list + guided RoT wizard. RF-04, RF-11.
- Information Assets page. RF-35, RF-36, RF-38.
- Retention page with policies, records, expired under review, execution logs. RF-05, RF-11, RF-29.
- Import/Export page for treatment activities CSV/JSON. RF-21.

Risk Analysis:
- Risk Assessments page with questionnaire, score, CIA/probability/impact rationale. RF-09, RF-10, RF-37.
- Risk dashboard with green/yellow/red distribution, trends, high-risk list. RF-10, RNF-29.
- DPIA page with three-section wizard, sign flow, PDF download. RF-09.

Document Generation / Rights / Incidents:
- ARCO page with dashboard, request list, create/edit, SLA status. RF-07, RF-30.
- Portability page with request, completion, export. RF-26.
- Incidents page with breach registration, deadline lights, notification action. RF-08.
- Legal Documents page with template type selector, generate, version list, PDF download. RF-14, RF-25, RF-33.
- ROPA page with complete register view and PDF download. RF-31.
- Consents page with records, revocation, cookie banners, cookie consent status. RF-06, RF-25, RF-32.

Action Plan / Audits / Reports:
- Action Plans page with templates, auto-generate, manual create/edit, status tracking. RF-12, RF-43.
- Audit Plans page with planning, findings, evidence metadata, PDF report. RF-13.
- Remediations page linked to findings/action plans. RF-12, RF-13.
- Reports page with filters and PDF/CSV export. RF-15, RF-42.
- Executive Dashboard with real KPIs, trends, alerts, links to evidence details. RF-16.

Transversal and Support:
- Alerts center with unread count, list, mark read/delete. RF-18.
- Audit Log page with filters and CSV export. RF-17.
- Training page with programs/modules/materials/enrollments/progress. RF-27, RF-28.
- Backups page with backup list, create/verify; must respect hardened backend permissions. RF-23.

---

## 4. Glassmorphism design system

Claude Code must implement a coherent visual language, not random Tailwind classes.

Design goals:
- Premium legal/compliance SaaS, not toy dashboard.
- Glass panels over subtle gradient background.
- High contrast and WCAG-conscious text.
- Calm palette: deep navy, indigo, cyan, emerald, amber, rose for risk/status.
- Use shadows, blur, borders, and translucency consistently.

Required components:
- `GlassCard`
- `GlassPanel`
- `PageHeader`
- `MetricCard`
- `StatusBadge`
- `RiskBadge`
- `DataTable`
- `FormField`
- `SelectField`
- `Modal`
- `Drawer` or `SidePanel`
- `EmptyState`
- `ErrorState`
- `LoadingSkeleton`
- `ConfirmDialog`
- `DateRangeFilter`
- `ExportButton`
- `WizardStepper`

Tailwind style tokens:
- Background: radial/linear gradients in `AppShell`.
- Glass panel: `bg-white/10 dark:bg-slate-950/40 backdrop-blur-xl border border-white/20 shadow-2xl`.
- Text: avoid low contrast; primary text should be near white on dark background or slate-900 on light panel.
- Risk colors:
  - Low: emerald
  - Medium: amber
  - High: rose/red
  - Critical/overdue: red with pulse only for urgent labels, not entire cards.

Accessibility constraints:
- Do not rely on color alone; include text labels and icons.
- Keyboard focus rings visible.
- Forms have labels, error text, and aria hints.
- Tables have responsive alternatives for small screens.

---

## 5. Claude Code work sessions

Each session below is one Claude Code run. Hermes should pass the session prompt, wait for completion, run verification, review diff, and only then launch the next session.

Common Claude Code prompt header for every session:

```text
You are Claude Code working in the DataLegal 2.0 repo.
Read CLAUDE.md, docs/PROJECT_BRIEF.md, docs/plan/INDEX.md, the relevant docs/plan/requirements/*.md files, and docs/reviews/QA_DEEP_REVIEW_FINAL.md before coding.
Create the requested sprint branch before edits.
Do not commit to main.
Implement only the scope of this session.
Use English for UI labels and documents.
Use Tailwind glassmorphism consistently.
Update CLAUDE.md if conventions change.
Add/update docs/sprints/sprint-NN.md with objective, implemented work, commands, pending risks, screenshots checklist.
Run required tests/builds before final response.
Push branch and open PR if gh auth is available; otherwise leave exact commands.
```

### Session 6A — Backend production hardening

Branch: `sprint/06-hardening-ui-foundation`

Objective: fix backend blockers that would make frontend integration unreliable or unsafe.

Scope:
1. Add `fpdf2>=2.7.9` to backend dependencies.
2. Remove unsafe production default for `SECRET_KEY`; allow dev default only if explicit `ENVIRONMENT=development` or local test settings justify it.
3. Add startup/config validation for production secrets and CORS.
4. Harden auth/MFA with rate limiting by IP/user where feasible.
5. Encrypt or otherwise protect `mfa_secret` at rest; include migration/backfill strategy or documented dev-only fallback.
6. Restrict SQLite backups to SUPER_ADMIN only or mark SQLite backups global; prevent tenant-scoped users from creating cross-tenant snapshots.
7. Sync `init_db.py` with all models.
8. Remove duplicate/dead `require_permission` definition.
9. Add security headers middleware and gate `/api/docs` in production if supported by current config.
10. Add minimal Alembic initial migration or a documented migration bootstrap that works from clean DB.
11. Run and fix `ruff check .`.

Verification:
```bash
cd backend
source .venv/bin/activate || true
pip install -e ".[dev]"
python -c "from app.main import app; print(len(app.routes))"
pytest tests/ -v
ruff check .
pip freeze | pip-audit
```

Acceptance:
- Clean install imports app without manual `pip install fpdf2`.
- Tests pass.
- Ruff passes.
- Tenant-scoped user cannot create unsafe SQLite backup.
- Production config fails fast without required secrets.

### Session 6B — Frontend foundation and design system

Branch: same `sprint/06-hardening-ui-foundation` after 6A.

Objective: create the frontend skeleton and reusable glassmorphic component system before module pages.

Scope:
1. Refactor `frontend/src/App.tsx` routes into a maintainable route config.
2. Create `frontend/src/components/ui/` with shared components listed in section 4.
3. Create `frontend/src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `Breadcrumbs.tsx`.
4. Create `frontend/src/api/` wrappers for all backend modules, even if some pages are implemented later.
5. Create shared domain types in `frontend/src/types/` split by module.
6. Create placeholder route pages for every module with `Coming implementation in Sprint 7/8/9` only if the real page is scheduled later.
7. Replace static dashboard with API-backed executive shell using `/reports/kpis`, `/reports/trends`, `/alerts/unread-count`, and graceful fallback states.
8. Expand `en.json` with navigation and component strings.
9. Add `docs/frontend/SCREEN_MAP.md` and `docs/frontend/API_INTEGRATION_MATRIX.md`.

Verification:
```bash
cd frontend
npm install
npm run lint
npm run build
npm audit --audit-level=low
```

Acceptance:
- Every planned route exists and is protected.
- Navigation is usable and permission-aware.
- Dashboard uses real API calls.
- Visual style is coherent glassmorphism.
- Build and TypeScript pass.

### Session 7 — Organization + Data Inventory UI

Branch: `sprint/07-organization-inventory-ui` from Session 6 branch.

Objective: implement the user-facing UI for organization management and data registry.

Requirements docs:
- `module-4-1-organization.md`
- `module-4-2-data-registry.md`
- relevant US: RF01, RF02, RF03, RF04, RF05, RF11, RF19, RF20, RF24, RF29, RF34, RF35, RF36, RF38, RF39, RF40, RF41.

Pages/features:
1. Departments CRUD.
2. Company Profile/DPO setup.
3. Tenants/provisioning for SUPER_ADMIN.
4. Catalogs manager with type filters, edit, soft delete behavior shown, bulk load UI.
5. Data Inventory progress page.
6. Treatment Activities list + create/edit + guided RoT wizard:
   - start
   - legal basis
   - transfers
   - finalize
7. Information Assets list + create/edit with technical metadata and classification level.
8. Retention page:
   - policies
   - records
   - expired under review
   - execute retention action
   - execution logs
9. Import/Export page for treatment activities with CSV/JSON upload and export download.

Frontend API wrappers expected:
- `departments.ts`
- `companyProfile.ts`
- `tenants.ts`
- `catalogs.ts`
- `dataInventory.ts`
- `treatmentActivities.ts`
- `informationAssets.ts`
- `retention.ts`
- `importExport.ts`
- `sectors.ts`

Acceptance:
- Non-developer DPO can create a company profile, configure catalogs, create a treatment activity through wizard, add assets, and see inventory progress.
- DEPT_HEAD restrictions are respected visually and by backend errors.
- All forms have loading/error/success states.
- English only.
- `npm run lint && npm run build` pass.

### Session 8 — Risk, DPIA, ARCO, Incidents, Portability UI

Branch: `sprint/08-risk-compliance-ui` from Session 7 branch.

Objective: implement the core compliance workflows around risk, DPIA, rights requests, breaches, and portability.

Requirements docs:
- `module-4-3-risk-analysis.md`
- `module-4-4-document-generation.md`
- RF07, RF08, RF09, RF10, RF26, RF30, RF37.

Pages/features:
1. Risk Assessments page:
   - questionnaire load
   - create assessment
   - show probability/impact/CIA/rationale
   - green/yellow/red score visualization
   - edit assessment
2. Risk Dashboard:
   - score distribution
   - high-risk activities
   - links to assessments and action plan auto-generation.
3. DPIA page:
   - list
   - create/edit wizard with description, risk analysis, mitigations
   - sign action with role checks
   - PDF download.
4. ARCO page:
   - dashboard metrics
   - create request
   - list/filter by status/deadline
   - detail/edit status
   - SLA status visual traffic light.
5. Incidents page:
   - create incident
   - classify impact
   - show SPDP/data-subject deadlines
   - notify action
6. Portability page:
   - create request
   - complete request
   - export interoperable data.

Acceptance:
- DPO can perform the full risk-to-DPIA workflow and export/sign DPIA PDF.
- DPO can register ARCO and incident workflows with deadline visualization.
- Risk visuals are not static; they come from backend APIs.
- `npm run lint && npm run build` pass.
- Backend tests still pass if backend changes are needed.

### Session 9 — Documents, action plans, audits, reports, alerts, training, backups UI

Branch: `sprint/09-documents-arco-operations-ui` from Session 8 branch.

Objective: implement remaining operational and document modules so the MVP is usable end-to-end.

Requirements docs:
- `module-4-4-document-generation.md`
- `module-4-5-action-plan.md`
- `module-4-6-transversal.md`
- RF06, RF12, RF13, RF14, RF15, RF16, RF17, RF18, RF21, RF23, RF25, RF27, RF28, RF31, RF32, RF33, RF42, RF43.

Pages/features:
1. Consents page:
   - consent records list/create
   - revoke flow immutable
   - cookie banners list/create/edit
   - cookie consent records/revocation if exposed.
2. Legal Documents page:
   - template type selector
   - generate document
   - versioned document list
   - PDF download.
3. ROPA page:
   - complete register view
   - PDF download.
4. Action Plans page:
   - templates list/create
   - auto-generate from risk results
   - manual plan create/edit
   - status tracking and overdue badges.
5. Audit Plans page:
   - create/list/edit audits
   - findings management
   - report PDF download.
6. Remediations page:
   - create/list/edit remediation tasks linked to risks/findings.
7. Reports page:
   - filters: department, period, status, risk level
   - summary/kpis/trends
   - PDF/CSV export.
8. Alerts center:
   - unread count
   - list
   - create if permission allows
   - mark read/delete.
9. Audit Log page:
   - filters
   - export CSV.
10. Training page:
   - programs
   - modules
   - materials
   - enrollments/progress overview.
11. Backups page:
   - list
   - create if SUPER_ADMIN / safe permission
   - verify backup
   - show RPO/RTO language and warning for SQLite dev mode.

Acceptance:
- Executive dashboard links into reports, action plans, alerts, audits.
- User can generate or download all required outputs: Legal docs PDF, DPIA PDF, ROPA PDF, reports PDF/CSV, audit export CSV, portability export.
- No module remains as a dummy placeholder unless marked out-of-scope with explicit RF justification.
- `npm run lint && npm run build` pass.

### Session 10A — UX polish, responsive, accessibility, empty states

Branch: `sprint/10-final-polish-qa` from Session 9 branch.

Objective: make it look finished and usable, not just technically connected.

Scope:
1. Review every page for consistent glassmorphism.
2. Add responsive behavior for mobile/tablet.
3. Add empty states and first-run guidance for novice DPOs.
4. Add inline help/tooltips for legal/compliance terms.
5. Add accessible focus states and aria labels.
6. Run a string audit: English-only UI.
7. Normalize status/risk/priority badges across modules.
8. Ensure all download buttons handle blob responses correctly.
9. Add smoke tests or lightweight component tests if the project can support them without destabilizing.

Acceptance:
- A DPO can navigate the app without knowing API docs.
- No obvious Spanish strings in UI.
- No broken nav links.
- No static fake dashboard data where backend has real endpoints.

### Session 10B — Final QA and release documentation

Branch: same `sprint/10-final-polish-qa` after 10A.

Objective: exhaustive verification before declaring the sprint chain ready.

Scope:
1. Run full backend verification.
2. Run full frontend verification.
3. Run backend import smoke test.
4. Run frontend route smoke check if practical.
5. Review OpenAPI vs frontend integration matrix.
6. Create final docs:
   - `docs/reviews/FRONTEND_BACKEND_UNIFICATION_FINAL_REVIEW.md`
   - `docs/frontend/USER_WALKTHROUGH.md`
   - `docs/deployment/PRODUCTION_READINESS_CHECKLIST.md`
7. Update `README.md` or existing docs with run instructions.
8. Final PR body should include screenshots checklist and module completion table.

Verification:
```bash
cd backend
pip install -e ".[dev]"
python -c "from app.main import app; print(len(app.routes))"
pytest tests/ -v
ruff check .
pip freeze | pip-audit

cd ../frontend
npm install
npm run lint
npm run build
npm audit --audit-level=low
```

Acceptance:
- Final review says PASS or lists only non-blocking limitations.
- All high-priority RFs have visible UI coverage or explicit documented exception.
- The app is demo-ready for sponsor review.

---

## 6. Hermes orchestration procedure

Hermes should not program the feature manually. Hermes should orchestrate Claude Code.

For each session:

1. Build a self-contained prompt file under:
   - `~/workspace/prompts/datalegal-2.0/session-06A-hardening.md`
   - etc.
2. Include:
   - common header
   - exact branch/base
   - relevant RF/RNF excerpts
   - relevant API endpoints
   - acceptance criteria
   - required commands
3. Launch Claude Code:

```bash
cd ~/workspace/projects/datalegal-2.0
claude -p --model sonnet --permission-mode bypassPermissions --output-format text < ~/workspace/prompts/datalegal-2.0/session-06A-hardening.md
```

4. Save raw output:

```bash
mkdir -p ~/workspace/logs/datalegal-2.0
# redirect stdout/stderr to ~/workspace/logs/datalegal-2.0/session-06A-hardening.log
```

5. After completion, Hermes verifies:
   - `git status --short`
   - branch name
   - latest commit
   - required commands
   - changed files match scope
6. If verification fails:
   - write a fix prompt with exact errors
   - relaunch Claude Code on same branch
7. If verification passes:
   - push branch
   - open PR if possible
   - write summary to `~/workspace/memory/sessions/datalegal-2.0/session-XX.json`
   - continue to next session.

Never launch two Claude Code sessions that edit the same branch at the same time.

---

## 7. Review gates

Gate 1 — Backend hardening gate:
- Must pass before UI module implementation.
- Blocks all later sessions if import/tests/ruff fail.

Gate 2 — Frontend foundation gate:
- Must pass before module pages.
- Blocks all later sessions if design system/routes/API wrappers are chaotic.

Gate 3 — Module completion gate per session:
- Every planned page has route, nav entry, API wrapper, loading/error/empty states, docs entry.

Gate 4 — Product QA gate:
- Final review confirms the UI covers the MVP scope.

Abort criteria:
- Claude Code rewrites the stack without approval.
- Secrets are committed.
- Backend tests regress and cannot be fixed in-session.
- Frontend uses fake static data where backend endpoint exists.
- UI violates English-only MVP requirement.

---

## 8. Suggested final module completion table

Claude Code should maintain this in `docs/frontend/API_INTEGRATION_MATRIX.md`.

| Module | Page route | API wrapper | Backend prefix | RFs | Status |
|---|---|---|---|---|---|
| Auth/MFA | `/login`, `/mfa-*` | `auth.ts` | `/api/v1/auth` | RF-02 | existing/improve |
| Users | `/users` | `users.ts` | `/api/v1/users` | RF-01, RF-24 | existing/improve |
| Departments | `/departments` | `departments.ts` | `/api/v1/departments` | RF-01 | build |
| Company Profile | `/company-profile` | `companyProfile.ts` | `/api/v1/company-profile` | RF-03 | build |
| Tenants | `/settings/tenants` | `tenants.ts` | `/api/v1/tenants` | RF-19, RF-41 | build |
| Catalogs | `/catalogs` | `catalogs.ts` | `/api/v1/catalogs` | RF-20, RF-39, RF-40 | build |
| Data Inventory | `/data-inventory` | `dataInventory.ts` | `/api/v1/data-inventory` | RF-04, RF-29 | build |
| Treatment Activities | `/treatment-activities` | `treatmentActivities.ts` | `/api/v1/treatment-activities` | RF-04, RF-11 | build |
| Information Assets | `/information-assets` | `informationAssets.ts` | `/api/v1/information-assets` | RF-35, RF-36, RF-38 | build |
| Retention | `/retention` | `retention.ts` | `/api/v1/retention` | RF-05, RF-11, RF-29 | build |
| Risks | `/risk-assessments` | `riskAssessments.ts` | `/api/v1/risk-assessments` | RF-10, RF-37 | build |
| DPIA | `/dpias` | `dpias.ts` | `/api/v1/dpias` | RF-09 | build |
| ARCO | `/arco` | `arco.ts` | `/api/v1/arco` | RF-07, RF-30 | build |
| Portability | `/portability` | `portability.ts` | `/api/v1/portability` | RF-26 | build |
| Incidents | `/incidents` | `incidents.ts` | `/api/v1/incidents` | RF-08 | build |
| Consents | `/consents` | `consents.ts` | `/api/v1/consents` | RF-06, RF-25, RF-32 | build |
| Legal Documents | `/legal-documents` | `legalDocuments.ts` | `/api/v1/legal-documents` | RF-14, RF-33 | build |
| ROPA | `/ropa` | `ropa.ts` | `/api/v1/ropa` | RF-31 | build |
| Action Plans | `/action-plans` | `actionPlans.ts` | `/api/v1/action-plans` | RF-12, RF-43 | build |
| Audit Plans | `/audit-plans` | `auditPlans.ts` | `/api/v1/audit-plans` | RF-13 | build |
| Remediations | `/remediations` | `remediations.ts` | `/api/v1/remediations` | RF-12, RF-13 | build |
| Reports | `/reports` | `reports.ts` | `/api/v1/reports` | RF-15, RF-16, RF-42 | build |
| Alerts | `/alerts` | `alerts.ts` | `/api/v1/alerts` | RF-18 | build |
| Audit Log | `/audit-log` | `audit.ts` | `/api/v1/audit` | RF-17 | build |
| Training | `/training` | `training.ts` | `/api/v1/training` | RF-27, RF-28 | build |
| Backups | `/backups` | `backups.ts` | `/api/v1/backups` | RF-23 | build |
| Import/Export | `/import-export` | `importExport.ts` | `/api/v1/import-export` | RF-21 | build |

---

## 9. Risks and mitigations

Risk: Scope is large for a single Claude Code run.
- Mitigation: split into Sessions 6A, 6B, 7, 8, 9, 10A, 10B.

Risk: Backend schemas are not fully aligned with frontend assumptions.
- Mitigation: generate or inspect OpenAPI per session; wrappers must match real schemas.

Risk: Glassmorphism can hurt accessibility.
- Mitigation: define contrast tokens, focus rings, labels, aria, no color-only status.

Risk: Frontend forms become inconsistent.
- Mitigation: build reusable form/table/wizard components in Session 6B before modules.

Risk: Backend production hardening changes break tests.
- Mitigation: Session 6A is isolated and must pass full tests before UI sessions.

Risk: Too many dependencies.
- Mitigation: prefer Tailwind and native components; add only justified minimal libraries.

---

## 10. Immediate next action

Start with Session 6A, because hardening blockers affect all later UI work.

Hermes command pattern:

```bash
cd ~/workspace/projects/datalegal-2.0
git fetch origin
git worktree add /tmp/datalegal-s06 origin/sprint/05-operations-reports
cd /tmp/datalegal-s06
git checkout -b sprint/06-hardening-ui-foundation
claude -p --model sonnet --permission-mode bypassPermissions --output-format text < ~/workspace/prompts/datalegal-2.0/session-06A-hardening.md
```

After Session 6A passes, continue with Session 6B on the same branch.
