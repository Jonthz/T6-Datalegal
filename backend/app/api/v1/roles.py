"""Cycle 6: Custom roles with per-module access, and a role-permission query view."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.core.permissions import PERMISSIONS, SYSTEM_ROLES
from app.models.audit_log import AuditLog
from app.models.role import Role, RolePermission
from app.models.user import User
from app.schemas.role import RoleCreate, RolePermissionRead, RoleRead, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


def _system_role_read(role_name: str) -> RoleRead:
    """Build a RoleRead for a built-in system role from the static PERMISSIONS matrix."""
    matrix = PERMISSIONS[role_name]
    return RoleRead(
        id=None,
        name=role_name,
        description=f"Built-in system role ({role_name}).",
        is_custom=False,
        permissions=[
            RolePermissionRead(module=module, actions=actions)
            for module, actions in sorted(matrix.items())
        ],
    )


def _custom_role_read(role: Role) -> RoleRead:
    """Build a RoleRead for a tenant-defined custom role."""
    return RoleRead(
        id=role.id,
        name=role.name,
        description=role.description,
        is_custom=True,
        permissions=[
            RolePermissionRead(module=p.module, actions=p.actions)
            for p in sorted(role.permissions, key=lambda p: p.module)
        ],
    )


@router.get("", response_model=list[RoleRead])
def list_roles(
    _: Annotated[User, Depends(require_permission("permissions", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List every role available to the tenant: built-in system roles + custom roles."""
    custom_roles = db.query(Role).filter(Role.tenant_id == tenant_id).order_by(Role.name).all()
    return [_system_role_read(name) for name in sorted(SYSTEM_ROLES)] + [
        _custom_role_read(r) for r in custom_roles
    ]


@router.get("/{role_name}", response_model=RoleRead)
def get_role(
    role_name: str,
    _: Annotated[User, Depends(require_permission("permissions", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return the permission matrix for a single role (US-RF: role-permission query view)."""
    role_name = role_name.strip().upper()
    if role_name in SYSTEM_ROLES:
        return _system_role_read(role_name)

    role = db.query(Role).filter(Role.tenant_id == tenant_id, Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found.")
    return _custom_role_read(role)


@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role(
    body: RoleCreate,
    current_user: Annotated[User, Depends(require_permission("permissions", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a custom role with configurable, per-module access."""
    existing = db.query(Role).filter(Role.tenant_id == tenant_id, Role.name == body.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A custom role named '{body.name}' already exists.",
        )

    role = Role(tenant_id=tenant_id, name=body.name, description=body.description)
    role.permissions = [
        RolePermission(tenant_id=tenant_id, module=p.module, actions=p.actions)
        for p in body.permissions
    ]
    db.add(role)
    db.commit()
    db.refresh(role)
    AuditLog.create_log(
        db,
        action="role_created",
        resource="permissions",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"name={role.name} modules={[p.module for p in body.permissions]}",
    )
    return _custom_role_read(role)


@router.patch("/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    body: RoleUpdate,
    current_user: Annotated[User, Depends(require_permission("permissions", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update a custom role's description and/or module permissions.

    Built-in system roles have no numeric id and cannot be edited through this
    endpoint — their permission matrix is fixed in code.
    """
    role = db.query(Role).filter(Role.id == role_id, Role.tenant_id == tenant_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Custom role not found.")

    if body.description is not None:
        role.description = body.description
    if body.permissions is not None:
        for p in list(role.permissions):
            db.delete(p)
        db.flush()
        role.permissions = [
            RolePermission(tenant_id=tenant_id, module=p.module, actions=p.actions)
            for p in body.permissions
        ]

    db.commit()
    db.refresh(role)
    AuditLog.create_log(
        db,
        action="role_updated",
        resource="permissions",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={role.id} name={role.name}",
    )
    return _custom_role_read(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    current_user: Annotated[User, Depends(require_permission("permissions", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete a custom role. Refused while any user is still assigned to it."""
    role = db.query(Role).filter(Role.id == role_id, Role.tenant_id == tenant_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Custom role not found.")

    in_use = (
        db.query(User).filter(User.tenant_id == tenant_id, User.role == role.name).first()
        is not None
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{role.name}' is still assigned to at least one user.",
        )

    db.delete(role)
    db.commit()
    AuditLog.create_log(
        db,
        action="role_deleted",
        resource="permissions",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={role_id} name={role.name}",
    )
