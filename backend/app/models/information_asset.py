"""RF-36 / US-RF36-1: Technical metadata registration. US-RF38-1: Classification levels."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class InformationAsset(TenantBase):
    __tablename__ = "information_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Catalog-backed fields (codes reference CatalogEntry.code)
    asset_type_code: Mapped[str] = mapped_column(String(100), nullable=False)
    format_code: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_medium_code: Mapped[str] = mapped_column(String(100), nullable=False)
    # US-RF38-1: Pública de Uso Interno | Pública Clasificada | Pública Reservada
    classification_level_code: Mapped[str] = mapped_column(String(100), nullable=False)
    treatment_activity_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("treatment_activities.id"), nullable=True, index=True
    )
    department_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, index=True
    )
    owner_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    treatment_activity: Mapped["TreatmentActivity | None"] = relationship(  # noqa: F821
        "TreatmentActivity", back_populates="information_assets", lazy="noload"
    )
    retention_records: Mapped[list] = relationship(
        "RetentionRecord", back_populates="information_asset", lazy="noload"
    )
