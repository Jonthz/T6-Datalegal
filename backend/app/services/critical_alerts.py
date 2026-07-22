"""US-RF18-1: Automated internal alerts for critical, deadline-driven events.

The alert infrastructure (model, API, UI) already covers manually-created and
event-triggered alerts (e.g. TASK_ASSIGNED on ARCO creation, BREACH_REPORTED on
incidents). This module adds the missing piece: periodically scanning open
legal deadlines and raising the alert types already defined on the Alert model
(ARCO_DEADLINE_APPROACHING, ARCO_OVERDUE, AUDIT_SCHEDULED) but never emitted.

Idempotent by design: each scan checks for an existing unread alert of the same
type tied to the same resource before creating a new one, so running the scan
repeatedly (e.g. via cron) does not spam duplicate alerts.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.core.sla import is_approaching, is_overdue
from app.models.alert import Alert
from app.models.arco_request import ARCORequest
from app.models.audit_plan import AuditPlan

ARCO_TERMINAL_STATUSES = {"RESPONDED", "CLOSED", "REJECTED"}
AUDIT_SCHEDULED_WINDOW_DAYS = 7


def _alert_already_raised(db: Session, tenant_id: int, alert_type: str, resource_id: int) -> bool:
    """Return whether an unread alert of this type already exists for the resource."""
    return (
        db.query(Alert)
        .filter(
            Alert.tenant_id == tenant_id,
            Alert.alert_type == alert_type,
            Alert.resource_type == "arco_requests",
            Alert.resource_id == resource_id,
            Alert.is_read.is_(False),
        )
        .first()
        is not None
    )


def _scan_arco_deadlines(db: Session, tenant_id: int, today: date) -> list[Alert]:
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
            if _alert_already_raised(db, tenant_id, alert_type, req.id):
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
            if _alert_already_raised(db, tenant_id, alert_type, req.id):
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


def _scan_audit_plans(db: Session, tenant_id: int, today: date) -> list[Alert]:
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
        already_raised = (
            db.query(Alert)
            .filter(
                Alert.tenant_id == tenant_id,
                Alert.alert_type == "AUDIT_SCHEDULED",
                Alert.resource_type == "audit_plans",
                Alert.resource_id == plan.id,
                Alert.is_read.is_(False),
            )
            .first()
            is not None
        )
        if already_raised:
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
    repeatedly — already-raised, unread alerts for the same resource are not
    duplicated.
    """
    today = today or date.today()
    new_alerts = _scan_arco_deadlines(db, tenant_id, today) + _scan_audit_plans(
        db, tenant_id, today
    )
    for alert in new_alerts:
        db.add(alert)
    if new_alerts:
        db.commit()
    return new_alerts
