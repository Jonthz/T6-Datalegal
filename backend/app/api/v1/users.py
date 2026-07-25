from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.core.permissions import SYSTEM_ROLES
from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _validate_role(db: Session, tenant_id: int, role: str) -> None:
    """Reject a role that is neither a system role nor an existing custom role."""
    if role in SYSTEM_ROLES:
        return
    exists = (
        db.query(Role).filter(Role.tenant_id == tenant_id, Role.name == role).first() is not None
    )
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role '{role}'. Must be a system role or an existing custom role.",
        )


@router.get("", response_model=list[UserRead])
def list_users(
    _: Annotated[User, Depends(require_permission("users", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List users."""
    users = db.query(User).filter(User.tenant_id == tenant_id).offset(skip).limit(limit).all()
    return users


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    current_user: Annotated[User, Depends(require_permission("users", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create user."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered."
        )
    _validate_role(db, tenant_id, body.role)

    user = User(
        tenant_id=tenant_id,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        full_name=body.full_name,
        role=body.role,
        department_id=body.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    AuditLog.create_log(
        db,
        action="user_create",
        resource="users",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Created user id={user.id} email={user.email}",
    )
    return user


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    current_user: Annotated[User, Depends(require_permission("users", "r"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return user."""
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: Annotated[User, Depends(require_permission("users", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update user."""
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if body.role is not None:
        _validate_role(db, tenant_id, body.role)

    update_data = body.model_dump(exclude_none=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    AuditLog.create_log(
        db,
        action="user_update",
        resource="users",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Updated user id={user.id}",
    )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(require_permission("users", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete user."""
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    db.delete(user)
    db.commit()
    AuditLog.create_log(
        db,
        action="user_delete",
        resource="users",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Deleted user id={user_id}",
    )
