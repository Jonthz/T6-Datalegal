"""Tests for authentication: login, MFA, lockout, password validation."""

from fastapi.testclient import TestClient

from app.core.security import generate_totp_secret
from tests.conftest import _make_user, auth_headers


class TestLogin:
    """TestLogin schema/model definition."""

    def test_login_success(self, client: TestClient, tenant_a, session):
        """Test that login success behaves as expected."""
        _make_user(session, tenant_id=tenant_a.id, email="loginok@test.com", role="ADMIN")
        resp = client.post(
            "/api/v1/auth/login", json={"email": "loginok@test.com", "password": "Test@1234!"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["role"] == "ADMIN"
        assert data["tenant_id"] == tenant_a.id
        assert data["account_scope"] == "TENANT"
        assert data["platform_permissions"] == []

    def test_platform_login_includes_scope_and_permissions(
        self, client: TestClient, platform_owner
    ):
        """Platform auth response exposes platform scope and explicit permissions."""
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": platform_owner.email, "password": "Test@1234!"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["account_scope"] == "PLATFORM"
        assert {"tenants:read", "tenants:provision"} <= set(data["platform_permissions"])

    def test_login_wrong_password(self, client: TestClient, tenant_a, session):
        """Test that login wrong password behaves as expected."""
        _make_user(session, tenant_id=tenant_a.id, email="wrongpw@test.com", role="AUDITOR")
        resp = client.post(
            "/api/v1/auth/login", json={"email": "wrongpw@test.com", "password": "WrongPass!1"}
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Test that login nonexistent user behaves as expected."""
        resp = client.post(
            "/api/v1/auth/login", json={"email": "nobody@test.com", "password": "Any@1234!"}
        )
        assert resp.status_code == 401

    def test_account_lockout_after_5_failures(self, client: TestClient, tenant_a, session):
        """After 5 failed attempts account is locked (423)."""
        _make_user(session, tenant_id=tenant_a.id, email="lockme@test.com", role="AUDITOR")
        for _ in range(5):
            resp = client.post(
                "/api/v1/auth/login", json={"email": "lockme@test.com", "password": "BadPass!1"}
            )

        # 6th attempt — should be locked
        resp = client.post(
            "/api/v1/auth/login", json={"email": "lockme@test.com", "password": "Test@1234!"}
        )
        assert resp.status_code == 423

    def test_mfa_required_response(self, client: TestClient, tenant_a, session):
        """User with MFA enabled gets mfa_required response."""
        user = _make_user(session, tenant_id=tenant_a.id, email="mfa_user@test.com", role="ADMIN")
        user.mfa_secret = generate_totp_secret()
        user.mfa_enabled = True
        session.flush()

        resp = client.post(
            "/api/v1/auth/login", json={"email": "mfa_user@test.com", "password": "Test@1234!"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mfa_required"] is True
        assert "mfa_token" in data


class TestMFAVerify:
    """TestMFAVerify schema/model definition."""

    def test_mfa_verify_success(self, client: TestClient, tenant_a, session):
        """Test that mfa verify success behaves as expected."""
        import pyotp

        user = _make_user(session, tenant_id=tenant_a.id, email="mfa_verify@test.com", role="ADMIN")
        secret = generate_totp_secret()
        user.mfa_secret = secret
        user.mfa_enabled = True
        session.flush()

        # Get mfa_token via login
        resp = client.post(
            "/api/v1/auth/login", json={"email": "mfa_verify@test.com", "password": "Test@1234!"}
        )
        mfa_token = resp.json()["mfa_token"]

        # Verify with correct TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()
        resp2 = client.post("/api/v1/auth/mfa-verify", json={"mfa_token": mfa_token, "code": code})
        assert resp2.status_code == 200
        assert "access_token" in resp2.json()

    def test_mfa_verify_wrong_code(self, client: TestClient, tenant_a, session):
        """Test that mfa verify wrong code behaves as expected."""
        user = _make_user(session, tenant_id=tenant_a.id, email="mfa_wrong@test.com", role="ADMIN")
        secret = generate_totp_secret()
        user.mfa_secret = secret
        user.mfa_enabled = True
        session.flush()

        resp = client.post(
            "/api/v1/auth/login", json={"email": "mfa_wrong@test.com", "password": "Test@1234!"}
        )
        mfa_token = resp.json()["mfa_token"]

        resp2 = client.post(
            "/api/v1/auth/mfa-verify", json={"mfa_token": mfa_token, "code": "000000"}
        )
        assert resp2.status_code == 401

    def test_mfa_verify_invalid_mfa_token(self, client: TestClient):
        """Test that mfa verify invalid mfa token behaves as expected."""
        resp = client.post(
            "/api/v1/auth/mfa-verify", json={"mfa_token": "invalid.token.here", "code": "123456"}
        )
        assert resp.status_code == 401


class TestMFASetup:
    """TestMFASetup schema/model definition."""

    def test_mfa_setup_returns_secret_and_uri(self, client: TestClient, admin_token):
        """Test that mfa setup returns secret and uri behaves as expected."""
        resp = client.post("/api/v1/auth/mfa-setup", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "secret" in data
        assert "uri" in data
        assert "otpauth://" in data["uri"]

    def test_mfa_setup_does_not_overwrite_enabled_secret(
        self, client: TestClient, admin_token, admin_user, session
    ):
        """Enabled MFA cannot be overwritten by opening setup again."""
        original_secret = "JBSWY3DPEHPK3PXP"
        admin_user.mfa_secret = original_secret
        admin_user.mfa_enabled = True
        session.flush()

        resp = client.post("/api/v1/auth/mfa-setup", headers=auth_headers(admin_token))

        assert resp.status_code == 400
        session.refresh(admin_user)
        assert admin_user.mfa_secret == original_secret


class TestPasswordValidation:
    """TestPasswordValidation schema/model definition."""

    def test_create_user_weak_password(self, client: TestClient, admin_token, tenant_a):  # pylint: disable=unused-argument
        """Test that create user weak password behaves as expected."""
        resp = client.post(
            "/api/v1/users",
            json={
                "email": "weak@test.com",
                "password": "short",
                "full_name": "Weak User",
                "role": "AUDITOR",
            },
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 422

    def test_create_user_no_uppercase(self, client: TestClient, admin_token, tenant_a):  # pylint: disable=unused-argument
        """Test that create user no uppercase behaves as expected."""
        resp = client.post(
            "/api/v1/users",
            json={
                "email": "noup@test.com",
                "password": "lowercase1!",
                "full_name": "No Upper",
                "role": "AUDITOR",
            },
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 422

    def test_create_user_no_symbol(self, client: TestClient, admin_token, tenant_a):  # pylint: disable=unused-argument
        """Test that create user no symbol behaves as expected."""
        resp = client.post(
            "/api/v1/users",
            json={
                "email": "nosym@test.com",
                "password": "NoSymbol123",
                "full_name": "No Symbol",
                "role": "AUDITOR",
            },
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 422
