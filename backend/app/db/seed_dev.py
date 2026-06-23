"""Idempotent development seed data for Docker Compose."""

from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db import init_db  # noqa: F401  # register all model relationships
from app.db.session import SessionLocal
from app.models.tenant import Tenant
from app.models.user import User

DEFAULT_TENANT_NAME = "DataLegal Demo"
DEFAULT_TENANT_RUC = "9999999999001"
DEFAULT_ADMIN_EMAIL = "admin@datalegal.local"
DEFAULT_ADMIN_PASSWORD = "Admin123!"


def _env_flag(name: str) -> bool:
    """Return true when an env var is set to a truthy value."""
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def seed_dev_data(db: Session) -> None:
    """Create a demo tenant and admin user if they do not exist."""
    if settings.ENVIRONMENT == "production" or not _env_flag("SEED_DEV_DATA"):
        return

    tenant_ruc = os.getenv("DEV_TENANT_RUC", DEFAULT_TENANT_RUC)
    tenant = db.query(Tenant).filter(Tenant.ruc == tenant_ruc).first()
    if tenant is None:
        tenant = Tenant(
            name=os.getenv("DEV_TENANT_NAME", DEFAULT_TENANT_NAME),
            ruc=tenant_ruc,
            country="Ecuador",
            sector="Tecnologia",
            is_active=True,
        )
        db.add(tenant)
        db.flush()

    admin_email = os.getenv("DEV_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL)
    admin = db.query(User).filter(User.email == admin_email).first()
    if admin is None:
        admin = User(
            tenant_id=tenant.id,
            email=admin_email,
            hashed_password=get_password_hash(
                os.getenv("DEV_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)
            ),
            full_name=os.getenv("DEV_ADMIN_NAME", "DataLegal Admin"),
            role=os.getenv("DEV_ADMIN_ROLE", "SUPER_ADMIN"),
            is_active=True,
        )
        db.add(admin)

    db.commit()


def main() -> None:
    """Run development seed data creation."""
    db = SessionLocal()
    try:
        seed_dev_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
