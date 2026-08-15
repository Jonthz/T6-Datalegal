"""Pydantic schemas for backup records — US-RF23-1, RF-23."""

from datetime import datetime

from pydantic import BaseModel

# ── BackupRecord ──────────────────────────────────────────────────────────────


class BackupRecordCreate(BaseModel):
    """Payload for creating a backup record manually."""

    tenant_id: int | None = None
    filename: str
    notes: str = ""


class BackupRecordRead(BaseModel):
    """Backup record returned by the API."""

    model_config = {"from_attributes": True}

    id: int
    tenant_id: int | None
    filename: str
    checksum_sha256: str
    size_bytes: int
    status: str
    notes: str
    created_at: datetime
    verified_at: datetime | None


# ── Verification result ───────────────────────────────────────────────────────


class BackupVerifyResult(BaseModel):
    """Result of verifying a backup checksum."""

    backup_id: int
    filename: str
    expected_checksum: str
    actual_checksum: str
    is_valid: bool
    verified_at: datetime
