# DataLegal

**Privacy compliance platform for LOPDP — multi-tenant SaaS**

---

## Overview

DataLegal 2.0 is a web platform that helps organizations in Ecuador achieve and maintain compliance with the **Ley Orgánica de Protección de Datos Personales (LOPDP)**. It provides a centralized workspace for Data Protection Officers (DPOs) and compliance teams to manage the full data protection lifecycle: from registering treatment activities and assessing risks, to generating ROPA reports and handling ARCO requests.

The platform is built as a **multi-tenant SaaS**, meaning each organization gets isolated data, its own user roles, and independent compliance dashboards.

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.12 | Runtime |
| FastAPI | 0.115 | REST API framework |
| SQLAlchemy | 2.0 | ORM (async-ready) |
| Pydantic Settings | 2.x | Configuration & validation |
| PostgreSQL | 16 | Primary database |
| PyOTP | latest | TOTP-based MFA |
| fpdf2 | 2.7+ | PDF report generation |
| passlib / bcrypt | latest | Password hashing |
| pytest | latest | Testing (268 tests, ~92% coverage) |
| ruff | latest | Linter & formatter |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6 | Build tool |
| Tailwind CSS | 3 | Styling |
| axios | latest | HTTP client |
| react-i18next | latest | Internationalization |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + docker-compose | Containerized local environment |
| SQLite | In-memory testing database |
| Alembic | Database migrations |

---

## Modules

| Module | Description |
|---|---|
| **Auth & MFA** | JWT authentication, TOTP two-factor, lockout, session timeout |
| **Users & RBAC** | Role-based access (SUPER_ADMIN, DPO, DEPT_HEAD, VIEWER), multi-tenant isolation |
| **Organization** | Company profile, DPO setup, department management |
| **Data Registry** | Treatment activity wizard, information asset catalog |
| **Risk Assessment** | Risk scoring, DPIA structured workflow, signed PDF |
| **ARCO Requests** | Centralized flow with SLA stoplight (Green / Yellow / Red) |
| **ROPA** | Auto-generated Records of Processing Activities (PDF + JSON) |
| **Action Plans** | Risk-based auto-generation, remediations with score snapshots |
| **Audit Plans** | Planning, findings, and PDF report |
| **Consents** | Consent registration, immutable revocation, cookie banner |
| **Legal Documents** | Versioned privacy policies, processor contracts, cookie notices |
| **Reports** | KPI dashboard, trends, filterable PDF/CSV export |
| **Backups** | Scheduled backups with SHA-256 checksum, 30-day retention |
| **Training** | Programs, modules, materials, progress tracking |
| **Import / Export** | Standard CSV/JSON bulk import and metadata export |

---

## Project Structure

```
datalegal/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI routers (one file per module)
│   │   ├── core/            # Config, security, permissions
│   │   ├── db/              # Database engine & session
│   │   └── models/          # SQLAlchemy models (TenantBase)
│   ├── scripts/
│   │   └── backup.py        # CLI backup script (cron-ready)
│   ├── tests/               # pytest test suite
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/             # axios service layer
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # Route-level page components
│   │   └── i18n/            # Translation files (en.json)
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── plan/                # Sprint plans, requirements, use cases
│   └── reviews/             # QA and code review reports
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & docker-compose (recommended)

### Option A — Docker (full stack)

```bash
git clone https://github.com/Jonthz/datalegal.git
cd datalegal
docker-compose up --build
```

API available at `http://localhost:8000/api/docs`  
Frontend available at `http://localhost:5173`

### Option B — Local development

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
npm run dev
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v
pytest --cov=app --cov-report=term-missing   # with coverage
```

---

## License

This project is developed as an academic project at **ESPOL** (Escuela Superior Politécnica del Litoral).  
MIT License — see [LICENSE](LICENSE) for details.
