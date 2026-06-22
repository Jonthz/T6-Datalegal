"""US-RF23-1: Database backup creation and integrity verification (RF-23)."""

import hashlib
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.core.config import settings
from app.models.audit_log import AuditLog
from app.models.backup import BackupRecord
from app.models.user import User
from app.schemas.backup import BackupRecordRead, BackupVerifyResult

router = APIRouter(prefix="/backups", tags=["backups"])

_BACKUP_DIR = Path("backups")


def _compute_sha256(path: Path) -> str:
    """Return the hex SHA-256 digest of the file at *path*."""
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


@router.post("/create", response_model=BackupRecordRead)
def create_backup(
    current_user: Annotated[User, Depends(require_permission("backups", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a database backup snapshot and record its checksum.

    For SQLite, this copies the entire .db file: that file contains *every*
    tenant's data, so we restrict creation to ``SUPER_ADMIN``. Tenant-scoped
    roles (DPO, ADMIN) get 403 with explanatory detail.

    For PostgreSQL, the record is created in ``PENDING`` state for the
    operator to fill in via pg_dump. Tenant-scoped backups via pg_dump --schema
    or per-row dumps are out of scope for this sprint and tracked as a Sprint 5
    carry-forward.
    """
    db_url: str = settings.DATABASE_URL
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.db"

    if db_url.startswith("sqlite"):
        # US-RF19-1 / C-3: SQLite snapshot is cross-tenant by construction.
        # Block tenant-scoped users to prevent silent data exposure.
        if current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=403,
                detail=(
                    "SQLite backup contains all tenants' data and is restricted "
                    "to SUPER_ADMIN. For tenant-scoped backups, deploy on PostgreSQL."
                ),
            )

        import re as _re
        # Parse path from sqlite:///./foo.db or sqlite+aiosqlite:///foo.db
        m = _re.match(r"sqlite(?:\+\w+)?:///(.+)", db_url)
        raw_path = m.group(1) if m else "datalegal.db"
        db_path = Path(raw_path)

        # Probe candidate paths in order
        candidates = [db_path, Path("datalegal.db"), Path("test_datalegal.db")]
        db_path = next((p for p in candidates if p.exists()), None)

        if db_path is None:
            raise HTTPException(
                status_code=500,
                detail="SQLite database file not found. Tried: datalegal.db, test_datalegal.db",
            )

        _BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        dest = _BACKUP_DIR / filename
        shutil.copy2(db_path, dest)
        checksum = _compute_sha256(dest)
        size_bytes = dest.stat().st_size
        backup_status = "COMPLETED"
        notes = f"SQLite snapshot copied from {db_path.resolve()} (all tenants)"
    else:
        # PostgreSQL (or other): create a PENDING record for manual pg_dump
        checksum = ""
        size_bytes = 0
        backup_status = "PENDING"
        notes = "PostgreSQL backup: run pg_dump manually and update this record."

    record = BackupRecord(
        tenant_id=tenant_id,
        filename=filename,
        checksum_sha256=checksum,
        size_bytes=size_bytes,
        status=backup_status,
        notes=notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    AuditLog.create_log(
        db,
        action="backup_created",
        resource="backups",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={record.id} filename={filename} status={backup_status} size={size_bytes}",
    )
    return record


@router.get("", response_model=list[BackupRecordRead])
def list_backups(
    current_user: Annotated[User, Depends(require_permission("backups", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """List backup records (filtered to current tenant or all if SUPER_ADMIN)."""
    q = db.query(BackupRecord)
    if current_user.role != "SUPER_ADMIN":
        q = q.filter(BackupRecord.tenant_id == tenant_id)
    return q.order_by(BackupRecord.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{backup_id}", response_model=BackupRecordRead)
def get_backup(
    backup_id: int,
    current_user: Annotated[User, Depends(require_permission("backups", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve a single backup record by ID."""
    record = db.get(BackupRecord, backup_id)
    if not record:
        raise HTTPException(status_code=404, detail="Backup record not found.")
    if current_user.role != "SUPER_ADMIN" and record.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return record


@router.post("/{backup_id}/verify", response_model=BackupVerifyResult)
def verify_backup(
    backup_id: int,
    current_user: Annotated[User, Depends(require_permission("backups", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Verify backup file integrity by recomputing its SHA-256 checksum."""
    record = db.get(BackupRecord, backup_id)
    if not record:
        raise HTTPException(status_code=404, detail="Backup record not found.")
    if current_user.role != "SUPER_ADMIN" and record.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    backup_path = _BACKUP_DIR / record.filename
    if not backup_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Backup file '{record.filename}' not found on disk. Cannot verify.",
        )

    actual_checksum = _compute_sha256(backup_path)
    is_valid = actual_checksum == record.checksum_sha256
    verified_at = datetime.now(timezone.utc)

    record.verified_at = verified_at
    record.status = "VERIFIED" if is_valid else "FAILED"
    db.commit()
    db.refresh(record)

    AuditLog.create_log(
        db,
        action="backup_verified",
        resource="backups",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={backup_id} valid={is_valid} filename={record.filename}",
    )

    return BackupVerifyResult(
        backup_id=record.id,
        filename=record.filename,
        expected_checksum=record.checksum_sha256,
        actual_checksum=actual_checksum,
        is_valid=is_valid,
        verified_at=verified_at,
    )
