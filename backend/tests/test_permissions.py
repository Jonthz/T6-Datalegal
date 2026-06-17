"""Tests for RBAC: role-based access control enforcement."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


class TestRBACPermissions:
    def test_auditor_cannot_create_user(self, client: TestClient, auditor_token):
        resp = client.post(
            "/api/v1/users",
            json={"email": "hacked@test.com", "password": "Valid@Pass1!", "full_name": "Hacker", "role": "ADMIN"},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 403

    def test_dept_head_cannot_access_audit(self, client: TestClient, dept_head_token):
        resp = client.get("/api/v1/audit", headers=auth_headers(dept_head_token))
        assert resp.status_code == 403

    def test_auditor_can_read_audit(self, client: TestClient, auditor_token):
        resp = client.get("/api/v1/audit", headers=auth_headers(auditor_token))
        assert resp.status_code == 200

    def test_auditor_can_export_audit(self, client: TestClient, auditor_token):
        resp = client.get("/api/v1/audit/export", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    def test_dept_head_can_read_users(self, client: TestClient, dept_head_token):
        resp = client.get("/api/v1/users", headers=auth_headers(dept_head_token))
        assert resp.status_code == 200

    def test_dept_head_cannot_delete_users(self, client: TestClient, dept_head_token, admin_user):
        resp = client.delete(f"/api/v1/users/{admin_user.id}", headers=auth_headers(dept_head_token))
        assert resp.status_code == 403

    def test_admin_can_create_user(self, client: TestClient, admin_token):
        resp = client.post(
            "/api/v1/users",
            json={"email": "by_admin@test.com", "password": "Valid@Pass1!", "full_name": "By Admin", "role": "AUDITOR"},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 201

    def test_unauthenticated_request_rejected(self, client: TestClient):
        resp = client.get("/api/v1/users")
        assert resp.status_code in (401, 403)  # No credentials → 401 Unauthorized

    def test_auditor_cannot_create_department(self, client: TestClient, auditor_token):
        resp = client.post(
            "/api/v1/departments",
            json={"name": "Hacked Department"},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 403

    def test_dpo_can_create_department(self, client: TestClient, dpo_token):
        resp = client.post(
            "/api/v1/departments",
            json={"name": "Legal Dept"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201

    def test_permission_failure_is_logged(self, client: TestClient, auditor_token, session):
        from app.models.audit_log import AuditLog
        initial_count = session.query(AuditLog).filter(AuditLog.action == "permission_check_fail").count()

        client.post(
            "/api/v1/users",
            json={"email": "fail@test.com", "password": "Valid@Pass1!", "full_name": "Fail", "role": "AUDITOR"},
            headers=auth_headers(auditor_token),
        )
        final_count = session.query(AuditLog).filter(AuditLog.action == "permission_check_fail").count()
        assert final_count > initial_count
