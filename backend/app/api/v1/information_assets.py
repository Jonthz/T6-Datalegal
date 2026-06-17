"""US-RF36-1: Technical Metadata Registration. US-RF38-1: Classification Levels."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.information_asset import InformationAsset
from app.models.user import User
from app.schemas.information_asset import (
    InformationAssetCreate,
    InformationAssetRead,
    InformationAssetUpdate,
)

router = APIRouter(prefix="/information-assets", tags=["information-assets"])


def _apply_dept_filter(q, user: User):
    """US-RF01-2: DEPT_HEAD sees only their department's assets."""
    if user.role == "DEPT_HEAD" and user.department_id is not None:
        return q.filter(InformationAsset.department_id == user.department_id)
    return q


@router.get("", response_model=list[InformationAssetRead])
def list_assets(
    current_user: Annotated[User, Depends(require_permission("information_assets", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    classification: str | None = Query(None),
    treatment_activity_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    q = db.query(InformationAsset).filter(InformationAsset.tenant_id == tenant_id)
    q = _apply_dept_filter(q, current_user)
    if classification:
        q = q.filter(InformationAsset.classification_level_code == classification)
    if treatment_activity_id:
        q = q.filter(InformationAsset.treatment_activity_id == treatment_activity_id)
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=InformationAssetRead, status_code=status.HTTP_201_CREATED)
def create_asset(
    body: InformationAssetCreate,
    current_user: Annotated[User, Depends(require_permission("information_assets", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    dept_id = body.department_id
    if current_user.role == "DEPT_HEAD":
        dept_id = current_user.department_id

    asset = InformationAsset(
        tenant_id=tenant_id,
        owner_id=current_user.id,
        department_id=dept_id,
        name=body.name,
        description=body.description,
        asset_type_code=body.asset_type_code,
        format_code=body.format_code,
        storage_medium_code=body.storage_medium_code,
        classification_level_code=body.classification_level_code,
        treatment_activity_id=body.treatment_activity_id,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    AuditLog.create_log(
        db,
        action="information_asset_created",
        resource="information_assets",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={asset.id} name={asset.name} classification={asset.classification_level_code}",
    )
    return asset


@router.get("/{asset_id}", response_model=InformationAssetRead)
def get_asset(
    asset_id: int,
    current_user: Annotated[User, Depends(require_permission("information_assets", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    asset = db.query(InformationAsset).filter(
        InformationAsset.id == asset_id, InformationAsset.tenant_id == tenant_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Information asset not found.")
    if current_user.role == "DEPT_HEAD" and asset.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access restricted to your department.")
    return asset


@router.patch("/{asset_id}", response_model=InformationAssetRead)
def update_asset(
    asset_id: int,
    body: InformationAssetUpdate,
    current_user: Annotated[User, Depends(require_permission("information_assets", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    asset = db.query(InformationAsset).filter(
        InformationAsset.id == asset_id, InformationAsset.tenant_id == tenant_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Information asset not found.")
    if current_user.role == "DEPT_HEAD" and asset.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access restricted to your department.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    AuditLog.create_log(
        db,
        action="information_asset_updated",
        resource="information_assets",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={asset_id}",
    )
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    current_user: Annotated[User, Depends(require_permission("information_assets", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    asset = db.query(InformationAsset).filter(
        InformationAsset.id == asset_id, InformationAsset.tenant_id == tenant_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Information asset not found.")
    db.delete(asset)
    db.commit()
    AuditLog.create_log(
        db,
        action="information_asset_deleted",
        resource="information_assets",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={asset_id}",
    )
