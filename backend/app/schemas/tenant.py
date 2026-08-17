from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserCreate


class TenantCreate(BaseModel):
    """TenantCreate schema/model definition."""

    name: str
    ruc: str
    country: str = "Ecuador"
    sector: str | None = None


class TenantRead(BaseModel):
    """TenantRead schema/model definition."""

    model_config = {"from_attributes": True}

    id: int
    name: str
    ruc: str
    country: str
    sector: str | None
    is_active: bool
    created_at: datetime
    # US-RF03-1: DPO and organization profile fields
    address: str | None = None
    website: str | None = None
    dpo_name: str | None = None
    dpo_email: str | None = None
    dpo_phone: str | None = None


class TenantProfileUpdate(BaseModel):
    """US-RF03-1: Update company profile and DPO information."""

    name: str | None = None
    country: str | None = None
    sector: str | None = None
    address: str | None = None
    website: str | None = None
    dpo_name: str | None = None
    dpo_email: str | None = None
    dpo_phone: str | None = None


class TenantProvision(BaseModel):
    """Creates a tenant and its first DPO/ADMIN account in one call."""

    tenant: TenantCreate
    admin_user: UserCreate
