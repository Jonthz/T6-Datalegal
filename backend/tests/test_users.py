"""Tests for user CRUD, roles, department assignment."""

from fastapi.testclient import TestClient

from tests.conftest import _make_user, auth_headers


class TestUserCRUD:
    def test_create_user_success(self, client: TestClient, admin_token, tenant_a):
        resp = client.post(
            "/api/v1/users",
            json={
                "email": "newuser@test.com",
                "password": "Valid@Pass1!",
                "full_name": "New User",
                "role": "AUDITOR",
            },
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@test.com"
        assert data["role"] == "AUDITOR"
        assert data["tenant_id"] == tenant_a.id

    def test_create_user_duplicate_email(self, client: TestClient, admin_token, tenant_a, session):
        _make_user(session, tenant_id=tenant_a.id, email="dup@test.com", role="AUDITOR")
        resp = client.post(
            "/api/v1/users",
            json={"email": "dup@test.com", "password": "Valid@Pass1!", "full_name": "Dup", "role": "AUDITOR"},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 409

    def test_list_users(self, client: TestClient, admin_token, tenant_a, session):
        _make_user(session, tenant_id=tenant_a.id, email="listed1@test.com", role="AUDITOR")
        resp = client.get("/api/v1/users", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_get_user(self, client: TestClient, admin_token, tenant_a, session):
        u = _make_user(session, tenant_id=tenant_a.id, email="getuser@test.com", role="AUDITOR")
        resp = client.get(f"/api/v1/users/{u.id}", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        assert resp.json()["email"] == "getuser@test.com"

    def test_update_user(self, client: TestClient, admin_token, tenant_a, session):
        u = _make_user(session, tenant_id=tenant_a.id, email="update@test.com", role="AUDITOR")
        resp = client.put(
            f"/api/v1/users/{u.id}",
            json={"full_name": "Updated Name"},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_delete_user(self, client: TestClient, admin_token, tenant_a, session):
        u = _make_user(session, tenant_id=tenant_a.id, email="delete@test.com", role="AUDITOR")
        resp = client.delete(f"/api/v1/users/{u.id}", headers=auth_headers(admin_token))
        assert resp.status_code == 204

    def test_get_nonexistent_user(self, client: TestClient, admin_token):
        resp = client.get("/api/v1/users/99999", headers=auth_headers(admin_token))
        assert resp.status_code == 404

    def test_create_invalid_role(self, client: TestClient, admin_token):
        resp = client.post(
            "/api/v1/users",
            json={"email": "badrole@test.com", "password": "Valid@Pass1!", "full_name": "Bad Role", "role": "GOD"},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 422

    def test_create_user_with_department(self, client: TestClient, admin_token, tenant_a, session):
        from app.models.department import Department
        dept = Department(tenant_id=tenant_a.id, name="Engineering")
        session.add(dept)
        session.flush()

        resp = client.post(
            "/api/v1/users",
            json={
                "email": "deptuser@test.com",
                "password": "Valid@Pass1!",
                "full_name": "Dept User",
                "role": "DEPT_HEAD",
                "department_id": dept.id,
            },
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 201
        assert resp.json()["department_id"] == dept.id
