"""RF-43 / US-RF43-1: Action plans and templates for risk remediation."""

from datetime import date

from sqlalchemy import JSON, Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class ActionPlanTemplate(TenantBase):
    """Reusable template that pre-populates action plan tasks by risk level."""

    __tablename__ = "action_plan_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # HIGH | MEDIUM | ANY
    applies_to_level: Mapped[str] = mapped_column(String(20), nullable=False, default="ANY")
    default_tasks: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ActionPlan(TenantBase):
    """A concrete action plan, optionally generated from a template or risk assessment."""

    __tablename__ = "action_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    risk_assessment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("risk_assessments.id"), nullable=True, index=True
    )
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("action_plan_templates.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # DRAFT | ACTIVE | COMPLETED | CANCELLED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT", index=True)
    tasks: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    auto_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

