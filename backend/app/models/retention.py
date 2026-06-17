"""RF-11 / RF-29 / US-RF29-1: Data retention policies and expired-record alerts."""

from datetime import date

from sqlalchemy import JSON, Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class RetentionPolicy(TenantBase):
    """Defines how long a data category must be retained and what happens at expiry."""

    __tablename__ = "retention_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    data_category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    retention_days: Mapped[int] = mapped_column(Integer, nullable=False)
    action_on_expiry: Mapped[str] = mapped_column(String(50), nullable=False, default="REVIEW")
    # DELETE | ANONYMIZE | REVIEW
    legal_basis: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    records: Mapped[list] = relationship(
        "RetentionRecord", back_populates="policy", lazy="noload"
    )


class RetentionRecord(TenantBase):
    """Tracks retention status of individual InformationAssets (US-RF29-1)."""

    __tablename__ = "retention_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    information_asset_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("information_assets.id"), nullable=False, index=True
    )
    policy_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("retention_policies.id"), nullable=True
    )
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE", index=True)
    # ACTIVE | UNDER_REVIEW | EXPIRED | CLOSED
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hold_justification: Mapped[str] = mapped_column(Text, nullable=False, default="")
    review_decision: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # RETAIN | DELETE | ANONYMIZE
    decision_rationale: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    information_asset: Mapped["InformationAsset"] = relationship(  # noqa: F821
        "InformationAsset", back_populates="retention_records", lazy="noload"
    )
    policy: Mapped["RetentionPolicy | None"] = relationship(
        "RetentionPolicy", back_populates="records", lazy="noload"
    )


class RetentionExecutionLog(TenantBase):
    """Audit log for retention policy execution runs (US-RF11-1)."""

    __tablename__ = "retention_execution_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("retention_policies.id"), nullable=True
    )
    executed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    records_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_exceptions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUCCESS")
    # SUCCESS | PARTIAL | FAILED
    log_details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    run_type: Mapped[str] = mapped_column(String(50), nullable=False, default="MANUAL")
    # MANUAL | SCHEDULED
