"""US-RF03-1: Company profile and DPO setup for the current tenant."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.models.audit_log import AuditLog
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantProfileUpdate, TenantRead

router = APIRouter(prefix="/company-profile", tags=["company-profile"])


@router.get("", response_model=TenantRead)
def get_company_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return the current tenant's company profile including DPO info."""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    return tenant


@router.put("", response_model=TenantRead)
def update_company_profile(
    body: TenantProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update company profile. Only DPO or SUPER_ADMIN may update."""
    if current_user.role not in ("DPO", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only DPO or SUPER_ADMIN can update the company profile.",
        )
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)

    AuditLog.create_log(
        db,
        action="company_profile_updated",
        resource="company_profile",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Updated by {current_user.role}",
    )
    return tenant
