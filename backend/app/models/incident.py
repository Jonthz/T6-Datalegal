"""RF-17 / US-RF08-1: Security incident registration and regulatory notifications.

DAT-52: aligned with the SSPDP breach form — records the type(s) of security
breach (confidentiality / integrity / availability), the data protection officer
(delegado) and controller (responsable) details, and requires a generated PDF
closure report as evidence before an incident can be closed.
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class Incident(TenantBase):
    """Incident schema/model definition."""
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
    # DAT-52: type(s) of breach per the SSPDP form. Subset of
    # CONFIDENTIALITY | INTEGRITY | AVAILABILITY (multiple may apply).
    vulnerability_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    regulatory_notification_required: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    regulatory_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reporter_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    affected_data_types: Mapped[str] = mapped_column(Text, nullable=False, default="")
    department_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, index=True
    )

    # DAT-52: SSPDP form — data protection officer (delegado) snapshot.
    delegate_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delegate_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delegate_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # DAT-52: SSPDP form — data controller (responsable) snapshot.
    controller_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    controller_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    controller_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # DAT-52: closure evidence. An incident can only be CLOSED once a PDF
    # closure report has been generated and stored.
    closure_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    closure_report_pdf: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def has_closure_report(self) -> bool:
        """Whether a generated PDF closure report has been stored (DAT-52)."""
        return self.closure_report_pdf is not None
