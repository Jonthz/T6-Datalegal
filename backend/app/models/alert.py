"""US-RF18-1: Internal alert / notification model (RF-18)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class Alert(TenantBase):
    """Internal alert sent to DPO users within a tenant.

    recipient_id=None means the alert is broadcast to all DPOs in the tenant.
    Severity levels: INFO, WARNING, CRITICAL.
    """

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Discriminator — e.g. BREACH_REPORTED, ARCO_DEADLINE_APPROACHING, ARCO_OVERDUE,
    # TASK_ASSIGNED, AUDIT_SCHEDULED, CONSENT_EXPIRING, GENERAL
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # INFO | WARNING | CRITICAL
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="INFO")
    # Optional back-reference to the originating resource
    resource_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # None = broadcast to all DPOs in the tenant
    recipient_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    # created_at inherited from TenantBase (TimestampMixin)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
