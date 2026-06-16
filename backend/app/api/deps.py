from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import has_permission
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


INACTIVITY_TIMEOUT_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_type = payload.get("type")
    if token_type == "mfa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA verification required.",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    #server-side inactivity check
    now = datetime.now(timezone.utc)
    if user.last_activity_at is not None:
        last = user.last_activity_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if now - last > timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired due to inactivity. Please log in again.",
            )

    # Refresh last_activity_at on every authenticated request
    user.last_activity_at = now
    db.commit()

    return user


def get_current_tenant_id(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int | None = Query(None, description="Override tenant (SUPER_ADMIN only)"),
) -> int:
    """Returns tenant_id from JWT, or override if SUPER_ADMIN."""
    if tenant_id is not None:
        if current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only SUPER_ADMIN can specify a tenant_id query param.",
            )
        return tenant_id
    return current_user.tenant_id


def require_super_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can access this endpoint.",
        )
    return current_user


def require_permission(module: str, action: str):
    """FastAPI dependency factory that enforces RBAC. Logs failures."""

    def _checker(
        current_user: Annotated[User, Depends(get_current_user)],
        db: Session = Depends(get_db),
    ) -> User:
        if not has_permission(current_user.role, module, action):
            from app.models.audit_log import AuditLog

            AuditLog.create_log(
                db,
                action="permission_check_fail",
                resource=module,
                tenant_id=current_user.tenant_id,
                user_id=current_user.id,
                detail=f"role={current_user.role} action={action}",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: role '{current_user.role}' cannot perform '{action}' on '{module}'.",
            )
        return current_user

    return _checker


def require_department_scope(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """US-RF01-2: Ensures DEPT_HEAD has a department assigned before accessing scoped resources."""
    if current_user.role == "DEPT_HEAD" and current_user.department_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DEPT_HEAD must be assigned to a department to access this resource.",
        )
    return current_user
