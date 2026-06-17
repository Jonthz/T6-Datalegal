import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.portability import PortabilityRequest
from app.models.user import User
from app.schemas.portability import (
    PortabilityExport,
    PortabilityRequestCreate,
    PortabilityRequestRead,
    PortabilityRequestUpdate,
)

router = APIRouter(prefix="/portability", tags=["portability"])

VALID_STATUSES = {"PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"}


@router.get("", response_model=list[PortabilityRequestRead])
def list_portability_requests(
    _: Annotated[User, Depends(require_permission("portability", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    q = db.query(PortabilityRequest).filter(PortabilityRequest.tenant_id == tenant_id)
    if status:
        q = q.filter(PortabilityRequest.status == status)
    return q.order_by(PortabilityRequest.request_date.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=PortabilityRequestRead, status_code=status.HTTP_201_CREATED)
def create_portability_request(
    body: PortabilityRequestCreate,
    current_user: Annotated[User, Depends(require_permission("portability", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    req = PortabilityRequest(
        tenant_id=tenant_id,
        subject_name=body.subject_name,
        subject_email=body.subject_email,
        request_date=datetime.now(timezone.utc),
        status="PENDING",
        notes=body.notes,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    AuditLog.create_log(
        db,
        action="portability_request_created",
        resource="portability",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Request id={req.id} for {req.subject_email}",
    )
    return req


@router.get("/{request_id}", response_model=PortabilityRequestRead)
def get_portability_request(
    request_id: int,
    _: Annotated[User, Depends(require_permission("portability", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    req = db.query(PortabilityRequest).filter(
        PortabilityRequest.id == request_id, PortabilityRequest.tenant_id == tenant_id
    ).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portability request not found.")
    return req


@router.put("/{request_id}/complete", response_model=PortabilityRequestRead)
def complete_portability_request(
    request_id: int,
    body: PortabilityRequestUpdate,
    current_user: Annotated[User, Depends(require_permission("portability", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    req = db.query(PortabilityRequest).filter(
        PortabilityRequest.id == request_id, PortabilityRequest.tenant_id == tenant_id
    ).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portability request not found.")

    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {sorted(VALID_STATUSES)}",
        )

    if body.status:
        req.status = body.status
    if body.notes is not None:
        req.notes = body.notes
    if body.response_data is not None:
        req.response_data = json.dumps(body.response_data)

    if body.status == "COMPLETED":
        req.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(req)
    AuditLog.create_log(
        db,
        action="portability_request_updated",
        resource="portability",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Request id={req.id} status={req.status}",
    )
    return req


@router.get("/{request_id}/export", response_model=PortabilityExport)
def export_portability_request(
    request_id: int,
    _: Annotated[User, Depends(require_permission("portability", "export"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    req = db.query(PortabilityRequest).filter(
        PortabilityRequest.id == request_id, PortabilityRequest.tenant_id == tenant_id
    ).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portability request not found.")

    response_data = {}
    if req.response_data:
        try:
            response_data = json.loads(req.response_data)
        except json.JSONDecodeError:
            response_data = {"raw": req.response_data}

    return PortabilityExport(
        request_id=req.id,
        subject={"name": req.subject_name, "email": req.subject_email},
        data=response_data,
        format="JSON",
        standard="RFC8259",
        generated_at=datetime.now(timezone.utc),
    )
