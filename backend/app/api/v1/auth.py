from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.mfa_crypto import decrypt_mfa_secret, encrypt_mfa_secret
from app.core.rate_limit import get_client_ip, limiter
from app.core.security import (
    create_access_token,
    create_mfa_token,
    decode_token,
    generate_totp_secret,
    get_totp_uri,
    verify_password,
    verify_totp,
)
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MFAConfirmRequest,
    MFAPendingResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str:
    """Handle get client ip."""
    return get_client_ip(request)


@router.post("/login", response_model=TokenResponse | MFAPendingResponse)
@limiter.limit(settings.AUTH_RATE_LIMIT)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle login."""
    ip = _get_client_ip(request)
    user = db.query(User).filter(User.email == payload.email).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    # Check lockout — handle both aware and naive datetimes (SQLite stores naive)
    now_utc = datetime.now(timezone.utc)
    locked_until = user.locked_until
    if locked_until is not None and locked_until.tzinfo is None:
        # SQLite returns naive datetime; treat as UTC
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until and locked_until > now_utc:
        remaining = int((locked_until - now_utc).total_seconds() // 60)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked. Try again in {remaining} minute(s).",
        )

    if not verify_password(payload.password, user.hashed_password):
        user.failed_attempts += 1
        if user.failed_attempts >= settings.MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=settings.LOCKOUT_MINUTES
            )
            user.failed_attempts = 0
        db.commit()
        AuditLog.create_log(
            db,
            action="login_failed",
            resource="auth",
            tenant_id=user.tenant_id,
            user_id=user.id,
            detail=f"Invalid password. Attempts: {user.failed_attempts}",
            ip_address=ip,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is inactive.")

    # Successful password — reset failed attempts
    user.failed_attempts = 0
    user.locked_until = None
    user.last_activity_at = now_utc
    db.commit()

    if user.mfa_enabled:
        mfa_token = create_mfa_token(user.id)
        AuditLog.create_log(
            db,
            action="login_mfa_required",
            resource="auth",
            tenant_id=user.tenant_id,
            user_id=user.id,
            ip_address=ip,
        )
        return MFAPendingResponse(mfa_required=True, mfa_token=mfa_token)

    # No MFA — issue full token
    access_token = create_access_token(
        {
            "sub": str(user.id),
            "tenant_id": user.tenant_id,
            "role": user.role,
        }
    )
    AuditLog.create_log(
        db,
        action="login_success",
        resource="auth",
        tenant_id=user.tenant_id,
        user_id=user.id,
        ip_address=ip,
    )
    return TokenResponse(access_token=access_token, role=user.role, tenant_id=user.tenant_id)


@router.post("/mfa-verify", response_model=TokenResponse)
@limiter.limit(settings.MFA_RATE_LIMIT)
def mfa_verify(
    payload: MFAVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle mfa verify."""
    ip = _get_client_ip(request)
    try:
        token_data = decode_token(payload.mfa_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired MFA token."
        )

    if token_data.get("type") != "mfa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA token type."
        )

    user_id = int(token_data["sub"])
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    secret = decrypt_mfa_secret(user.mfa_secret)
    if not secret or not verify_totp(secret, payload.code):
        AuditLog.create_log(
            db,
            action="mfa_verify_failed",
            resource="auth",
            tenant_id=user.tenant_id,
            user_id=user.id,
            ip_address=ip,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code.")

    user.last_activity_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "tenant_id": user.tenant_id,
            "role": user.role,
        }
    )
    AuditLog.create_log(
        db,
        action="login_success",
        resource="auth",
        tenant_id=user.tenant_id,
        user_id=user.id,
        detail="MFA verified",
        ip_address=ip,
    )
    return TokenResponse(access_token=access_token, role=user.role, tenant_id=user.tenant_id)


@router.post("/mfa-setup", response_model=MFASetupResponse)
def mfa_setup(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Generate a new TOTP secret for the current user."""
    if current_user.mfa_enabled and current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled for this account.",
        )

    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.email)
    # Store but do NOT enable yet — requires confirmation.
    # Secret is encrypted at rest with Fernet (see app.core.mfa_crypto).
    current_user.mfa_secret = encrypt_mfa_secret(secret)
    db.commit()
    AuditLog.create_log(
        db,
        action="mfa_setup_initiated",
        resource="auth",
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    return MFASetupResponse(secret=secret, uri=uri)


@router.post("/mfa-confirm")
def mfa_confirm(
    payload: MFAConfirmRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Confirm MFA setup by verifying a TOTP code — enables MFA."""
    secret = decrypt_mfa_secret(current_user.mfa_secret)
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="MFA setup not started."
        )
    if not verify_totp(secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code.")
    current_user.mfa_enabled = True
    db.commit()
    AuditLog.create_log(
        db,
        action="mfa_enabled",
        resource="auth",
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    return {"message": "MFA enabled successfully."}
