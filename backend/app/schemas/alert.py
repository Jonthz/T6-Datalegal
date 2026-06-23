"""Pydantic schemas for internal alerts — US-RF18-1, RF-18."""

from datetime import datetime

from pydantic import BaseModel

# ── Alert ─────────────────────────────────────────────────────────────────────


class AlertCreate(BaseModel):
    """Fields required to create an internal alert."""

    alert_type: str
    title: str
    message: str
    severity: str = "INFO"
    resource_type: str | None = None
    resource_id: int | None = None
    recipient_id: int | None = None


class AlertMarkRead(BaseModel):
    """Empty body — used for PATCH /alerts/{id}/read."""


class AlertRead(BaseModel):
    """Alert as returned by the API."""

    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    alert_type: str
    title: str
    message: str
    severity: str
    resource_type: str | None
    resource_id: int | None
    recipient_id: int | None
    is_read: bool
    created_at: datetime
    read_at: datetime | None
