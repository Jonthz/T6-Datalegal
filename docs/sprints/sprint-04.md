# Sprint 4 — Auditing, Documentation, and Refinement

## Objective

Strengthen the platform's evidence and control capabilities for LOPDP compliance auditing:
consent lifecycle management, versioned legal document generation, audit planning with PDF
reports, risk remediation tracking, editable catalogs with auto-classification, economic
sector configuration, and a consolidated compliance summary report.

---

## US Covered

| Story      | Title                                | Status    | Notes |
|------------|--------------------------------------|-----------|-------|
| US-RF05-1  | Catalog and automatic classification | Done      | LOPDP lookup table; sensitivity + criticality auto-filled on bulk-load |
| US-RF12-1  | Remediations with risk impact        | Done      | Snapshots risk score before, records score after completion |
| US-RF13-1  | Planning, findings, and report       | Done      | AuditPlan + AuditFinding; PDF report via fpdf2 |
| US-RF14-1  | Parameterized and versioned generation | Done    | PRIVACY_POLICY, SECURITY_POLICY, COOKIE_NOTICE; version control, PDF download |
| US-RF20-1  | Editable and versioned catalogs      | Done      | PATCH endpoint increments version field; audit log entry |
| US-RF25-1  | Banner and notice versioning         | Done      | CookieBanner + CookieConsent models; revocation supported |
| US-RF32-1  | Explicit and immutable revocation    | Done      | ConsentRecord; once revoked, cannot be un-revoked (400 error) |
| US-RF33-1  | Expanded contractual documents       | Done      | CUSTOMER_NOTICE, CONTRACTUAL_CLAUSE, PROCESSOR_CONTRACT added to LegalDocument |
| US-RF34-1  | Economic Sector Configuration        | Done      | 8 sectors; PATCH /sectors/company/sector returns pre-populated suggestions |
| US-RF42-1  | Consolidated Summary Report          | Done      | GET /reports/summary aggregates all modules |

---

## What was built

### New models (`backend/app/models/`)

| File | Models | Key design |
|------|--------|-----------|
| `consent.py` | `ConsentRecord`, `CookieBanner`, `CookieConsent` | `is_revoked` immutable flag; pseudonymized token only (no PII stored) |
| `legal_document.py` | `LegalDocument` | `is_current` flag; previous versions auto-superseded on new create |
| `audit_plan.py` | `AuditPlan`, `AuditFinding` | findings have severity (CRITICAL/HIGH/MEDIUM/LOW/INFO) and evidence field |
| `remediation.py` | `Remediation` | snapshots `risk_score_before`/`risk_level_before` on creation for delta proof |

### Updated models

- `catalog.py`: added `sensitivity` (ORDINARY/SENSITIVE), `criticality` (LOW/MEDIUM/HIGH), `version` (int), `updated_by_id` fields.

### New API endpoints (`backend/app/api/v1/`)

| File | Endpoints | US |
|------|-----------|-----|
| `consents.py` | POST/GET /consents, POST /consents/{id}/revoke, POST/GET /cookie-banners, POST /cookie-consents, POST /cookie-consents/{id}/revoke | US-RF32-1, US-RF25-1 |
| `legal_documents.py` | GET /legal-documents/template-types, POST/GET /legal-documents, GET /legal-documents/{id}, GET /legal-documents/{id}/pdf | US-RF14-1, US-RF33-1 |
| `audit_plans.py` | POST/GET /audit-plans, PATCH /audit-plans/{id}, POST /audit-plans/findings, GET /audit-plans/{id}/findings, PATCH /audit-plans/findings/{id}, GET /audit-plans/{id}/report | US-RF13-1 |
| `remediations.py` | POST/GET /remediations, GET/PATCH /remediations/{id} | US-RF12-1 |
| `sectors.py` | GET /sectors, GET /sectors/{code}, PATCH /sectors/company/sector | US-RF34-1 |
| `reports.py` | GET /reports/summary | US-RF42-1 |

### Updated endpoints

- `catalogs.py`: PATCH /catalogs/{id} (US-RF20-1 versioning + US-RF05-1 classification); bulk-load now auto-classifies known LOPDP data category codes.

### Permissions

All Sprint 4 modules added to RBAC matrix (`core/permissions.py`). AUDITOR gets write access to `audit_plans` (create/update findings); others follow DPO-full / ADMIN-read / DEPT_HEAD-read pattern.

---

## How to run

```bash
cd backend

# Run tests
uv run pytest tests/ -v

# Start dev server
uvicorn app.main:app --reload

# API docs
open http://localhost:8000/api/docs
```

New API tags visible in Swagger: `consents`, `legal-documents`, `audit-plans`, `remediations`, `sectors`, `reports`.

---

## Test coverage

- `tests/test_sprint4.py`: **43 tests** covering all 10 US
- Full suite: **229 tests, 0 failures**

Test classes:
- `TestCatalogAutoClassification` — US-RF05-1
- `TestCatalogVersioning` — US-RF20-1
- `TestConsentRevocation` — US-RF32-1 (including immutability assertion)
- `TestCookieBanners` — US-RF25-1
- `TestLegalDocuments` — US-RF14-1 + US-RF33-1 (PDF magic-bytes verified)
- `TestAuditPlans` — US-RF13-1 (PDF report verified)
- `TestRemediations` — US-RF12-1 (risk delta snapshot)
- `TestSectors` — US-RF34-1
- `TestSummaryReport` — US-RF42-1 (cross-tenant isolation verified)

---

## Decisions taken

1. **PDF generation**: Used `fpdf2` (already in venv) instead of adding a new dependency. Text sanitized to latin-1 to avoid encoding errors with core fonts. Templates render default content based on company parameters when no custom content is provided.

2. **ConsentRecord immutability**: Enforced at the API layer — `POST /revoke` returns 400 if already revoked. The `is_revoked` flag is only set to `True`, never cleared back. No DB-level trigger needed; the application layer is the only mutation point.

3. **CatalogEntry auto-classification**: A static lookup dict maps known LOPDP data category codes (HEALTH_DATA, NATIONAL_ID, EMAIL, etc.) to `(sensitivity, criticality)`. Unknown codes get `None` values (DPO can set manually via PATCH).

4. **LegalDocument versioning**: When a new document of the same `doc_type` is created, previous `is_current=True` versions are set to `is_current=False` in a single UPDATE before the new record is inserted. No migration needed for this sprint.

5. **Sector catalog**: Hardcoded in code (not DB table) because sectors are LOPDP-methodology constants, not tenant-configurable data. 8 sectors: HEALTH, EDUCATION, FINANCE, RETAIL, MARKETING, LEGAL, GOVERNMENT, TECHNOLOGY.

---

## Pending / Risks for Sprint 5

| Item | Risk | Recommended action |
|------|------|--------------------|
| Alembic migrations | HIGH — still using `create_all()` for dev/test. No migration for Sprint 4's new columns/tables. | Introduce Alembic in Sprint 5 with a baseline migration |
| passlib deprecation | MEDIUM — deprecation warning in Python 3.12; will break in Python 3.13. | Replace with `argon2-cffi` or direct `bcrypt` |
| MFA secret encryption at rest | MEDIUM — `user.mfa_secret` still plain base32. | AES-256 encryption in `core/security.py` |
| Legal document content | LOW — default templates are English-only placeholders. Production needs Spanish (LOPDP is Ecuador law). | Add i18n content templates |
| Frontend pages for Sprint 4 | LOW — no React UI for consents/legal-docs/audit-plans. | Dedicated frontend sprint or Sprint 5 |
