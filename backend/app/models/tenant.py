from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    """Tenant schema/model definition."""
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ruc: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="Ecuador")
    sector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # US-RF03-1: DPO and organization profile
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dpo_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dpo_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dpo_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
