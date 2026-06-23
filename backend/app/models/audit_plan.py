"""US-RF13-1: Audit planning, findings, and PDF report generation."""

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase

# AuditPlan statuses
AUDIT_PLAN_STATUSES = {"PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}

# Finding severities (ISO/IEC 27001 aligned)
FINDING_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}

# Finding statuses
FINDING_STATUSES = {"OPEN", "IN_REMEDIATION", "RESOLVED", "ACCEPTED_RISK"}


class AuditPlan(TenantBase):
    """An audit planning record — scope, period, and assigned auditor."""

    __tablename__ = "audit_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False, default="")
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    auditor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    # PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PLANNED", index=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")


class AuditFinding(TenantBase):
    """An individual finding within an audit plan, with evidence and severity."""

    __tablename__ = "audit_findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    audit_plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("audit_plans.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    evidence: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # CRITICAL | HIGH | MEDIUM | LOW | INFO
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    # OPEN | IN_REMEDIATION | RESOLVED | ACCEPTED_RISK
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="OPEN", index=True)
    remediation_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    remediation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
