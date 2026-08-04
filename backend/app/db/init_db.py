"""
Database initialization helper for development and testing.
Production uses Alembic migrations.
"""

from sqlalchemy import Engine

from app.db.base import Base

# Import all models to register them with Base.metadata
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
    role,
    tenant,
    training,
    treatment_activity,
    user,
)


def init_db(engine: Engine) -> None:
    """Create all tables. Use only for dev/test."""
    Base.metadata.create_all(bind=engine)


def drop_db(engine: Engine) -> None:
    """Drop all tables. Use only for dev/test."""
    Base.metadata.drop_all(bind=engine)
