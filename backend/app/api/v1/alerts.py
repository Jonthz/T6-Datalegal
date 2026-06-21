"""US-RF18-1: Internal alert / notification management (RF-18)."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db, require_permission
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertRead

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/unread-count")
def get_unread_count(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
) -> dict:
    """Count of unread alerts for the current user (personal + broadcasts)."""
    count = (
        db.query(Alert)
        .filter(
            Alert.tenant_id == tenant_id,
            Alert.is_read.is_(False),  # noqa: E712
            (Alert.recipient_id == current_user.id) | (Alert.recipient_id.is_(None)),  # noqa: E711
        )
        .count()
    )
    return {"unread_count": count}


@router.get("", response_model=list[AlertRead])
def list_alerts(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    is_read: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List alerts. DPO/Admin see all tenant alerts; other roles see own + broadcasts."""
    q = db.query(Alert).filter(Alert.tenant_id == tenant_id)

    if current_user.role not in ("ADMIN", "DPO", "SUPER_ADMIN"):
        # Non-privileged users: only their personal alerts and broadcasts
        q = q.filter(
            (Alert.recipient_id == current_user.id) | (Alert.recipient_id.is_(None))  # noqa: E711
        )

    if is_read is not None:
        q = q.filter(Alert.is_read == is_read)

    return q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
def create_alert(
    body: AlertCreate,
    current_user: Annotated[User, Depends(require_permission("alerts", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create an internal alert (DPO/Admin only)."""
    alert = Alert(
        tenant_id=tenant_id,
        alert_type=body.alert_type,
        title=body.title,
        message=body.message,
        severity=body.severity,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        recipient_id=body.recipient_id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    AuditLog.create_log(
        db,
        action="alert_created",
        resource="alerts",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={alert.id} type={alert.alert_type} severity={alert.severity} recipient={alert.recipient_id}",  # pylint: disable=line-too-long
    )
    return alert


@router.patch("/{alert_id}/read", response_model=AlertRead)
def mark_alert_read(
    alert_id: int,
    current_user: Annotated[User, Depends(require_permission("alerts", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Mark an alert as read (recipient or DPO/Admin)."""
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.tenant_id == tenant_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    # Only the intended recipient or privileged roles may mark as read
    if (
        alert.recipient_id is not None
        and alert.recipient_id != current_user.id
        and current_user.role not in ("ADMIN", "DPO", "SUPER_ADMIN")
    ):
        raise HTTPException(status_code=403, detail="You can only mark your own alerts as read.")

    alert.is_read = True
    alert.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    AuditLog.create_log(
        db,
        action="alert_marked_read",
        resource="alerts",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={alert_id}",
    )
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    current_user: Annotated[User, Depends(require_permission("alerts", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete an alert. Only ADMIN/DPO or the owning user may delete."""
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.tenant_id == tenant_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    if (
        current_user.role not in ("ADMIN", "DPO", "SUPER_ADMIN")
        and alert.recipient_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Permission denied to delete this alert.")

    db.delete(alert)
    db.commit()
    AuditLog.create_log(
        db,
        action="alert_deleted",
        resource="alerts",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={alert_id}",
    )
