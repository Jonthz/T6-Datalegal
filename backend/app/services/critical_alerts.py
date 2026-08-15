"""US-RF18-1: Automated internal alerts for critical, deadline-driven events.

The alert infrastructure (model, API, UI) already covers manually-created and
event-triggered alerts (e.g. TASK_ASSIGNED on ARCO creation, BREACH_REPORTED on
incidents). This module adds the missing piece: periodically scanning open
legal deadlines and raising the alert types already defined on the Alert model
(ARCO_DEADLINE_APPROACHING, ARCO_OVERDUE, AUDIT_SCHEDULED) but never emitted.

Spam control, per resource+type: while the legal deadline is still pending, the
scan keeps nudging — whether the previous alert is unread (not yet seen) or read
but unresolved (seen but not acted on) — capped at MAX_ALERTS_PER_DAY alerts per
event per calendar day (UTC). Read status does not stop the nudges; only closing
the underlying event does, since the scan looks exclusively at open (non-terminal)
requests and upcoming audit plans.

The cap is strictly per resource+type, never global, so unrelated critical events
always raise their own alerts.
"""

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.core.sla import is_approaching, is_overdue
from app.models.alert import Alert
from app.models.arco_request import ARCORequest
from app.models.audit_plan import AuditPlan

ARCO_TERMINAL_STATUSES = {"RESPONDED", "CLOSED", "REJECTED"}
AUDIT_SCHEDULED_WINDOW_DAYS = 7
# Max alerts raised per event (resource+type) per calendar day. With an hourly
# scan this insists on pending events without flooding the inbox.
MAX_ALERTS_PER_DAY = 2


def _alert_suppressed(
    db: Session,
    tenant_id: int,
    alert_type: str,
    resource_type: str,
    resource_id: int,
    now: datetime,
) -> bool:
    """Return whether a new alert for this type+resource should be suppressed.

    Suppressed only once MAX_ALERTS_PER_DAY alerts have already been raised for the
    event today. Read status is irrelevant: a pending deadline keeps nudging (up to
    the daily cap) whether or not the previous alert was read.
    """
    day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    raised_today = (
        db.query(Alert)
        .filter(
            Alert.tenant_id == tenant_id,
            Alert.alert_type == alert_type,
            Alert.resource_type == resource_type,
            Alert.resource_id == resource_id,
            Alert.created_at >= day_start,
        )
        .count()
    )
    return raised_today >= MAX_ALERTS_PER_DAY


def _scan_arco_deadlines(db: Session, tenant_id: int, today: date, now: datetime) -> list[Alert]:
    """Raise ARCO_OVERDUE and ARCO_DEADLINE_APPROACHING alerts for open requests."""
    created: list[Alert] = []
    open_requests = (
        db.query(ARCORequest)
        .filter(
            ARCORequest.tenant_id == tenant_id,
            ARCORequest.status.notin_(ARCO_TERMINAL_STATUSES),
        )
        .all()
    )

    for req in open_requests:
        if is_overdue(req.deadline_date, today):
            alert_type = "ARCO_OVERDUE"
            if _alert_suppressed(db, tenant_id, alert_type, "arco_requests", req.id, now):
                continue
            created.append(
                Alert(
                    tenant_id=tenant_id,
                    alert_type=alert_type,
                    title=f"ARCO request overdue: {req.ticket_number}",
                    message=(
                        f"The legal SLA for {req.request_type} request "
                        f"{req.ticket_number} expired on {req.deadline_date}. "
                        f"Immediate response required."
                    ),
                    severity="CRITICAL",
                    resource_type="arco_requests",
                    resource_id=req.id,
                    recipient_id=req.assigned_dpo_id,
                )
            )
        elif is_approaching(req.deadline_date, today):
            alert_type = "ARCO_DEADLINE_APPROACHING"
            if _alert_suppressed(db, tenant_id, alert_type, "arco_requests", req.id, now):
                continue
            created.append(
                Alert(
                    tenant_id=tenant_id,
                    alert_type=alert_type,
                    title=f"ARCO deadline approaching: {req.ticket_number}",
                    message=(
                        f"The legal SLA for {req.request_type} request "
                        f"{req.ticket_number} expires on {req.deadline_date}. "
                        f"Please respond before the deadline."
                    ),
                    severity="WARNING",
                    resource_type="arco_requests",
                    resource_id=req.id,
                    recipient_id=req.assigned_dpo_id,
                )
            )

    return created


def _scan_audit_plans(db: Session, tenant_id: int, today: date, now: datetime) -> list[Alert]:
    """Raise AUDIT_SCHEDULED alerts for planned audits about to start."""
    created: list[Alert] = []
    upcoming = (
        db.query(AuditPlan)
        .filter(
            AuditPlan.tenant_id == tenant_id,
            AuditPlan.status == "PLANNED",
            AuditPlan.period_start.isnot(None),
        )
        .all()
    )

    for plan in upcoming:
        if not is_approaching(plan.period_start, today, within_days=AUDIT_SCHEDULED_WINDOW_DAYS):
            continue
        if _alert_suppressed(db, tenant_id, "AUDIT_SCHEDULED", "audit_plans", plan.id, now):
            continue
        created.append(
            Alert(
                tenant_id=tenant_id,
                alert_type="AUDIT_SCHEDULED",
                title=f"Audit plan starting soon: {plan.name}",
                message=(
                    f"Audit plan '{plan.name}' is scheduled to start on "
                    f"{plan.period_start}. Confirm the auditor and scope are ready."
                ),
                severity="INFO",
                resource_type="audit_plans",
                resource_id=plan.id,
                recipient_id=plan.auditor_id,
            )
        )

    return created


def scan_tenant_for_critical_alerts(
    db: Session, tenant_id: int, today: date | None = None
) -> list[Alert]:
    """Scan a single tenant's open legal deadlines and raise missing critical alerts.

    Returns the list of newly created (and persisted) Alert rows. Safe to call
    repeatedly — an alert for the same resource+type raised within
    ALERT_COOLDOWN_HOURS is not duplicated.
    """
    now = datetime.now(timezone.utc)
    today = today or now.date()
    new_alerts = _scan_arco_deadlines(db, tenant_id, today, now) + _scan_audit_plans(
        db, tenant_id, today, now
    )
    for alert in new_alerts:
        db.add(alert)
    if new_alerts:
        db.commit()
    return new_alerts
