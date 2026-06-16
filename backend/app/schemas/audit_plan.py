"""Pydantic schemas for audit planning — US-RF13-1."""

from datetime import date, datetime

from pydantic import BaseModel


class AuditPlanCreate(BaseModel):
    name: str
    scope: str = ""
    period_start: date | None = None
    period_end: date | None = None
    auditor_id: int | None = None
    notes: str = ""


class AuditPlanUpdate(BaseModel):
    name: str | None = None
    scope: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    auditor_id: int | None = None
    status: str | None = None
    notes: str | None = None


class AuditPlanRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    name: str
    scope: str
    period_start: date | None
    period_end: date | None
    auditor_id: int | None
    status: str
    notes: str
    created_at: datetime


class AuditFindingCreate(BaseModel):
    audit_plan_id: int
    title: str
    description: str = ""
    evidence: str = ""
    severity: str = "MEDIUM"
    remediation_notes: str = ""
    remediation_date: date | None = None


class AuditFindingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    evidence: str | None = None
    severity: str | None = None
    status: str | None = None
    remediation_notes: str | None = None
    remediation_date: date | None = None


class AuditFindingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    audit_plan_id: int
    title: str
    description: str
    evidence: str
    severity: str
    status: str
    remediation_notes: str
    remediation_date: date | None
    created_by_id: int | None
    created_at: datetime
