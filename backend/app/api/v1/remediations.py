"""US-RF12-1: Remediations with risk impact tracking."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.remediation import Remediation
from app.models.risk_assessment import RiskAssessment
from app.models.user import User
from app.schemas.remediation import RemediationCreate, RemediationRead, RemediationUpdate

router = APIRouter(prefix="/remediations", tags=["remediations"])


@router.post("", response_model=RemediationRead, status_code=status.HTTP_201_CREATED)
def create_remediation(
    body: RemediationCreate,
    current_user: Annotated[User, Depends(require_permission("remediations", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create remediation."""
    ra = (
        db.query(RiskAssessment)
        .filter(
            RiskAssessment.id == body.risk_assessment_id,
            RiskAssessment.tenant_id == tenant_id,
        )
        .first()
    )
    if not ra:
        raise HTTPException(status_code=404, detail="Risk assessment not found.")

    remediation = Remediation(
        tenant_id=tenant_id,
        risk_assessment_id=body.risk_assessment_id,
        title=body.title,
        description=body.description,
        responsible_id=body.responsible_id,
        due_date=body.due_date,
        # Snapshot current risk score for impact comparison (RF-12)
        risk_score_before=ra.risk_score,
        risk_level_before=ra.risk_level,
        created_by_id=current_user.id,
    )
    db.add(remediation)
    db.commit()
    db.refresh(remediation)
    AuditLog.create_log(
        db,
        action="remediation_created",
        resource="remediations",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={remediation.id} ra_id={body.risk_assessment_id} risk_before={ra.risk_score}",
    )
    return remediation


@router.get("", response_model=list[RemediationRead])
def list_remediations(
    current_user: Annotated[User, Depends(require_permission("remediations", "r"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    risk_assessment_id: int | None = Query(None),
    remediation_status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List remediations."""
    q = db.query(Remediation).filter(Remediation.tenant_id == tenant_id)
    if risk_assessment_id:
        q = q.filter(Remediation.risk_assessment_id == risk_assessment_id)
    if remediation_status:
        q = q.filter(Remediation.status == remediation_status)
    return q.order_by(Remediation.id.desc()).offset(skip).limit(limit).all()


@router.get("/{remediation_id}", response_model=RemediationRead)
def get_remediation(
    remediation_id: int,
    current_user: Annotated[User, Depends(require_permission("remediations", "r"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return remediation."""
    rem = (
        db.query(Remediation)
        .filter(Remediation.id == remediation_id, Remediation.tenant_id == tenant_id)
        .first()
    )
    if not rem:
        raise HTTPException(status_code=404, detail="Remediation not found.")
    return rem


@router.patch("/{remediation_id}", response_model=RemediationRead)
def update_remediation(
    remediation_id: int,
    body: RemediationUpdate,
    current_user: Annotated[User, Depends(require_permission("remediations", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update remediation."""
    rem = (
        db.query(Remediation)
        .filter(Remediation.id == remediation_id, Remediation.tenant_id == tenant_id)
        .first()
    )
    if not rem:
        raise HTTPException(status_code=404, detail="Remediation not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(rem, field, value)
    db.commit()
    db.refresh(rem)
    AuditLog.create_log(
        db,
        action="remediation_updated",
        resource="remediations",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={remediation_id} status={rem.status}",
    )
    return rem
