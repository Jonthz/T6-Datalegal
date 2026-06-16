"""At-rest encryption for ``User.mfa_secret``.

The stored value is a Fernet ciphertext encoded as urlsafe-base64. We keep the
column type unchanged (`VARCHAR(255)`) because Fernet tokens are well under that
length and we want migrations to be a no-op for existing schemas.

A legacy plaintext TOTP secret is pyotp's base32 alphabet (A-Z + 2-7), typically
32 characters, no leading 'gAAAA'. We detect Fernet by its constant version
prefix (`b"\\x80"` decoded as 'gAAAAA...') so existing rows are read
transparently on first decrypt and re-saved encrypted whenever they are
modified.
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

_FERNET_PREFIX = "gAAAA"  # version byte 0x80, urlsafe-base64 -> "gAAAAA..."


def _get_fernet() -> Fernet:
    key = settings.MFA_ENCRYPTION_KEY
    if not key:
        # _apply_env_policy guarantees this is set in dev/test (auto-generated)
        # and required in production. Defensive raise in case Settings is
        # bypassed (e.g. monkeypatched in a misbehaving test).
        raise RuntimeError("MFA_ENCRYPTION_KEY is not configured.")
    return Fernet(key.encode())


def encrypt_mfa_secret(plaintext: str) -> str:
    """Encrypt a base32 TOTP secret for storage."""
    if not plaintext:
        return plaintext
    token = _get_fernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_mfa_secret(stored: str | None) -> str | None:
    """Decrypt a stored MFA secret. Returns legacy plaintext rows unchanged."""
    if stored is None:
        return None
    if not stored.startswith(_FERNET_PREFIX):
        # Legacy plaintext row written before encryption was introduced.
        return stored
    try:
        return _get_fernet().decrypt(stored.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError(
            "Failed to decrypt MFA secret. Check MFA_ENCRYPTION_KEY rotation."
        ) from exc


def is_legacy_plaintext(stored: str | None) -> bool:
    """Test-helper: True if the stored value was written before encryption."""
    return bool(stored) and not stored.startswith(_FERNET_PREFIX)
