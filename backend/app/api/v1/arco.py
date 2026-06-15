"""US-RF30-1 / US-RF07-1: Centralized ARCO rights request management with legal SLA tracking."""

from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.alert import Alert
from app.models.arco_request import ARCORequest
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.arco import ARCORequestCreate, ARCORequestRead, ARCORequestUpdate

router = APIRouter(prefix="/arco-requests", tags=["arco"])


def _generate_ticket(tenant_id: int, db: Session) -> str:
    count = db.query(ARCORequest).filter(ARCORequest.tenant_id == tenant_id).count()
    year = datetime.now(timezone.utc).year
    return f"ARCO-{year}-{str(count + 1).zfill(5)}"


@router.get("/dashboard")
def get_arco_dashboard(
    current_user: Annotated[User, Depends(require_permission("arco", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Dashboard summary: totals, by type, by status, overdue count."""
    requests = db.query(ARCORequest).filter(ARCORequest.tenant_id == tenant_id).all()
    today = date.today()
    terminal = {"RESPONDED", "CLOSED", "REJECTED"}

    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    overdue = 0

    for r in requests:
        by_type[r.request_type] = by_type.get(r.request_type, 0) + 1
        by_status[r.status] = by_status.get(r.status, 0) + 1
        if r.deadline_date < today and r.status not in terminal:
            overdue += 1

    return {
        "total": len(requests),
        "by_type": by_type,
        "by_status": by_status,
        "overdue_count": overdue,
    }


@router.post("", response_model=ARCORequestRead, status_code=status.HTTP_201_CREATED)
def create_arco_request(
    body: ARCORequestCreate,
    current_user: Annotated[User, Depends(require_permission("arco", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    if body.request_type not in ("ACCESS", "RECTIFICATION", "CANCELLATION", "OPPOSITION"):
        raise HTTPException(status_code=400, detail="Invalid request_type.")
    today = date.today()
    request = ARCORequest(
        tenant_id=tenant_id,
        ticket_number=_generate_ticket(tenant_id, db),
        request_type=body.request_type,
        requester_name=body.requester_name,
        requester_email=body.requester_email,
        requester_id_number=body.requester_id_number,
        description=body.description,
        received_date=today,
        deadline_date=today + timedelta(days=30),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    AuditLog.create_log(
        db, action="arco_request_created", resource="arco",
        tenant_id=tenant_id, user_id=current_user.id,
        detail=f"ticket={request.ticket_number} type={request.request_type}",
    )
    # US-RF07-1: notify DPO within ≤1 min of ticket creation (in-app alert)
    alert = Alert(
        tenant_id=tenant_id,
        alert_type="TASK_ASSIGNED",
        title=f"New ARCO Request: {request.ticket_number}",
        message=(
            f"A new {request.request_type} request has been received. "
            f"Deadline: {request.deadline_date}. Please assign and begin identity verification."
        ),
        severity="WARNING",
        resource_type="arco_requests",
        resource_id=request.id,
        recipient_id=None,  # broadcast to all DPOs in tenant
    )
    db.add(alert)
    db.commit()
    return request


@router.get("", response_model=list[ARCORequestRead])
def list_arco_requests(
    current_user: Annotated[User, Depends(require_permission("arco", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    request_type: str | None = Query(None),
    request_status: str | None = Query(None, alias="status"),
):
    q = db.query(ARCORequest).filter(ARCORequest.tenant_id == tenant_id)
    if request_type:
        q = q.filter(ARCORequest.request_type == request_type)
    if request_status:
        q = q.filter(ARCORequest.status == request_status)
    return q.order_by(ARCORequest.id.desc()).all()


@router.get("/{request_id}", response_model=ARCORequestRead)
def get_arco_request(
    request_id: int,
    current_user: Annotated[User, Depends(require_permission("arco", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    req = db.query(ARCORequest).filter(
        ARCORequest.id == request_id, ARCORequest.tenant_id == tenant_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="ARCO request not found.")
    return req


@router.patch("/{request_id}", response_model=ARCORequestRead)
def update_arco_request(
    request_id: int,
    body: ARCORequestUpdate,
    current_user: Annotated[User, Depends(require_permission("arco", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    req = db.query(ARCORequest).filter(
        ARCORequest.id == request_id, ARCORequest.tenant_id == tenant_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="ARCO request not found.")

    if body.status is not None:
        req.status = body.status
        if body.status == "RESPONDED" and req.responded_at is None:
            req.responded_at = datetime.now(timezone.utc)
    if body.assigned_dpo_id is not None:
        req.assigned_dpo_id = body.assigned_dpo_id
    if body.response_text is not None:
        req.response_text = body.response_text
    if body.rejection_reason is not None:
        req.rejection_reason = body.rejection_reason

    db.commit()
    db.refresh(req)
    AuditLog.create_log(
        db, action="arco_request_updated", resource="arco",
        tenant_id=tenant_id, user_id=current_user.id,
        detail=f"id={request_id} status={req.status}",
    )
    return req


@router.get("/{request_id}/sla-status")
def get_sla_status(
    request_id: int,
    current_user: Annotated[User, Depends(require_permission("arco", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
) -> dict:
    """SLA stoplight for an ARCO request (US-RF07-1).

    Returns a stoplight color: GREEN (>7 days left), YELLOW (1-7 days), RED (overdue).
    """
    req = db.query(ARCORequest).filter(
        ARCORequest.id == request_id, ARCORequest.tenant_id == tenant_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="ARCO request not found.")

    terminal = {"RESPONDED", "CLOSED", "REJECTED"}
    if req.status in terminal:
        on_time = req.responded_at is not None and req.responded_at.date() <= req.deadline_date
        return {
            "ticket_number": req.ticket_number,
            "status": req.status,
            "stoplight": "GREY",
            "on_time": on_time,
            "days_remaining": None,
            "deadline_date": str(req.deadline_date),
        }

    today = date.today()
    days_remaining = (req.deadline_date - today).days
    if days_remaining > 7:
        stoplight = "GREEN"
    elif days_remaining >= 1:
        stoplight = "YELLOW"
    else:
        stoplight = "RED"

    return {
        "ticket_number": req.ticket_number,
        "status": req.status,
        "stoplight": stoplight,
        "on_time": None,
        "days_remaining": days_remaining,
        "deadline_date": str(req.deadline_date),
    }
