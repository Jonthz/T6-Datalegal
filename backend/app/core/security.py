from datetime import datetime, timedelta, timezone
from typing import Any

import pyotp
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_MIN_LENGTH = 8


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Handle verify password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return password hash."""
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Returns (is_valid, error_message). Empty error means valid."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters long."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit."
    special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?")
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character."
    return True, ""


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_mfa_token(user_id: int) -> str:
    """Short-lived token returned before MFA verification is complete."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.MFA_TOKEN_EXPIRE_MINUTES)
    data = {
        "sub": str(user_id),
        "type": "mfa_pending",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and return payload, raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_totp_secret() -> str:
    """Handle generate totp secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, username: str, issuer: str = "DataLegal") -> str:
    """Return totp uri."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=issuer)


def verify_totp(secret: str, code: str) -> bool:
    """Handle verify totp."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
