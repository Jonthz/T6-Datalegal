"""RF-10 / RF-37 / US-RF37-1: Risk assessment questionnaire and scoring engine.

Score = Probability (1–5) × Impact (1–5), range 1–25.
GREEN 1–8 | YELLOW 9–16 | RED 17–25  (ISO/IEC 27005)
"""

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


def _compute_level(score: int) -> str:
    """Handle compute level."""
    if score <= 8:
        return "LOW"
    if score <= 16:
        return "MEDIUM"
    return "HIGH"


class RiskAssessment(TenantBase):
    """RiskAssessment schema/model definition."""

    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    treatment_activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("treatment_activities.id"), nullable=False, index=True
    )
    analyst_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    # Questionnaire responses: {"q1": true, "q2": false, ...}
    responses: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    probability: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1-5
    impact: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1-5
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1-25
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    treatment_activity: Mapped["TreatmentActivity"] = relationship(  # noqa: F821
        "TreatmentActivity", back_populates="risk_assessments", lazy="noload"
    )
