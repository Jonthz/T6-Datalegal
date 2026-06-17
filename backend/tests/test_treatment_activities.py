"""Tests for US-RF35-1: Data Ingestion via Questionnaire (treatment activities)."""


from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def _create_activity(client: TestClient, token: str, **overrides) -> dict:
    payload = {
        "name": "Customer Data Processing",
        "purpose": "Manage customer accounts",
        "legal_basis": "CONTRACT",
        "personal_data_types": ["NAME", "EMAIL"],
        "data_subjects": ["CUSTOMERS"],
        "retention_period_days": 730,
        "is_cross_border": False,
        "destination_countries": [],
        "status": "DRAFT",
        **overrides,
    }
    resp = client.post("/api/v1/treatment-activities", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── CRUD ──────────────────────────────────────────────────────────────────────

def test_create_treatment_activity(client, dpo_token):
    data = _create_activity(client, dpo_token)
    assert data["name"] == "Customer Data Processing"
    assert data["legal_basis"] == "CONTRACT"
    assert data["personal_data_types"] == ["NAME", "EMAIL"]
    assert data["status"] == "DRAFT"


def test_list_treatment_activities(client, dpo_token):
    _create_activity(client, dpo_token, name="Activity A")
    _create_activity(client, dpo_token, name="Activity B")
    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    names = [a["name"] for a in resp.json()]
    assert "Activity A" in names
    assert "Activity B" in names


def test_get_single_activity(client, dpo_token):
    created = _create_activity(client, dpo_token)
    resp = client.get(f"/api/v1/treatment-activities/{created['id']}", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_update_activity_status(client, dpo_token):
    created = _create_activity(client, dpo_token)
    resp = client.patch(
        f"/api/v1/treatment-activities/{created['id']}",
        json={"status": "ACTIVE"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACTIVE"


def test_archive_activity(client, dpo_token):
    created = _create_activity(client, dpo_token)
    resp = client.delete(
        f"/api/v1/treatment-activities/{created['id']}",
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 204
    # Verify archived
    resp = client.get(
        f"/api/v1/treatment-activities/{created['id']}",
        headers=auth_headers(dpo_token),
    )
    assert resp.json()["status"] == "ARCHIVED"


def test_cross_border_activity(client, dpo_token):
    data = _create_activity(
        client,
        dpo_token,
        is_cross_border=True,
        destination_countries=["US", "DE"],
    )
    assert data["is_cross_border"] is True
    assert "US" in data["destination_countries"]


# ── Tenant isolation ─────────────────────────────────────────────────────────

def test_tenant_isolation(client, dpo_token, tenant_b_token):
    created = _create_activity(client, dpo_token, name="Tenant A activity")
    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(tenant_b_token))
    assert resp.status_code == 200
    ids = [a["id"] for a in resp.json()]
    assert created["id"] not in ids


# ── US-RF01-2: Department isolation ──────────────────────────────────────────

def test_dept_head_sees_only_own_department(client, session, dept_head_user, dept_head_token, dpo_token, tenant_a):
    from app.models.department import Department

    dept_a = Department(tenant_id=tenant_a.id, name="Department A")
    dept_b = Department(tenant_id=tenant_a.id, name="Department B")
    session.add_all([dept_a, dept_b])
    session.flush()

    dept_head_user.department_id = dept_a.id
    session.flush()

    _create_activity(client, dpo_token, name="Dept A activity", department_id=dept_a.id)
    _create_activity(client, dpo_token, name="Dept B activity", department_id=dept_b.id)

    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(dept_head_token))
    assert resp.status_code == 200
    names = [a["name"] for a in resp.json()]
    assert "Dept A activity" in names
    assert "Dept B activity" not in names


# ── RBAC ─────────────────────────────────────────────────────────────────────

def test_auditor_can_read_but_not_create(client, auditor_token):
    resp = client.post(
        "/api/v1/treatment-activities",
        json={"name": "X", "purpose": "Y", "legal_basis": "Z"},
        headers=auth_headers(auditor_token),
    )
    assert resp.status_code == 403


def test_auditor_can_list(client, dpo_token, auditor_token):
    _create_activity(client, dpo_token)
    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(auditor_token))
    assert resp.status_code == 200


def test_not_found_returns_404(client, dpo_token):
    resp = client.get("/api/v1/treatment-activities/99999", headers=auth_headers(dpo_token))
    assert resp.status_code == 404
