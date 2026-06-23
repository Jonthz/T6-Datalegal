import csv
import io
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.portability import AuditLogRead

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    _: Annotated[User, Depends(require_permission("audit", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    action: str | None = Query(None, description="Filter by action"),
    user_id: int | None = Query(None, description="Filter by user_id"),
    from_date: datetime | None = Query(None, description="Filter from date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="Filter to date (ISO 8601)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """List audit logs."""
    q = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if from_date:
        q = q.filter(AuditLog.created_at >= from_date)
    if to_date:
        q = q.filter(AuditLog.created_at <= to_date)
    return q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/export")
def export_audit_csv(
    _: Annotated[User, Depends(require_permission("audit", "export"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    action: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
):
    """Handle export audit csv."""
    q = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if from_date:
        q = q.filter(AuditLog.created_at >= from_date)
    if to_date:
        q = q.filter(AuditLog.created_at <= to_date)
    logs = q.order_by(AuditLog.created_at.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["id", "tenant_id", "user_id", "action", "resource", "detail", "ip_address", "created_at"]
    )
    for log in logs:
        writer.writerow(
            [
                log.id,
                log.tenant_id,
                log.user_id,
                log.action,
                log.resource,
                log.detail,
                log.ip_address,
                log.created_at.isoformat() if log.created_at else "",
            ]
        )

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )
