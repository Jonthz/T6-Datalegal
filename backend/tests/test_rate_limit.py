"""Sprint 6: IP-based rate limiting on /auth/login and /auth/mfa-verify (H-2)."""

from app.core.config import settings


def _parse_limit(spec: str) -> int:
    """'20/minute' -> 20."""
    return int(spec.split("/", 1)[0])


class TestLoginRateLimit:
    """TestLoginRateLimit schema/model definition."""
    def test_login_returns_429_after_threshold(self, client, tenant_a, session):
        """The 21st login from the same IP within a minute is rejected with 429."""
        from tests.conftest import _make_user

        _make_user(session, tenant_id=tenant_a.id, email="rl@test.com", role="AUDITOR")
        threshold = _parse_limit(settings.AUTH_RATE_LIMIT)

        # Send `threshold` *valid* attempts first. We use the wrong password to
        # avoid touching the lockout path (5 failures locks the account at 423).
        # To stay below lockout we rotate emails.
        emails = []
        for i in range(threshold):
            email = f"rl_user_{i}@test.com"
            emails.append(email)
            _make_user(session, tenant_id=tenant_a.id, email=email, role="AUDITOR")
            resp = client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": "Test@1234!"},
            )
            assert resp.status_code == 200, f"attempt {i+1} unexpectedly rejected"

        # threshold+1: should be 429 from slowapi.
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": emails[0], "password": "Test@1234!"},
        )
        assert resp.status_code == 429, resp.text
        assert "Too many requests" in resp.json()["detail"]
        assert resp.headers.get("Retry-After") == "60"


class TestMFAVerifyRateLimit:
    """TestMFAVerifyRateLimit schema/model definition."""
    def test_mfa_verify_returns_429_after_threshold(self, client):
        """mfa-verify is bucketed independently of login but uses same limit."""
        threshold = _parse_limit(settings.MFA_RATE_LIMIT)
        # All requests use a bogus token; each gets 401 — that's fine, the
        # slowapi limiter still counts them.
        for i in range(threshold):
            resp = client.post(
                "/api/v1/auth/mfa-verify",
                json={"mfa_token": "bogus", "code": "000000"},
            )
            assert resp.status_code == 401, f"attempt {i+1} unexpected: {resp.status_code}"

        resp = client.post(
            "/api/v1/auth/mfa-verify",
            json={"mfa_token": "bogus", "code": "000000"},
        )
        assert resp.status_code == 429
        assert resp.headers.get("Retry-After") == "60"


class TestRateLimitReset:
    """TestRateLimitReset schema/model definition."""
    def test_counters_isolated_between_tests(self, client):
        """Sanity check: the autouse `_reset_rate_limiter` fixture works."""
        from app.core.rate_limit import limiter

        limiter.reset()
        # Burn a handful of requests, the next test should still start at zero
        # because of the autouse fixture between tests.
        for _ in range(3):
            client.post(
                "/api/v1/auth/login",
                json={"email": "nobody@test.com", "password": "Wrong@1234!"},
            )
