"""IP-based rate limiting for sensitive auth endpoints.

slowapi is configured with an in-memory store; for multi-process deploys swap
for Redis via `SLOWAPI_STORAGE_URI`. The key function honors `X-Forwarded-For`
only when the immediate client lives in `settings.TRUSTED_PROXIES`, which
prevents trivial header spoofing on direct-access deployments.
"""

from __future__ import annotations

import ipaddress

from fastapi import HTTPException, Request, status
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from app.core.config import settings


def get_client_ip(request: Request) -> str:
    """Resolve the caller's IP. Honors XFF only behind a trusted proxy."""
    immediate = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if not forwarded:
        return immediate

    trusted = settings.trusted_proxies_list
    if not trusted:
        return immediate

    try:
        client_addr = ipaddress.ip_address(immediate)
    except ValueError:
        return immediate

    for cidr in trusted:
        try:
            if client_addr in ipaddress.ip_network(cidr, strict=False):
                return forwarded.split(",")[0].strip()
        except ValueError:
            continue
    return immediate


limiter = Limiter(key_func=get_client_ip, default_limits=[])


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Translate slowapi's RateLimitExceeded into a clean HTTPException."""
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many requests. Limit: {exc.detail}.",
        headers={"Retry-After": "60"},
    )


def reset_limiter() -> None:
    """Drop all rate-limit counters. Test-only helper."""
    limiter.reset()
