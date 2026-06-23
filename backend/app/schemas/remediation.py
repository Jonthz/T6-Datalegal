"""Pydantic schemas for remediations with risk impact — US-RF12-1."""

from datetime import date, datetime

from pydantic import BaseModel


class RemediationCreate(BaseModel):
    """RemediationCreate schema/model definition."""
    risk_assessment_id: int
    title: str
    description: str = ""
    responsible_id: int | None = None
    due_date: date | None = None


class RemediationUpdate(BaseModel):
    """RemediationUpdate schema/model definition."""
    title: str | None = None
    description: str | None = None
    responsible_id: int | None = None
    due_date: date | None = None
    completed_date: date | None = None
    status: str | None = None
    risk_score_after: int | None = None
    risk_level_after: str | None = None


class RemediationRead(BaseModel):
    """RemediationRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    risk_assessment_id: int
    title: str
    description: str
    responsible_id: int | None
    due_date: date | None
    completed_date: date | None
    status: str
    risk_score_before: int | None
    risk_score_after: int | None
    risk_level_before: str | None
    risk_level_after: str | None
    created_by_id: int | None
    created_at: datetime
