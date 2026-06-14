from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase


class PortabilityRequest(TenantBase):
    __tablename__ = "portability_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    request_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="PENDING", index=True
    )  # PENDING, IN_PROGRESS, COMPLETED, REJECTED
    response_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON stored as text
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
