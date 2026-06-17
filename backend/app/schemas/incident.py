from datetime import datetime

from pydantic import BaseModel

INCIDENT_TYPES = [
    "DATA_BREACH",
    "UNAUTHORIZED_ACCESS",
    "SYSTEM_FAILURE",
    "POLICY_VIOLATION",
    "OTHER",
]
SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
INCIDENT_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"]


class IncidentCreate(BaseModel):
    title: str
    description: str
    incident_type: str
    severity: str = "MEDIUM"
    regulatory_notification_required: bool = False
    affected_data_types: str = ""
    department_id: int | None = None
    assigned_to_id: int | None = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    incident_type: str | None = None
    severity: str | None = None
    status: str | None = None
    regulatory_notification_required: bool | None = None
    regulatory_notified_at: datetime | None = None
    assigned_to_id: int | None = None
    resolved_at: datetime | None = None
    affected_data_types: str | None = None


class IncidentRead(BaseModel):
    id: int
    tenant_id: int
    title: str
    description: str
    incident_type: str
    severity: str
    status: str
    regulatory_notification_required: bool
    regulatory_notified_at: datetime | None
    reporter_id: int | None
    assigned_to_id: int | None
    resolved_at: datetime | None
    affected_data_types: str
    department_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
