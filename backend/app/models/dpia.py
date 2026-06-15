"""RF-09 / US-RF09-1: Data Protection Impact Assessment (DPIA)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class DPIAssessment(TenantBase):
    """Multi-step DPIA linked to a treatment activity."""

    __tablename__ = "dpia_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    treatment_activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("treatment_activities.id"), nullable=False, index=True
    )
    step1_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    step2_risk_analysis: Mapped[str] = mapped_column(Text, nullable=False, default="")
    step3_mitigations: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT", index=True)
    # DRAFT | COMPLETED | SIGNED
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    pdf_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

