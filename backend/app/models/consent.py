"""US-RF32-1: Explicit and immutable consent revocation.
US-RF25-1: Cookie banner versioning and consent tracking.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class ConsentRecord(TenantBase):
    """Immutable consent record with explicit revocation support.

    Once created, revocation is added by writing a new record (append-only semantics).
    The is_revoked flag is the only mutable field — set once, never cleared.
    """

    __tablename__ = "consent_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    treatment_activity_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("treatment_activities.id"), nullable=True, index=True
    )
    # Pseudonymized token — no real personal data stored (RF-06, RNF-06)
    data_subject_token: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    legal_basis: Mapped[str] = mapped_column(String(100), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Revocation — set once, never cleared (immutable per LOPDP Art.8 / RF-32)
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revocation_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )


class CookieBanner(TenantBase):
    """Versioned cookie consent banner (US-RF25-1)."""

    __tablename__ = "cookie_banners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )


class CookieConsent(TenantBase):
    """Data subject acceptance of a specific banner version (US-RF25-1)."""

    __tablename__ = "cookie_consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    banner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cookie_banners.id"), nullable=False, index=True
    )
    # Pseudonymized token — no real personal data
    data_subject_token: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
