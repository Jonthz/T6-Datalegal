"""Pydantic schemas for action plans and templates — US-RF43-1."""

from datetime import date, datetime

from pydantic import BaseModel


class ActionPlanTemplateCreate(BaseModel):
    """ActionPlanTemplateCreate schema/model definition."""
    name: str
    description: str = ""
    applies_to_level: str = "ANY"  # HIGH | MEDIUM | ANY
    default_tasks: list[dict] = []


class ActionPlanTemplateRead(BaseModel):
    """ActionPlanTemplateRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    name: str
    description: str
    applies_to_level: str
    default_tasks: list
    is_active: bool


class ActionPlanCreate(BaseModel):
    """ActionPlanCreate schema/model definition."""
    risk_assessment_id: int | None = None
    template_id: int | None = None
    title: str
    description: str = ""
    tasks: list[dict] = []
    target_date: date | None = None


class ActionPlanUpdate(BaseModel):
    """ActionPlanUpdate schema/model definition."""
    title: str | None = None
    description: str | None = None
    status: str | None = None
    tasks: list[dict] | None = None
    target_date: date | None = None


class ActionPlanRead(BaseModel):
    """ActionPlanRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    risk_assessment_id: int | None
    template_id: int | None
    title: str
    description: str
    status: str
    tasks: list
    target_date: date | None
    auto_generated: bool
    created_by_id: int | None
    created_at: datetime
