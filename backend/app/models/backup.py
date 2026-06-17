"""US-RF23-1: Backup record model (RF-23).

BackupRecord uses Base (not TenantBase) because it is a system-wide admin
record.  tenant_id is stored as a plain nullable column so that a single
record can represent either a per-tenant backup (tenant_id set) or a full
system backup (tenant_id=None).
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BackupRecord(Base):
    """Audit trail for database backup operations.

    status values: PENDING, COMPLETED, FAILED, VERIFIED.
    checksum_sha256 stores the hex digest of the backup file for integrity
    verification.  verified_at is set when the checksum is confirmed correct.
    """

    __tablename__ = "backup_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # None = full system backup; set = per-tenant backup
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # PENDING | COMPLETED | FAILED | VERIFIED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="COMPLETED")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
