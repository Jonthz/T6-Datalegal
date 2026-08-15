"""Unit tests for at-rest MFA secret encryption (Sprint 6, H-1)."""

import pyotp

from app.core.mfa_crypto import (
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    is_legacy_plaintext,
)


class TestMfaCryptoRoundTrip:
    """TestMfaCryptoRoundTrip schema/model definition."""

    def test_encrypt_then_decrypt_returns_original(self):
        """Test that encrypt then decrypt returns original behaves as expected."""
        secret = pyotp.random_base32()
        token = encrypt_mfa_secret(secret)
        assert token != secret
        assert token.startswith("gAAAA")
        assert decrypt_mfa_secret(token) == secret

    def test_encrypt_is_non_deterministic(self):
        """Test that encrypt is non deterministic behaves as expected."""
        secret = pyotp.random_base32()
        a = encrypt_mfa_secret(secret)
        b = encrypt_mfa_secret(secret)
        assert a != b, "Fernet must include a fresh IV per encryption"
        assert decrypt_mfa_secret(a) == decrypt_mfa_secret(b) == secret

    def test_legacy_plaintext_pass_through(self):
        """Test that legacy plaintext pass through behaves as expected."""
        legacy = pyotp.random_base32()
        assert is_legacy_plaintext(legacy)
        assert decrypt_mfa_secret(legacy) == legacy

    def test_none_round_trip(self):
        """Test that none round trip behaves as expected."""
        assert decrypt_mfa_secret(None) is None
        assert encrypt_mfa_secret("") == ""
        assert is_legacy_plaintext(None) is False


class TestMfaCryptoIntegrationWithLogin:
    """Encrypted secrets must work end-to-end through the MFA verify flow."""

    def test_verify_with_encrypted_secret(self, client, tenant_a, session):
        """Test that verify with encrypted secret behaves as expected."""
        from tests.conftest import _make_user

        secret = pyotp.random_base32()
        user = _make_user(
            session,
            tenant_id=tenant_a.id,
            email="mfa_enc@test.com",
            role="ADMIN",
        )
        user.mfa_secret = encrypt_mfa_secret(secret)
        user.mfa_enabled = True
        session.flush()

        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "mfa_enc@test.com", "password": "Test@1234!"},
        )
        assert resp.status_code == 200
        mfa_token = resp.json()["mfa_token"]

        code = pyotp.TOTP(secret).now()
        resp2 = client.post(
            "/api/v1/auth/mfa-verify",
            json={"mfa_token": mfa_token, "code": code},
        )
        assert resp2.status_code == 200, resp2.text
        assert "access_token" in resp2.json()

    def test_mfa_setup_persists_encrypted_secret(self, client, admin_token, session, admin_user):
        """Test that mfa setup persists encrypted secret behaves as expected."""
        from tests.conftest import auth_headers

        resp = client.post("/api/v1/auth/mfa-setup", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        # API still surfaces the plaintext base32 secret to the user (it has to,
        # the authenticator app needs it), but the row in the DB is encrypted.
        plain = resp.json()["secret"]
        session.refresh(admin_user)
        stored = admin_user.mfa_secret
        assert stored is not None
        assert stored != plain
        assert stored.startswith("gAAAA")
        assert decrypt_mfa_secret(stored) == plain
