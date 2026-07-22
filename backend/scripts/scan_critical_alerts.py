#!/usr/bin/env python3
"""US-RF18-1: CLI job that starts the automated internal alerts for critical events.

Scans every tenant's open legal deadlines (ARCO SLA, planned audits) and raises
the ARCO_OVERDUE / ARCO_DEADLINE_APPROACHING / AUDIT_SCHEDULED alerts that were
previously modeled but never emitted. Idempotent — safe to run on a schedule.

Usage:
    python scripts/scan_critical_alerts.py

Example crontab entry (hourly):
    0 * * * * cd /path/to/backend && /path/to/venv/bin/python scripts/scan_critical_alerts.py \
        >> /var/log/datalegal-critical-alerts.log 2>&1
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# pylint: disable=wrong-import-position
# The backend package is only importable once the path bootstrap above runs,
# so these imports cannot move to the top of the file (same pattern needed by
# any standalone script that reuses the app's SQLAlchemy models).
from app.db.session import SessionLocal  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.services.critical_alerts import scan_tenant_for_critical_alerts  # noqa: E402


def run_scan() -> int:
    """Scan every active tenant and report how many alerts were raised."""
    db = SessionLocal()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    total_created = 0
    try:
        tenants = db.query(Tenant).filter(Tenant.is_active.is_(True)).all()
        for tenant in tenants:
            created = scan_tenant_for_critical_alerts(db, tenant.id)
            if created:
                print(
                    f"[{timestamp}] tenant={tenant.name} (id={tenant.id}): "
                    f"{len(created)} alert(s) raised"
                )
            total_created += len(created)
        print(
            f"[{timestamp}] Scan complete. {len(tenants)} tenant(s) checked, "
            f"{total_created} alert(s) raised."
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(run_scan())
