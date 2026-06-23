"""Pydantic schemas for ARCO requests — US-RF30-1."""

from datetime import date, datetime

from pydantic import BaseModel

ARCO_TYPES = ["ACCESS", "RECTIFICATION", "CANCELLATION", "OPPOSITION"]
ARCO_STATUSES = ["RECEIVED", "VERIFYING", "IN_PROGRESS", "RESPONDED", "CLOSED", "REJECTED"]


class ARCORequestCreate(BaseModel):
    """Fields required to submit an ARCO rights request."""

    request_type: str
    requester_name: str
    requester_email: str
    requester_id_number: str
    description: str = ""


class ARCORequestUpdate(BaseModel):
    """Partial update fields for an ARCO request."""

    status: str | None = None
    assigned_dpo_id: int | None = None
    response_text: str | None = None
    rejection_reason: str | None = None


class ARCORequestRead(BaseModel):
    """ARCO request as returned by the API."""

    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    ticket_number: str
    request_type: str
    requester_name: str
    requester_email: str
    requester_id_number: str
    description: str
    status: str
    deadline_date: date
    received_date: date
    assigned_dpo_id: int | None
    response_text: str
    responded_at: datetime | None
    rejection_reason: str
    created_at: datetime
