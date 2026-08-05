from datetime import datetime

from pydantic import BaseModel, field_validator

from app.core.permissions import SYSTEM_ROLES
from app.core.security import validate_password_strength

# Kept for backward compatibility; SYSTEM_ROLES (app.core.permissions) is now the
# source of truth. A role is valid if it's a system role OR a tenant custom role
# (Cycle 6) — the latter can only be checked against the DB, so that check lives
# in the users router (see app/api/v1/users.py), not here.
VALID_ROLES = SYSTEM_ROLES


class UserCreate(BaseModel):
    """UserCreate schema/model definition."""

    email: str
    password: str
    full_name: str
    role: str = "AUDITOR"
    department_id: int | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Handle validate password."""
        is_valid, error = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error)
        return v


class UserUpdate(BaseModel):
    """UserUpdate schema/model definition."""

    email: str | None = None
    full_name: str | None = None
    role: str | None = None
    department_id: int | None = None
    is_active: bool | None = None
    password: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        """Handle validate password."""
        if v is not None:
            is_valid, error = validate_password_strength(v)
            if not is_valid:
                raise ValueError(error)
        return v


class UserRead(BaseModel):
    """UserRead schema/model definition."""

    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    email: str
    full_name: str
    role: str
    account_scope: str
    department_id: int | None
    is_active: bool
    mfa_enabled: bool
    created_at: datetime
    updated_at: datetime
