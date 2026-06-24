"""One-time production bootstrap for the first tenant and SUPER_ADMIN user."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from app.core.config import settings
from app.core.security import get_password_hash
from app.db import init_db  # noqa: F401  # register all model relationships
from app.db.session import SessionLocal
from app.models.tenant import Tenant
from app.models.user import User

REQUIRED_ENV_VARS = (
    "BOOTSTRAP_TENANT_NAME",
    "BOOTSTRAP_TENANT_RUC",
    "BOOTSTRAP_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_PASSWORD",
    "BOOTSTRAP_ADMIN_NAME",
)


def _required_env(name: str) -> str:
    """Return a required bootstrap environment variable."""
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required for production bootstrap.")
    return value


def main() -> None:
    """Create the first production tenant and SUPER_ADMIN user if absent."""
    if settings.ENVIRONMENT != "production":
        raise RuntimeError("bootstrap_prod must only run with ENVIRONMENT=production.")

    db = SessionLocal()
    try:
        tenant_ruc = _required_env("BOOTSTRAP_TENANT_RUC")
        admin_email = _required_env("BOOTSTRAP_ADMIN_EMAIL")

        tenant = db.query(Tenant).filter(Tenant.ruc == tenant_ruc).first()
        if tenant is None:
            tenant = Tenant(
                name=_required_env("BOOTSTRAP_TENANT_NAME"),
                ruc=tenant_ruc,
                country=os.getenv("BOOTSTRAP_TENANT_COUNTRY", "Ecuador"),
                sector=os.getenv("BOOTSTRAP_TENANT_SECTOR") or None,
                is_active=True,
            )
            db.add(tenant)
            db.flush()

        admin = db.query(User).filter(User.email == admin_email).first()
        if admin is None:
            admin = User(
                tenant_id=tenant.id,
                email=admin_email,
                hashed_password=get_password_hash(_required_env("BOOTSTRAP_ADMIN_PASSWORD")),
                full_name=_required_env("BOOTSTRAP_ADMIN_NAME"),
                role="SUPER_ADMIN",
                is_active=True,
                last_activity_at=datetime.now(timezone.utc),
            )
            db.add(admin)
        elif admin.role != "SUPER_ADMIN":
            raise RuntimeError(
                f"User {admin_email} already exists but is not SUPER_ADMIN; refusing to modify it."
            )

        db.commit()
        print(f"Bootstrap ready: tenant_id={tenant.id} admin_email={admin_email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
