from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PortabilityRequestCreate(BaseModel):
    subject_name: str
    subject_email: str
    notes: str = ""


class PortabilityRequestUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    response_data: dict[str, Any] | None = None


class PortabilityRequestRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    subject_name: str
    subject_email: str
    request_date: datetime
    status: str
    notes: str
    completed_at: datetime | None
    created_at: datetime


class PortabilityExport(BaseModel):
    request_id: int
    subject: dict[str, str]
    data: dict[str, Any]
    format: str = "JSON"
    standard: str = "RFC8259"
    generated_at: datetime


class AuditLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int | None
    user_id: int | None
    action: str
    resource: str
    detail: str
    ip_address: str | None
    created_at: datetime
