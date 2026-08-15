from datetime import datetime

from pydantic import BaseModel, field_validator

INCIDENT_TYPES = [
    "DATA_BREACH",
    "UNAUTHORIZED_ACCESS",
    "SYSTEM_FAILURE",
    "POLICY_VIOLATION",
    "OTHER",
]
SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
INCIDENT_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"]
# DAT-52: SSPDP breach form — type(s) of security breach (CIA triad).
VULNERABILITY_TYPES = ["CONFIDENTIALITY", "INTEGRITY", "AVAILABILITY"]


def _validate_vulnerability_types(value: list[str]) -> list[str]:
    """Ensure every value is a known SSPDP breach type, de-duplicated and ordered."""
    invalid = [v for v in value if v not in VULNERABILITY_TYPES]
    if invalid:
        raise ValueError(f"Invalid vulnerability_types {invalid}. Allowed: {VULNERABILITY_TYPES}")
    # Preserve canonical order, drop duplicates.
    return [v for v in VULNERABILITY_TYPES if v in value]


class IncidentCreate(BaseModel):
    """IncidentCreate schema/model definition."""

    title: str
    description: str
    incident_type: str
    severity: str = "MEDIUM"
    vulnerability_types: list[str] = []
    regulatory_notification_required: bool = False
    affected_data_types: str = ""
    department_id: int | None = None
    assigned_to_id: int | None = None
    # DAT-52: SSPDP form — delegado (DPO) and responsable (controller) details.
    delegate_name: str | None = None
    delegate_email: str | None = None
    delegate_phone: str | None = None
    controller_name: str | None = None
    controller_email: str | None = None
    controller_phone: str | None = None

    @field_validator("vulnerability_types")
    @classmethod
    def _check_vuln(cls, value: list[str]) -> list[str]:
        return _validate_vulnerability_types(value)


class IncidentUpdate(BaseModel):
    """IncidentUpdate schema/model definition."""

    title: str | None = None
    description: str | None = None
    incident_type: str | None = None
    severity: str | None = None
    status: str | None = None
    vulnerability_types: list[str] | None = None
    regulatory_notification_required: bool | None = None
    regulatory_notified_at: datetime | None = None
    assigned_to_id: int | None = None
    resolved_at: datetime | None = None
    affected_data_types: str | None = None
    delegate_name: str | None = None
    delegate_email: str | None = None
    delegate_phone: str | None = None
    controller_name: str | None = None
    controller_email: str | None = None
    controller_phone: str | None = None

    @field_validator("vulnerability_types")
    @classmethod
    def _check_vuln(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else _validate_vulnerability_types(value)


class IncidentClose(BaseModel):
    """DAT-52: payload to close an incident and generate its PDF closure report."""

    closure_summary: str


class IncidentRead(BaseModel):
    """IncidentRead schema/model definition."""

    id: int
    tenant_id: int
    title: str
    description: str
    incident_type: str
    severity: str
    status: str
    vulnerability_types: list[str]
    regulatory_notification_required: bool
    regulatory_notified_at: datetime | None
    reporter_id: int | None
    assigned_to_id: int | None
    resolved_at: datetime | None
    affected_data_types: str
    department_id: int | None
    delegate_name: str | None
    delegate_email: str | None
    delegate_phone: str | None
    controller_name: str | None
    controller_email: str | None
    controller_phone: str | None
    closure_summary: str
    closed_at: datetime | None
    # Derived from the Incident.has_closure_report property (True once the
    # closure PDF has been generated and stored).
    has_closure_report: bool
    created_at: datetime

    model_config = {"from_attributes": True}
