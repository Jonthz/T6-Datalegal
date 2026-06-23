"""RF-04 / US-RF35-1: Data processing activity registration via guided questionnaire."""

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class TreatmentActivity(TenantBase):
    """TreatmentActivity schema/model definition."""
    __tablename__ = "treatment_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    legal_basis: Mapped[str] = mapped_column(String(100), nullable=False)
    personal_data_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    data_subjects: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    retention_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=365)
    is_cross_border: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    destination_countries: Mapped[list] = mapped_column(JSON, nullable=True, default=list)
    processor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    processor_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, index=True
    )
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)
    # DRAFT, ACTIVE, ARCHIVED

    information_assets: Mapped[list] = relationship(
        "InformationAsset", back_populates="treatment_activity", lazy="noload"
    )
    risk_assessments: Mapped[list] = relationship(
        "RiskAssessment", back_populates="treatment_activity", lazy="noload"
    )
