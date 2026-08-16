from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase

# US-RF05-1: LOPDP sensitivity classification
DATA_SENSITIVITIES = {"ORDINARY", "SENSITIVE"}

# US-RF05-1: Criticality based on business impact
DATA_CRITICALITIES = {"LOW", "MEDIUM", "HIGH"}


class CatalogEntry(TenantBase):
    """CatalogEntry schema/model definition."""
    __tablename__ = "catalog_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # US-RF05-1: automatic classification fields
    sensitivity: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    criticality: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    # US-RF20-1: versioning support
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )


class CatalogEntryVersion(TenantBase):
    """US-RF20-1: Immutable snapshot of a catalog entry at each edit (version history)."""
    __tablename__ = "catalog_entry_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    catalog_entry_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("catalog_entries.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sensitivity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    criticality: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    changed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
