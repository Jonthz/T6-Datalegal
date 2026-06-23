#!/usr/bin/env python3
"""US-RF23-1: CLI backup script for scheduled daily backups.

Usage:
    python scripts/backup.py [--db-path PATH] [--backup-dir DIR]

RPO: ≤24 hours (run daily via cron: 0 2 * * * python /app/scripts/backup.py)
RTO: ≤4 hours (restore from latest VERIFIED backup)

Retention: keeps last 30 backups, removes older ones automatically.

Example crontab entry (daily at 02:00 UTC):
    0 2 * * * cd /path/to/backend && /path/to/venv/bin/python scripts/backup.py \
        >> /var/log/datalegal-backup.log 2>&1
"""

import hashlib
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


def compute_sha256(path: Path) -> str:
    """Return the SHA-256 hex digest for a file."""

    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def run_backup(db_path: Path, backup_dir: Path, retention_days: int = 30) -> int:
    """Create, verify, and prune SQLite database backups."""

    if not db_path.exists():
        print(f"ERROR: Database file not found: {db_path.resolve()}", file=sys.stderr)
        return 1

    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = backup_dir / f"backup_{timestamp}.db"

    shutil.copy2(db_path, dest)
    checksum = compute_sha256(dest)
    size_mb = dest.stat().st_size / (1024 * 1024)

    print(f"[{timestamp}] Backup created: {dest.name}")
    print(f"  Source : {db_path.resolve()}")
    print(f"  Size   : {size_mb:.2f} MB")
    print(f"  SHA-256: {checksum}")

    # Verify immediately after creation
    verify_checksum = compute_sha256(dest)
    if verify_checksum == checksum:
        print("  Verify : OK (checksum matches)")
    else:
        print("  Verify : FAILED — checksum mismatch!", file=sys.stderr)
        dest.unlink(missing_ok=True)
        return 2

    # Prune backups older than retention_days
    all_backups = sorted(backup_dir.glob("backup_*.db"), key=lambda p: p.stat().st_mtime)
    while len(all_backups) > retention_days:
        oldest = all_backups.pop(0)
        oldest.unlink(missing_ok=True)
        print(f"  Pruned : {oldest.name}")

    return 0


def main() -> int:
    """Parse CLI arguments and run the backup job."""

    import argparse

    parser = argparse.ArgumentParser(description="DataLegal 2.0 — database backup (US-RF23-1)")
    parser.add_argument("--db-path", default="datalegal.db", help="Path to SQLite database file")
    parser.add_argument("--backup-dir", default="backups", help="Directory to store backups")
    parser.add_argument("--retention", type=int, default=30, help="Number of backups to retain")
    args = parser.parse_args()

    return run_backup(
        db_path=Path(args.db_path),
        backup_dir=Path(args.backup_dir),
        retention_days=args.retention,
    )


if __name__ == "__main__":
    sys.exit(main())
