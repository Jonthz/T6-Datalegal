"""
Behave environment for DataLegal acceptance tests.

Two execution modes, chosen automatically:

1. IN-PROCESS (default) — mounts the FastAPI app with a seeded SQLite database,
   exactly like the existing pytest suite (tests/conftest.py). Deterministic and
   CI-friendly: no server, no Postgres. The database is rebuilt and re-seeded
   before every scenario, so scenarios never leak state into each other.

2. LIVE — set the env var DATALEGAL_BASE_URL (e.g. the deployed backend or a
   local `uvicorn`) and the same scenarios run over real HTTP against that
   instance. Use this for the live demo. In live mode the target must already
   have the demo users seeded (backend/app/db/seed_dev.py).

The seeded demo users match docs/demo-credentials.md so the Gherkin reads with
the real credentials the team shows in the demo.
"""

# The app and steps imports below must run *after* sys.path and the DATABASE_URL
# env var are configured, so their position is intentional.
# pylint: disable=wrong-import-position

import os
import sys

# Make the local `steps` package importable as `steps.*` from step modules.
sys.path.insert(0, os.path.dirname(__file__))

# Make the app import a SQLite database instead of the default Postgres URL.
os.environ.setdefault("DATABASE_URL", "sqlite:///./acceptance_test.db")
os.environ.setdefault("ENVIRONMENT", "test")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from steps.api_client import ApiClient  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402

# Register every model with Base.metadata (same list as tests/conftest.py).
from app.models import (  # noqa: E402,F401
    action_plan,
    alert,
    arco_request,
    audit_log,
    audit_plan,
    backup,
    catalog,
    consent,
    department,
    dpia,
    incident,
    information_asset,
    legal_document,
    platform_access,
    portability,
    remediation,
    retention,
    risk_assessment,
    tenant,
    training,
    treatment_activity,
    user,
)
from app.models import role as role_model  # noqa: E402,F401
from app.models.department import Department  # noqa: E402
from app.models.platform_access import PlatformPermission  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.models.user import User  # noqa: E402

# ── Demo users (match docs/demo-credentials.md) ──────────────────────────────
COMMON_PASSWORD = "Admin123!"
OWNER_PASSWORD = "Owner123!"

# email -> password, so `Given I am authenticated as "<email>"` can log in.
DEMO_PASSWORDS = {
    "owner@datalegal.local": OWNER_PASSWORD,
    "admin@datalegal.local": COMMON_PASSWORD,
    "dpo@datalegal.local": COMMON_PASSWORD,
    "admin.ops@datalegal.local": COMMON_PASSWORD,
    "tech@datalegal.local": COMMON_PASSWORD,
    "auditor@datalegal.local": COMMON_PASSWORD,
    "dpo.b@empresab.local": COMMON_PASSWORD,
}

_SQLITE_URL = "sqlite:///./acceptance_test.db"
_engine = create_engine(_SQLITE_URL, connect_args={"check_same_thread": False})
_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _override_get_db():
    """Yield a session bound to the seeded SQLite engine (FastAPI get_db override)."""
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _seed(db):
    """Create the two demo tenants, departments and the one-user-per-role set."""
    tenant_a = Tenant(
        name="Demo Company Inc.", ruc="1790012345001", country="Ecuador", sector="Legal"
    )
    tenant_b = Tenant(
        name="Other Company Ltd.", ruc="0990098765001", country="Ecuador", sector="Finance"
    )
    db.add_all([tenant_a, tenant_b])
    db.flush()

    dept_tech = Department(tenant_id=tenant_a.id, name="Technology")
    dept_rrhh = Department(tenant_id=tenant_a.id, name="Human Resources")
    dept_legal = Department(tenant_id=tenant_a.id, name="Legal & Compliance")
    db.add_all([dept_tech, dept_rrhh, dept_legal])
    db.flush()

    def mk(email, role, tenant_id, *, password, scope="TENANT", dept=None, perms=()):
        """Create and flush a user, plus any platform permissions."""
        u = User(
            tenant_id=tenant_id,
            email=email,
            hashed_password=get_password_hash(password),
            full_name=email.split("@")[0],
            role=role,
            account_scope=scope,
            department_id=dept,
        )
        db.add(u)
        db.flush()
        for p in perms:
            db.add(PlatformPermission(user_id=u.id, permission=p))
        return u

    mk("owner@datalegal.local", "SUPER_ADMIN", tenant_a.id, password=OWNER_PASSWORD,
       scope="PLATFORM", perms=("tenants:read", "tenants:provision"))
    mk("admin@datalegal.local", "SUPER_ADMIN", tenant_a.id, password=COMMON_PASSWORD)
    mk("dpo@datalegal.local", "DPO", tenant_a.id, password=COMMON_PASSWORD, dept=dept_legal.id)
    mk("admin.ops@datalegal.local", "ADMIN", tenant_a.id, password=COMMON_PASSWORD)
    mk("tech@datalegal.local", "DEPT_HEAD", tenant_a.id,
       password=COMMON_PASSWORD, dept=dept_tech.id)
    mk("auditor@datalegal.local", "AUDITOR", tenant_a.id, password=COMMON_PASSWORD)
    # Second tenant, used by the isolation scenarios.
    mk("dpo.b@empresab.local", "DPO", tenant_b.id, password=COMMON_PASSWORD)

    db.commit()

    # Expose useful ids for steps.
    return {
        "tenant_a_id": tenant_a.id,
        "tenant_b_id": tenant_b.id,
        "dept_tech_id": dept_tech.id,
        "dept_rrhh_id": dept_rrhh.id,
        "dept_legal_id": dept_legal.id,
    }


def _reset_and_seed(context):
    """Rebuild the schema and re-seed the demo data before a scenario."""
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    db = _TestingSessionLocal()
    try:
        context.seed = _seed(db)
    finally:
        db.close()


def before_all(context):
    """Set up the API client and, in in-process mode, the get_db override."""
    context.passwords = DEMO_PASSWORDS
    context.api = ApiClient()
    context.live = context.api.live
    if not context.live:
        # Route the app's get_db to our seeded SQLite engine.
        app.dependency_overrides[get_db] = _override_get_db


def before_scenario(context, scenario):  # pylint: disable=unused-argument
    """Reset per-scenario state and rebuild the seeded database (in-process mode)."""
    context.tokens = {}
    context.token = None
    context.response = None
    context.data = {}
    if not context.live:
        _reset_and_seed(context)
        # Drop slowapi per-IP counters so auth rate limits don't leak between scenarios.
        try:
            from app.core.rate_limit import limiter

            limiter.reset()
        except Exception:  # pragma: no cover - defensive  # pylint: disable=broad-exception-caught
            pass


def after_all(context):
    """Remove the get_db override when the run finishes (in-process mode)."""
    if not context.live:
        app.dependency_overrides.clear()
