"""Pydantic schemas for consent management — US-RF32-1, US-RF25-1."""

from datetime import datetime

from pydantic import BaseModel

# ── ConsentRecord ───


class ConsentRecordCreate(BaseModel):
    """ConsentRecordCreate schema/model definition."""
    treatment_activity_id: int | None = None
    data_subject_token: str
    legal_basis: str
    purpose: str
    is_sensitive: bool = False


class ConsentRevoke(BaseModel):
    """ConsentRevoke schema/model definition."""
    revocation_reason: str = ""


class ConsentRecordRead(BaseModel):
    """ConsentRecordRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    treatment_activity_id: int | None
    data_subject_token: str
    legal_basis: str
    purpose: str
    is_sensitive: bool
    granted_at: datetime
    is_revoked: bool
    revoked_at: datetime | None
    revocation_reason: str


# ── CookieBanner ───


class CookieBannerCreate(BaseModel):
    """CookieBannerCreate schema/model definition."""
    version: str
    content: str
    effective_date: datetime


class CookieBannerUpdate(BaseModel):
    """CookieBannerUpdate schema/model definition."""
    content: str | None = None
    is_active: bool | None = None


class CookieBannerRead(BaseModel):
    """CookieBannerRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    version: str
    content: str
    effective_date: datetime
    is_active: bool
    created_at: datetime


# ── CookieConsent ───


class CookieConsentCreate(BaseModel):
    """CookieConsentCreate schema/model definition."""
    banner_id: int
    data_subject_token: str


class CookieConsentRead(BaseModel):
    """CookieConsentRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    banner_id: int
    data_subject_token: str
    accepted_at: datetime
    revoked_at: datetime | None
    is_revoked: bool
