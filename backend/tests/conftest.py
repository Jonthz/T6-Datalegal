"""
Test configuration and shared fixtures for DataLegal 2.0 test suite.
Uses SQLite in-memory DB for fast, isolated tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Import all models to ensure they are registered with Base.metadata
from app.models import (  # noqa: F401
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
    portability,
    remediation,
    retention,
    risk_assessment,
    tenant,
    training,
    treatment_activity,
    user,
)
from app.models.tenant import Tenant
from app.models.user import User

SQLALCHEMY_TEST_URL = "sqlite:///./test_datalegal.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Drop slowapi counters between tests so per-IP limits don't leak."""
    from app.core.rate_limit import limiter

    limiter.reset()
    yield


@pytest.fixture
def session(create_tables):
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(session):
    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Tenant fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
def tenant_a(session) -> Tenant:
    t = Tenant(name="Tenant Alpha", ruc="1234567890001", country="Ecuador", sector="Legal")
    session.add(t)
    session.flush()
    return t


@pytest.fixture
def tenant_b(session) -> Tenant:
    t = Tenant(name="Tenant Beta", ruc="9876543210001", country="Ecuador", sector="Finance")
    session.add(t)
    session.flush()
    return t


# ── User fixtures ────────────────────────────────────────────────────────────

def _make_user(session, *, tenant_id: int, email: str, role: str, password: str = "Test@1234!") -> User:
    u = User(
        tenant_id=tenant_id,
        email=email,
        hashed_password=get_password_hash(password),
        full_name=f"User {email}",
        role=role,
    )
    session.add(u)
    session.flush()
    return u


@pytest.fixture
def super_admin(session, tenant_a) -> User:
    return _make_user(session, tenant_id=tenant_a.id, email="superadmin@test.com", role="SUPER_ADMIN")


@pytest.fixture
def dpo_user(session, tenant_a) -> User:
    return _make_user(session, tenant_id=tenant_a.id, email="dpo@test.com", role="DPO")


@pytest.fixture
def admin_user(session, tenant_a) -> User:
    return _make_user(session, tenant_id=tenant_a.id, email="admin@test.com", role="ADMIN")


@pytest.fixture
def auditor_user(session, tenant_a) -> User:
    return _make_user(session, tenant_id=tenant_a.id, email="auditor@test.com", role="AUDITOR")


@pytest.fixture
def dept_head_user(session, tenant_a) -> User:
    return _make_user(session, tenant_id=tenant_a.id, email="depthead@test.com", role="DEPT_HEAD")


@pytest.fixture
def tenant_b_user(session, tenant_b) -> User:
    return _make_user(session, tenant_id=tenant_b.id, email="tenant_b_user@test.com", role="ADMIN")


# ── Token fixtures ───────────────────────────────────────────────────────────

def _token_for(u: User) -> str:
    return create_access_token({
        "sub": str(u.id),
        "tenant_id": u.tenant_id,
        "role": u.role,
    })


@pytest.fixture
def super_admin_token(super_admin) -> str:
    return _token_for(super_admin)


@pytest.fixture
def dpo_token(dpo_user) -> str:
    return _token_for(dpo_user)


@pytest.fixture
def admin_token(admin_user) -> str:
    return _token_for(admin_user)


@pytest.fixture
def auditor_token(auditor_user) -> str:
    return _token_for(auditor_user)


@pytest.fixture
def dept_head_token(dept_head_user) -> str:
    return _token_for(dept_head_user)


@pytest.fixture
def tenant_b_token(tenant_b_user) -> str:
    return _token_for(tenant_b_user)


# ── Auth header helper ───────────────────────────────────────────────────────

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
