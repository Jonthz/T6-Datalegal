from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_super_admin
from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantProvision, TenantRead
from app.schemas.user import UserRead

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("", response_model=list[TenantRead])
def list_tenants(
    _: Annotated[User, Depends(require_super_admin)],
    db: Session = Depends(get_db),
):
    return db.query(Tenant).all()


@router.get("/{tenant_id}", response_model=TenantRead)
def get_tenant(
    tenant_id: int,
    _: Annotated[User, Depends(require_super_admin)],
    db: Session = Depends(get_db),
):
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found.")
    return tenant


@router.post("/provision", status_code=status.HTTP_201_CREATED)
def provision_tenant(
    body: TenantProvision,
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Session = Depends(get_db),
):
    """SUPER_ADMIN provisions a new tenant + its first DPO/ADMIN account."""
    existing = db.query(Tenant).filter(Tenant.ruc == body.tenant.ruc).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A tenant with this RUC already exists.",
        )

    # Validate admin role
    if body.admin_user.role not in ("DPO", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="First user for a tenant must have role DPO or ADMIN.",
        )

    # Create tenant
    tenant = Tenant(
        name=body.tenant.name,
        ruc=body.tenant.ruc,
        country=body.tenant.country,
        sector=body.tenant.sector,
    )
    db.add(tenant)
    db.flush()  # get tenant.id

    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == body.admin_user.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    # Create first admin user
    admin = User(
        tenant_id=tenant.id,
        email=body.admin_user.email,
        hashed_password=get_password_hash(body.admin_user.password),
        full_name=body.admin_user.full_name,
        role=body.admin_user.role,
    )
    db.add(admin)
    db.commit()
    db.refresh(tenant)
    db.refresh(admin)

    AuditLog.create_log(
        db,
        action="tenant_provisioned",
        resource="tenants",
        tenant_id=tenant.id,
        user_id=current_user.id,
        detail=f"Provisioned tenant id={tenant.id} name={tenant.name} ruc={tenant.ruc}",
    )

    return {
        "tenant": TenantRead.model_validate(tenant),
        "admin_user": UserRead.model_validate(admin),
    }
