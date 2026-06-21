"""US-RF12-1: Remediations with risk impact tracking."""

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase

REMEDIATION_STATUSES = {"OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"}


class Remediation(TenantBase):
    """A remediation action linked to a risk assessment.

    Tracks risk score before/after to demonstrate impact.
    """

    __tablename__ = "remediations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    risk_assessment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("risk_assessments.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    responsible_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # OPEN | IN_PROGRESS | COMPLETED | CANCELLED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="OPEN", index=True)
    # Risk impact before/after for audit evidence (RF-12)
    risk_score_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_score_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level_before: Mapped[str | None] = mapped_column(String(20), nullable=True)
    risk_level_after: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
