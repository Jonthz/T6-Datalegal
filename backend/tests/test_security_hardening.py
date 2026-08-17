"""Sprint 6: security headers, docs guard, production config validation."""

import importlib
import os

import pytest

from app.core.config import DEV_SECRET_PLACEHOLDER, Settings


class TestSecurityHeaders:
    """TestSecurityHeaders schema/model definition."""

    def test_security_headers_present_on_api(self, client):
        """Test that security headers present on api behaves as expected."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.headers["X-Content-Type-Options"] == "nosniff"
        assert resp.headers["X-Frame-Options"] == "DENY"
        assert resp.headers["Referrer-Policy"] == "no-referrer"
        assert "Permissions-Policy" in resp.headers
        assert "Content-Security-Policy" in resp.headers
        # Default API endpoints get the strict CSP.
        assert "default-src 'none'" in resp.headers["Content-Security-Policy"]

    def test_no_hsts_in_dev(self, client):
        """Test that no hsts in dev behaves as expected."""
        resp = client.get("/health")
        # HSTS only emitted in production.
        assert "Strict-Transport-Security" not in resp.headers


class TestProductionConfigValidation:
    """Production env must reject insecure defaults; dev must keep working."""

    def test_dev_settings_default_to_placeholder(self):
        """Test that dev settings default to placeholder behaves as expected."""
        s = Settings(_env_file=None)
        assert s.ENVIRONMENT == "development"
        assert s.SECRET_KEY == DEV_SECRET_PLACEHOLDER
        # Ephemeral fernet key generated.
        assert s.MFA_ENCRYPTION_KEY

    def test_production_missing_secrets_raises(self):
        """Test that production missing secrets raises behaves as expected."""
        with pytest.raises(RuntimeError) as exc:
            Settings(_env_file=None, ENVIRONMENT="production")
        msg = str(exc.value)
        assert "SECRET_KEY" in msg
        assert "MFA_ENCRYPTION_KEY" in msg
        assert "CORS_ORIGINS" in msg

    def test_production_with_weak_secret_rejected(self):
        """Test that production with weak secret rejected behaves as expected."""
        with pytest.raises(RuntimeError) as exc:
            Settings(
                _env_file=None,
                ENVIRONMENT="production",
                SECRET_KEY="short",
                MFA_ENCRYPTION_KEY="x" * 44,
                CORS_ORIGINS="https://app.example.com",
            )
        assert "at least 32" in str(exc.value)

    def test_production_with_strong_secrets_accepted(self):
        """Test that production with strong secrets accepted behaves as expected."""
        from cryptography.fernet import Fernet

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="a" * 48,
            MFA_ENCRYPTION_KEY=Fernet.generate_key().decode(),
            CORS_ORIGINS="https://app.example.com,https://admin.example.com",
        )
        assert s.cors_origins_list == [
            "https://app.example.com",
            "https://admin.example.com",
        ]

    def test_dev_env_normalization(self):
        """Test that dev env normalization behaves as expected."""
        s = Settings(_env_file=None, ENVIRONMENT="  Development  ")
        assert s.ENVIRONMENT == "development"


class TestDocsGuard:
    """TestDocsGuard schema/model definition."""

    def test_docs_exposed_in_dev(self, client):
        # Default ENVIRONMENT=development -> docs on.
        """Test that docs exposed in dev behaves as expected."""
        assert client.get("/api/docs").status_code == 200
        assert client.get("/api/openapi.json").status_code == 200

    def test_docs_hidden_when_show_docs_false(self, monkeypatch):
        """Test that docs hidden when show docs false behaves as expected."""
        from cryptography.fernet import Fernet

        # Re-import app with SHOW_DOCS off and prod env to verify docs go dark.
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("SHOW_DOCS", "false")
        monkeypatch.setenv("SECRET_KEY", "z" * 48)
        monkeypatch.setenv("MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())
        monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")

        # Force a clean re-import of the settings + main module.
        for mod in ("app.main", "app.core.config", "app.api.v1.router"):
            if mod in list(importlib.sys.modules):
                del importlib.sys.modules[mod]

        try:
            from fastapi.testclient import TestClient

            import app.main as fresh_main

            tc = TestClient(fresh_main.app)
            assert tc.get("/api/docs").status_code == 404
            assert tc.get("/api/openapi.json").status_code == 404
        finally:
            # Restore the default settings module for subsequent tests.
            for mod in ("app.main", "app.core.config", "app.api.v1.router"):
                if mod in list(importlib.sys.modules):
                    del importlib.sys.modules[mod]
            for var in (
                "ENVIRONMENT",
                "SHOW_DOCS",
                "SECRET_KEY",
                "MFA_ENCRYPTION_KEY",
                "CORS_ORIGINS",
            ):
                os.environ.pop(var, None)
            # Force reload of the original test-time module graph.
            import app.main  # noqa: F401
