# Acceptance Testing — DataLegal (behave / Gherkin)

Cucumber-style **acceptance tests** for DataLegal, written in **Gherkin** and run
with **behave**. Each scenario maps to a user story and its acceptance criteria,
covering **one user per role** as required by the project specification (demo,
Section B).

## What it covers

| Feature | User story | Role | Type |
|---|---|---|---|
| `US-RF02-1_login` | Login | any | happy |
| `US-RF01-1_user_creation` | Account with role | SUPER_ADMIN | happy |
| `US-RF03-1_company_setup` | Company setup | SUPER_ADMIN | happy |
| `US-RF04-1_rot_wizard` | RoT wizard | DEPT_HEAD | happy |
| `US-RF01-2_department_isolation` | Department isolation | DEPT_HEAD | **negative** |
| `US-RF07-1_arco_sla` | ARCO with SLA | DPO | happy |
| `US-RF10-1_risk_scoring` | Risk score | DPO | happy |
| `US-RF31-1_ropa` | ROPA report (PDF) | DPO | happy |
| `US-RF13-1_audit` | Audit + PDF report | AUDITOR | happy |
| `US-RF24-1_rbac` | Permission matrix | AUDITOR | **negative** |
| `US-RF19-1_tenant_isolation` | Multi-tenant isolation | ADMIN/DPO | **negative** |
| `US-RF41-1_tenant_provisioning` | Tenant provisioning | PLATFORM owner | happy |
| `US-RF26-1_portability` | Portability (RFC8259) | DPO | happy |
| `US-RF32-1_consent_revocation` | Immutable revocation | DPO | happy + negative |

## How to run

From `backend/` with the dependencies installed (`pip install -e ".[dev]"` or
`uv pip install -e ".[dev]"`):

```bash
cd acceptance
behave                 # run everything
behave -n "The auditor cannot create treatment activities"   # a single scenario
behave --junit --junit-directory reports   # emit JUnit (XML) reports as evidence
```

### Two execution modes

- **In-process (default).** Mounts the FastAPI app on a seeded SQLite database
  (same approach as `tests/conftest.py`). No server, no Postgres — deterministic
  and CI-friendly. The database is rebuilt and re-seeded before **every** scenario.
- **Live (for the demo).** Point it at a real backend (deployed or local
  `uvicorn`):

  ```bash
  DATALEGAL_BASE_URL="https://your-backend" behave
  ```

  In this mode the target must already have the demo users seeded
  (`backend/app/db/seed_dev.py`). Scenarios use the credentials from
  `docs/demo-credentials.md` (`dpo@datalegal.local` / `Admin123!`, etc.).

## Structure

```
acceptance/
├── behave.ini
├── README.md
└── features/
    ├── environment.py          # setup: seeding + API client (in-process or live)
    ├── *.feature               # Gherkin scenarios (one per user story)
    └── steps/
        ├── api_client.py        # HTTP client / TestClient
        ├── common_steps.py      # login and generic assertions
        ├── account_steps.py     # users, departments, RBAC, tenants
        ├── activity_steps.py    # RoT wizard, isolation, risk
        └── compliance_steps.py  # ARCO, ROPA, audit, portability, consent
```

## CI

The workflow `.github/workflows/acceptance.yml` runs the suite in in-process mode
on every push/PR and uploads the JUnit reports as an artifact.

## Suggested extra (+1 pt): GUI automation

The same `.feature` files can be reused driving the browser with Selenium/
Playwright (instead of the API) for the *GUI test automation* extra: only the
step definitions are rewritten, not the scenarios.
