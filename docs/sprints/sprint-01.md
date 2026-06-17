# Sprint 01 — Foundation

**Rama**: `sprint/01-foundation`
**Fecha**: 2026-05-18
**Estado**: Completo

---

## Objetivo del sprint

Construir los cimientos del sistema DataLegal 2.0: arquitectura multi-tenant, autenticación
con MFA, RBAC, log de auditoría inmutable, catalogo maestro, gestión de entrenamiento y
solicitudes de portabilidad — todo con tests y build green.

---

## User Stories cubiertas

| US | RF | Descripción |
|----|----|-------------|
| US-RF01-1 | RF-01 | CRUD de usuarios con roles (SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD, AUDITOR) y asignación de departamentos |
| US-RF02-1 | RF-02 | Login (email/contraseña) + TOTP MFA. Lockout tras 5 intentos fallidos (15 min). Auto-logout JWT exp 30 min. Password: ≥8 chars, upper, lower, dígito, símbolo |
| US-RF17-1 | RF-17 | Log de auditoría append-only. Eventos: login, user_create, etc. Export a CSV. Filtros por acción/usuario/fecha |
| US-RF19-1 | RF-19 | Cada modelo tenant-scoped tiene `tenant_id`. Middleware/dependency inyecta tenant desde JWT. 403 si mismatch |
| US-RF22-1 | RF-22 | API y frontend en inglés. i18n centralizado en `src/i18n/en.json` |
| US-RF24-1 | RF-24 | Matriz RBAC: rol → módulo → acción. Dependencia FastAPI `require_permission`. 403 + audit log en fallo |
| US-RF26-1 | RF-26 | Solicitud de portabilidad: DPO registra, sistema rastrea estado, export JSON interoperable (RFC8259) |
| US-RF27-1 | RF-27 | Training: CRUD Programas, Módulos, Materiales, Inscripciones. Progreso por usuario |
| US-RF40-1 | RF-39/40 | Bulk load de catálogo: POST /catalogs/bulk-load con JSON. GET /catalogs, GET /catalogs/{type} |
| US-RF41-1 | RF-41 | Tenant Provisioning: SUPER_ADMIN crea empresa + primer DPO/ADMIN en un solo endpoint |

---

## Stack elegido y razón

### Backend
- **Python 3.12 + FastAPI 0.115**: framework moderno async-ready, excelente soporte para OpenAPI automático
- **SQLAlchemy 2.0 sync**: ORM maduro, migrations con Alembic (fase 2), tipo-seguro con mapped_column
- **SQLite (dev/test) + PostgreSQL (prod)**: SQLite permite tests sin deps externas; PostgreSQL para producción real
- **passlib[bcrypt] + python-jose[cryptography]**: estándar de la industria para hashing y JWT
- **pyotp**: librería bien mantenida para TOTP RFC 6238

### Frontend
- **React 18 + TypeScript + Vite**: stack moderno con hot-reload rápido y builds optimizados
- **Tailwind CSS**: utility-first CSS sin necesidad de componentes externos pesados
- **react-i18next**: i18n centralizado en JSON, fácil de extender a ES en sprints futuros
- **react-qrcode-logo**: QR para setup de MFA directamente en la UI

---

## Cómo correrlo

### Backend (tests)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v
# Resultado esperado: 77 passed
```

### Backend (servidor dev)
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/api/docs
```

### Frontend (build)
```bash
cd frontend
npm install
npm run build
# Resultado: dist/ creado sin errores
```

### Frontend (dev)
```bash
cd frontend
npm run dev
# UI: http://localhost:3000
```

### Docker (producción)
```bash
cp .env.example .env
# Editar SECRET_KEY en .env
docker-compose up --build
```

---

## Estructura de archivos creados

```
backend/
  app/
    core/config.py          # pydantic-settings
    core/security.py        # JWT, bcrypt, TOTP
    core/permissions.py     # RBAC matrix + require_permission()
    db/base.py              # Base, TenantBase, TimestampMixin
    db/session.py           # get_db(), engine
    db/init_db.py           # create_all() para dev/test
    models/{tenant,user,department,audit_log,catalog,training,portability}.py
    schemas/{auth,user,tenant,department,catalog,training,portability}.py
    api/deps.py             # get_current_user, get_current_tenant_id, require_permission
    api/v1/{auth,users,departments,tenants,catalogs,training,audit,portability}.py
    api/v1/router.py
    main.py
  tests/
    conftest.py             # fixtures: session, client, tokens por rol
    test_auth.py            # login, MFA, lockout, password strength
    test_users.py           # CRUD usuarios, roles, departamentos
    test_tenants.py         # provisioning, tenant isolation
    test_permissions.py     # RBAC enforcement, permission_check_fail audit
    test_audit.py           # append-only, CSV export, filtros
    test_catalogs.py        # bulk load, list, filter type
    test_training.py        # programs, modules, materials, enrollments
    test_portability.py     # lifecycle completo + JSON export RFC8259
  pyproject.toml
  .env.example
  Dockerfile
  alembic.ini               # placeholder — migrations en sprint 2

frontend/
  src/
    i18n/en.json            # todas las cadenas UI en inglés
    api/{client,auth,users}.ts
    hooks/useAuth.ts
    components/{ProtectedRoute,Layout}.tsx
    pages/{Login,MFAVerify,MFASetup,Dashboard,UserManagement}.tsx
    types/index.ts
    main.tsx, App.tsx, index.css
  package.json, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js, index.html

docker-compose.yml
.env.example
```

---

## Resultado de tests

```
77 passed, 1 warning in 33.39s
```

Cobertura por área:
- Auth (login, MFA, lockout, password): 10 tests
- Users CRUD + roles: 9 tests
- Tenants provisioning + isolation: 8 tests
- RBAC permissions: 11 tests
- Audit log (append-only, CSV, filters): 9 tests
- Catalog bulk load: 7 tests
- Training (programs, modules, materials, enrollments): 13 tests
- Portability lifecycle + export: 8 tests
- Frontend build: OK (no TypeScript errors)

---

## Pendientes para sprint siguiente

1. **Alembic migrations**: reemplazar `init_db.py` con migraciones Alembic para cambios de esquema controlados
2. **Refresh tokens**: endpoint `/auth/refresh` para renovar tokens sin re-login
3. **Email notifications**: alertas de lockout, solicitudes de portabilidad aprobadas
4. **Frontend completo**: páginas para Audit, Training, Portability, Catalogs
5. **Registro de actividad de datos (RF-03)**: inventario de tratamientos de datos personales
6. **Password reset flow**: endpoint + email para reset de contraseña
7. **Rate limiting**: protección adicional contra brute-force en `/auth/login`
8. **Encryption at rest para MFA secret**: TODO marcado en código — actualmente base32 sin cifrar

---

## Riesgos detectados

1. **bcrypt 5.x incompatible con passlib 1.7.4**: la versión 5.0 de bcrypt rechaza passwords >72 bytes con un error. Solución aplicada: pin a `bcrypt<5.0.0`. Riesgo: passlib 1.7.4 está sin mantenimiento activo; considerar migrar a `argon2-cffi` en sprint 3+.

2. **SQLite timezone**: SQLite no preserva timezone info en columnas DateTime. Workaround aplicado en `auth.py`: tratar datetimes naive como UTC. En producción (PostgreSQL) no es problema.

3. **MFA secret sin cifrar**: el TOTP secret se almacena como base32 en la BD. TODO para sprint 2: cifrar con clave derivada del SECRET_KEY antes de persistir.

4. **RBAC granularidad**: la matriz actual es por módulo+acción. Si se necesitan permisos por registro (row-level security), requiere rediseño significativo en sprint posterior.

5. **Test isolation**: el patrón de fixtures usa `session.flush()` (sin commit) + rollback al final de cada test. Si un test falla a mitad, el rollback limpia el estado. Funciona bien con SQLite; con PostgreSQL en CI, verificar que el patrón se mantenga.
