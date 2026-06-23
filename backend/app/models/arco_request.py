"""RF-30 / US-RF30-1: ARCO rights requests (Access, Rectification, Cancellation, Opposition)."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class ARCORequest(TenantBase):
    """Tracks a citizen's ARCO rights request from receipt to resolution."""

    __tablename__ = "arco_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ticket_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    # ACCESS | RECTIFICATION | CANCELLATION | OPPOSITION
    request_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    requester_name: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_email: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_id_number: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # RECEIVED | VERIFYING | IN_PROGRESS | RESPONDED | CLOSED | REJECTED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="RECEIVED", index=True)
    received_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline_date: Mapped[date] = mapped_column(Date, nullable=False)
    assigned_dpo_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    response_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
