"""Tests for audit log: append-only, CSV export, query filters."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from tests.conftest import auth_headers


class TestAuditLog:
    def test_audit_log_created_on_login(self, client: TestClient, tenant_a, session):
        from tests.conftest import _make_user
        _make_user(session, tenant_id=tenant_a.id, email="loginaudit@test.com", role="ADMIN")

        initial = session.query(AuditLog).count()
        client.post("/api/v1/auth/login", json={"email": "loginaudit@test.com", "password": "Test@1234!"})
        final = session.query(AuditLog).count()
        assert final > initial

    def test_audit_log_has_no_update_method(self):
        """Verify AuditLog has no update() method — append-only by design."""
        assert not hasattr(AuditLog, "update"), "AuditLog must not have an update() method"

    def test_audit_log_has_no_delete_method(self):
        """Verify AuditLog has no delete() method — append-only by design."""
        assert not hasattr(AuditLog, "delete"), "AuditLog must not have a delete() method"

    def test_create_log_classmethod(self, session: Session, tenant_a):
        count_before = session.query(AuditLog).count()
        AuditLog.create_log(
            session,
            action="test_action",
            resource="test",
            tenant_id=tenant_a.id,
            user_id=None,
            detail="unit test entry",
        )
        count_after = session.query(AuditLog).count()
        assert count_after == count_before + 1

    def test_list_audit_logs_as_auditor(self, client: TestClient, auditor_token):
        resp = client.get("/api/v1/audit", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_audit_filter_by_action(self, client: TestClient, auditor_token, tenant_a, session):
        AuditLog.create_log(session, action="unique_test_action", resource="test", tenant_id=tenant_a.id)
        resp = client.get("/api/v1/audit?action=unique_test_action", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["action"] == "unique_test_action" for r in results)

    def test_csv_export_format(self, client: TestClient, auditor_token):
        resp = client.get("/api/v1/audit/export", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        content = resp.text
        # CSV must have header row
        assert "id,tenant_id,user_id,action" in content

    def test_audit_filter_by_user(self, client: TestClient, auditor_token, tenant_a, session, auditor_user):
        AuditLog.create_log(
            session,
            action="user_specific_action",
            resource="test",
            tenant_id=tenant_a.id,
            user_id=auditor_user.id,
        )
        resp = client.get(
            f"/api/v1/audit?user_id={auditor_user.id}",
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["user_id"] == auditor_user.id for r in results)

    def test_non_auditor_cannot_export(self, client: TestClient, dept_head_token):
        resp = client.get("/api/v1/audit/export", headers=auth_headers(dept_head_token))
        assert resp.status_code == 403
