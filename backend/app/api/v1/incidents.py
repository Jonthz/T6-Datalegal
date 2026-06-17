"""US-RF08-1 / US-RF18-1: Incident registration, regulatory notifications, and critical alerts."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentRead])
def list_incidents(
    current_user: Annotated[User, Depends(require_permission("incidents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    q = db.query(Incident).filter(Incident.tenant_id == tenant_id)
    if current_user.role == "DEPT_HEAD" and current_user.department_id:
        q = q.filter(Incident.department_id == current_user.department_id)
    if status_filter:
        q = q.filter(Incident.status == status_filter)
    if severity:
        q = q.filter(Incident.severity == severity)
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
def create_incident(
    body: IncidentCreate,
    current_user: Annotated[User, Depends(require_permission("incidents", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    incident = Incident(
        tenant_id=tenant_id,
        reporter_id=current_user.id,
        title=body.title,
        description=body.description,
        incident_type=body.incident_type,
        severity=body.severity,
        regulatory_notification_required=body.regulatory_notification_required,
        affected_data_types=body.affected_data_types,
        department_id=body.department_id,
        assigned_to_id=body.assigned_to_id,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    AuditLog.create_log(
        db,
        action="incident_created",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident.id} type={incident.incident_type} severity={incident.severity}",
    )
    # US-RF18-1: auto-alert DPOs for HIGH/CRITICAL incidents
    if incident.severity in ("HIGH", "CRITICAL"):
        alert = Alert(
            tenant_id=tenant_id,
            alert_type="BREACH_REPORTED",
            title=f"[{incident.severity}] Incident Reported: {incident.title}",
            message=(
                f"A {incident.severity} severity incident of type '{incident.incident_type}' "
                f"has been reported. Immediate review required."
            ),
            severity="CRITICAL" if incident.severity == "CRITICAL" else "WARNING",
            resource_type="incidents",
            resource_id=incident.id,
            recipient_id=None,  # broadcast to all DPOs
        )
        db.add(alert)
        db.commit()
    return incident


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(
    incident_id: int,
    current_user: Annotated[User, Depends(require_permission("incidents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id, Incident.tenant_id == tenant_id
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if current_user.role == "DEPT_HEAD" and incident.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access restricted to your department.")
    return incident


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: int,
    body: IncidentUpdate,
    current_user: Annotated[User, Depends(require_permission("incidents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id, Incident.tenant_id == tenant_id
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(incident, field, value)

    # Auto-stamp regulatory notification time if newly flagged
    if body.regulatory_notification_required is True and incident.regulatory_notified_at is None:
        incident.regulatory_notified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)
    AuditLog.create_log(
        db,
        action="incident_updated",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident_id} status={incident.status}",
    )
    return incident


@router.post("/{incident_id}/notify", response_model=IncidentRead)
def mark_regulatory_notification(
    incident_id: int,
    current_user: Annotated[User, Depends(require_permission("incidents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Mark that regulatory authority has been notified (US-RF08-1)."""
    incident = db.query(Incident).filter(
        Incident.id == incident_id, Incident.tenant_id == tenant_id
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    incident.regulatory_notification_required = True
    incident.regulatory_notified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    AuditLog.create_log(
        db,
        action="incident_regulatory_notified",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident_id} notified_at={incident.regulatory_notified_at}",
    )
    return incident
