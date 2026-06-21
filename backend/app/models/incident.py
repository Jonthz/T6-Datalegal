"""RF-17 / US-RF08-1: Security incident registration and regulatory notifications."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class Incident(TenantBase):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    incident_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # DATA_BREACH | UNAUTHORIZED_ACCESS | SYSTEM_FAILURE | POLICY_VIOLATION | OTHER
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="MEDIUM")
    # LOW | MEDIUM | HIGH | CRITICAL
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="OPEN", index=True)
    # OPEN | INVESTIGATING | RESOLVED | CLOSED
    regulatory_notification_required: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    regulatory_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reporter_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    assigned_to_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    affected_data_types: Mapped[str] = mapped_column(Text, nullable=False, default="")
    department_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, index=True
    )
