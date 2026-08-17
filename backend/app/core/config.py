"""Application configuration.

`ENVIRONMENT` drives the security posture:

- `development` / `test`: relaxed — missing `SECRET_KEY` falls back to a clearly
  unsafe placeholder, missing `MFA_ENCRYPTION_KEY` is auto-generated per-process,
  CORS allows `*` (no credentials), API docs are exposed at `/api/docs`.
- `production`: strict — `SECRET_KEY`, `MFA_ENCRYPTION_KEY` and `CORS_ORIGINS`
  must come from the environment. Validation runs at import time and fails fast
  via `RuntimeError`.

Tests assume `development` defaults; pass `ENVIRONMENT=production` plus the
required vars to exercise the hardened path.
"""

from __future__ import annotations

import secrets

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET_PLACEHOLDER = "dev-secret-key-change-in-production-please"


class Settings(BaseSettings):
    """Settings schema/model definition."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./datalegal.db"

    # Crypto / auth — required in production, defaulted in dev/test.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    MFA_TOKEN_EXPIRE_MINUTES: int = 5
    MAX_FAILED_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    # MFA secret at-rest encryption key (Fernet, urlsafe-base64 32 bytes).
    MFA_ENCRYPTION_KEY: str = ""

    # CORS: explicit allow-list in prod, "*" in dev/test if blank.
    CORS_ORIGINS: str = ""

    # Trusted proxy CIDRs for honoring X-Forwarded-For (audit IP).
    # Comma-separated list, empty means trust only direct client.
    TRUSTED_PROXIES: str = ""

    # Auth rate limiting (per IP). Counts include both successful and failed
    # attempts so honest users with a typo still get a reasonable runway.
    AUTH_RATE_LIMIT: str = "20/minute"
    MFA_RATE_LIMIT: str = "20/minute"

    # API docs exposure. Default ON for dev/test, OFF for prod.
    SHOW_DOCS: bool = True

    @field_validator("ENVIRONMENT")
    @classmethod
    def _normalize_env(cls, v: str) -> str:
        """Handle normalize env."""
        return v.strip().lower() or "development"

    @model_validator(mode="after")
    def _apply_env_policy(self) -> "Settings":
        """Handle apply env policy."""
        is_prod = self.ENVIRONMENT == "production"

        if is_prod:
            errors: list[str] = []
            if not self.SECRET_KEY or self.SECRET_KEY == DEV_SECRET_PLACEHOLDER:
                errors.append("SECRET_KEY must be set to a strong random value in production.")
            elif len(self.SECRET_KEY) < 32:
                errors.append("SECRET_KEY must be at least 32 characters in production.")
            if not self.MFA_ENCRYPTION_KEY:
                errors.append(
                    "MFA_ENCRYPTION_KEY must be set in production "
                    "(generate via `python -c 'from cryptography.fernet import Fernet; "
                    "print(Fernet.generate_key().decode())'`)."
                )
            if not self.CORS_ORIGINS.strip():
                errors.append(
                    "CORS_ORIGINS must be an explicit comma-separated list in production "
                    "(e.g. 'https://app.example.com')."
                )
            if errors:
                joined = "\n  - ".join(errors)
                raise RuntimeError(
                    "Refusing to start in production with insecure configuration:\n  - " + joined
                )
            # In production, never expose docs unless operator opts in.
            # (`SHOW_DOCS=true` in env still wins explicitly.)
        else:
            # Dev/test: fall back to a clearly-unsafe placeholder if nothing set.
            if not self.SECRET_KEY:
                object.__setattr__(self, "SECRET_KEY", DEV_SECRET_PLACEHOLDER)
            if not self.MFA_ENCRYPTION_KEY:
                # Lazy import — keep config import cheap on environments that
                # don't have cryptography installed (shouldn't happen, but
                # makes failure modes legible).
                from cryptography.fernet import Fernet

                object.__setattr__(self, "MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())

        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Parsed CORS_ORIGINS as a list. Empty in dev means `*`."""
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return []
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def trusted_proxies_list(self) -> list[str]:
        """Handle trusted proxies list."""
        raw = (self.TRUSTED_PROXIES or "").strip()
        if not raw:
            return []
        return [p.strip() for p in raw.split(",") if p.strip()]


settings = Settings()


def generate_secret_key() -> str:
    """Helper for tooling: produce a strong SECRET_KEY suitable for env files."""
    return secrets.token_urlsafe(48)
