"""Tests for Cycle 6: custom roles with per-module access, and the role-permission query view."""

from fastapi.testclient import TestClient

from tests.conftest import _make_user, _token_for, auth_headers


def _create_role(client: TestClient, token: str, **overrides) -> dict:
    """Handle create role."""
    payload = {
        "name": "AUDITOR_JR",
        "description": "Junior auditor with read-only incident access",
        "permissions": [{"module": "incidents", "actions": ["r"]}],
        **overrides,
    }
    resp = client.post("/api/v1/roles", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── System role query view ───────────────────────────────────────────────────


def test_list_roles_includes_system_roles(client: TestClient, dpo_token):
    """GET /roles must include all five built-in system roles."""
    resp = client.get("/api/v1/roles", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    names = {r["name"] for r in resp.json()}
    assert {"SUPER_ADMIN", "DPO", "ADMIN", "DEPT_HEAD", "AUDITOR"} <= names


def test_get_system_role_permissions(client: TestClient, dpo_token):
    """GET /roles/{name} must return the exact static matrix for a system role."""
    resp = client.get("/api/v1/roles/AUDITOR", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_custom"] is False
    assert data["id"] is None
    modules = {p["module"]: p["actions"] for p in data["permissions"]}
    assert modules["incidents"] == ["r"]


def test_get_unknown_role_returns_404(client: TestClient, dpo_token):
    """A role that is neither a system role nor a custom role must 404."""
    resp = client.get("/api/v1/roles/NOT_A_ROLE", headers=auth_headers(dpo_token))
    assert resp.status_code == 404


# ── Custom role CRUD ──────────────────────────────────────────────────────────


def test_create_custom_role(client: TestClient, dpo_token):
    """Creating a custom role persists its per-module permissions."""
    data = _create_role(client, dpo_token)
    assert data["name"] == "AUDITOR_JR"
    assert data["is_custom"] is True
    assert data["permissions"] == [{"module": "incidents", "actions": ["r"]}]


def test_create_custom_role_appears_in_list(client: TestClient, dpo_token):
    """A newly created custom role must show up in GET /roles."""
    _create_role(client, dpo_token)
    resp = client.get("/api/v1/roles", headers=auth_headers(dpo_token))
    names = {r["name"] for r in resp.json()}
    assert "AUDITOR_JR" in names


def test_create_role_name_normalized_to_uppercase(client: TestClient, dpo_token):
    """A lowercase role name must be normalized to uppercase."""
    data = _create_role(client, dpo_token, name="reviewer")
    assert data["name"] == "REVIEWER"


def test_cannot_reuse_system_role_name(client: TestClient, dpo_token):
    """Creating a custom role named after a system role must be rejected."""
    resp = client.post(
        "/api/v1/roles",
        json={"name": "ADMIN", "permissions": []},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422


def test_duplicate_custom_role_name_rejected(client: TestClient, dpo_token):
    """Creating two custom roles with the same name in one tenant must 409."""
    _create_role(client, dpo_token)
    resp = client.post(
        "/api/v1/roles",
        json={"name": "AUDITOR_JR", "permissions": []},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 409


def test_create_role_rejects_unknown_module(client: TestClient, dpo_token):
    """A permission entry for a module that doesn't exist must be rejected."""
    resp = client.post(
        "/api/v1/roles",
        json={
            "name": "BAD_ROLE",
            "permissions": [{"module": "not_a_real_module", "actions": ["r"]}],
        },
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422


def test_create_role_rejects_unknown_action(client: TestClient, dpo_token):
    """A permission entry with an action outside c/r/u/d/export must be rejected."""
    resp = client.post(
        "/api/v1/roles",
        json={
            "name": "BAD_ROLE",
            "permissions": [{"module": "incidents", "actions": ["fly"]}],
        },
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422


def test_update_custom_role_permissions(client: TestClient, dpo_token):
    """PATCH /roles/{id} must replace the module permission set."""
    role = _create_role(client, dpo_token)
    resp = client.patch(
        f"/api/v1/roles/{role['id']}",
        json={"permissions": [{"module": "incidents", "actions": ["r", "c"]}]},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    modules = {p["module"]: p["actions"] for p in resp.json()["permissions"]}
    assert set(modules["incidents"]) == {"r", "c"}


def test_delete_custom_role(client: TestClient, dpo_token):
    """An unused custom role can be deleted."""
    role = _create_role(client, dpo_token)
    resp = client.delete(f"/api/v1/roles/{role['id']}", headers=auth_headers(dpo_token))
    assert resp.status_code == 204

    resp = client.get("/api/v1/roles", headers=auth_headers(dpo_token))
    names = {r["name"] for r in resp.json()}
    assert "AUDITOR_JR" not in names


def test_cannot_delete_role_in_use(client: TestClient, dpo_token, session, tenant_a):
    """Deleting a custom role still assigned to a user must be refused."""
    role = _create_role(client, dpo_token)
    _make_user(session, tenant_id=tenant_a.id, email="junior@test.com", role=role["name"])
    session.commit()

    resp = client.delete(f"/api/v1/roles/{role['id']}", headers=auth_headers(dpo_token))
    assert resp.status_code == 409


def test_tenant_isolation_for_custom_roles(client: TestClient, dpo_token, tenant_b_token):
    """A custom role created in tenant A must not be visible from tenant B."""
    _create_role(client, dpo_token)
    resp = client.get("/api/v1/roles", headers=auth_headers(tenant_b_token))
    names = {r["name"] for r in resp.json()}
    assert "AUDITOR_JR" not in names


# ── RBAC on the roles endpoints themselves ───────────────────────────────────


def test_auditor_can_read_roles_but_not_create(client: TestClient, auditor_token):
    """AUDITOR has read-only access to the permissions module."""
    resp = client.get("/api/v1/roles", headers=auth_headers(auditor_token))
    assert resp.status_code == 200

    resp2 = client.post(
        "/api/v1/roles",
        json={"name": "SHOULD_FAIL", "permissions": []},
        headers=auth_headers(auditor_token),
    )
    assert resp2.status_code == 403


# ── End-to-end: a user assigned to a custom role is actually gated by it ─────


def test_user_with_custom_role_is_granted_configured_access(
    client: TestClient, dpo_token, session, tenant_a
):
    """A user assigned to a custom role can perform only the actions it grants."""
    role = _create_role(client, dpo_token, permissions=[{"module": "incidents", "actions": ["r"]}])
    custom_user = _make_user(
        session, tenant_id=tenant_a.id, email="customrole@test.com", role=role["name"]
    )
    session.commit()
    custom_token = _token_for(custom_user)

    read_resp = client.get("/api/v1/incidents", headers=auth_headers(custom_token))
    assert read_resp.status_code == 200

    create_resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "x",
            "description": "y",
            "incident_type": "OTHER",
            "severity": "LOW",
        },
        headers=auth_headers(custom_token),
    )
    assert create_resp.status_code == 403


def test_user_creation_rejects_unknown_role(client: TestClient, admin_token):
    """Assigning a user to a role that doesn't exist (system or custom) must 400."""
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "ghostrole@test.com",
            "password": "Valid@Pass1!",
            "full_name": "Ghost Role",
            "role": "GHOST_ROLE",
        },
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 400


def test_user_can_be_created_with_existing_custom_role(client: TestClient, dpo_token, admin_token):
    """Assigning a user to a real, existing custom role must succeed."""
    role = _create_role(client, dpo_token)
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "withcustomrole@test.com",
            "password": "Valid@Pass1!",
            "full_name": "With Custom Role",
            "role": role["name"],
        },
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == role["name"]
