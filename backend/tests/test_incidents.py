"""Tests for US-RF08-1: Incident registration and regulatory notifications."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def _create_incident(client: TestClient, token: str, **overrides) -> dict:
    payload = {
        "title": "Data breach in HR system",
        "description": "Unauthorized access to HR records detected.",
        "incident_type": "DATA_BREACH",
        "severity": "HIGH",
        "regulatory_notification_required": False,
        "affected_data_types": "NAME,EMAIL,SALARY",
        **overrides,
    }
    resp = client.post("/api/v1/incidents", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── CRUD ──────────────────────────────────────────────────────────────────────

def test_create_incident(client, dpo_token):
    data = _create_incident(client, dpo_token)
    assert data["title"] == "Data breach in HR system"
    assert data["incident_type"] == "DATA_BREACH"
    assert data["severity"] == "HIGH"
    assert data["status"] == "OPEN"


def test_list_incidents(client, dpo_token):
    _create_incident(client, dpo_token, title="Incident 1")
    _create_incident(client, dpo_token, title="Incident 2")
    resp = client.get("/api/v1/incidents", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    titles = [i["title"] for i in resp.json()]
    assert "Incident 1" in titles
    assert "Incident 2" in titles


def test_get_incident(client, dpo_token):
    created = _create_incident(client, dpo_token)
    resp = client.get(f"/api/v1/incidents/{created['id']}", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_update_incident_status(client, dpo_token):
    created = _create_incident(client, dpo_token)
    resp = client.patch(
        f"/api/v1/incidents/{created['id']}",
        json={"status": "INVESTIGATING"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "INVESTIGATING"


def test_filter_by_status(client, dpo_token):
    _create_incident(client, dpo_token, title="Open Inc")
    resp = client.get("/api/v1/incidents?status=OPEN", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    for inc in resp.json():
        assert inc["status"] == "OPEN"


def test_filter_by_severity(client, dpo_token):
    _create_incident(client, dpo_token, severity="CRITICAL", title="Critical one")
    resp = client.get("/api/v1/incidents?severity=CRITICAL", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert any(i["severity"] == "CRITICAL" for i in resp.json())


# ── US-RF08-1: Regulatory notification ───────────────────────────────────────

def test_mark_regulatory_notification(client, dpo_token):
    created = _create_incident(client, dpo_token, regulatory_notification_required=False)
    assert created["regulatory_notified_at"] is None

    resp = client.post(
        f"/api/v1/incidents/{created['id']}/notify",
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["regulatory_notification_required"] is True
    assert data["regulatory_notified_at"] is not None


def test_create_incident_with_regulatory_flag(client, dpo_token):
    data = _create_incident(client, dpo_token, regulatory_notification_required=True)
    assert data["regulatory_notification_required"] is True


# ── Tenant isolation ─────────────────────────────────────────────────────────

def test_tenant_isolation(client, dpo_token, tenant_b_token):
    created = _create_incident(client, dpo_token, title="Tenant A incident")
    resp = client.get("/api/v1/incidents", headers=auth_headers(tenant_b_token))
    ids = [i["id"] for i in resp.json()]
    assert created["id"] not in ids


# ── RBAC ─────────────────────────────────────────────────────────────────────

def test_auditor_can_list_not_create(client, dpo_token, auditor_token):
    _create_incident(client, dpo_token)
    resp = client.get("/api/v1/incidents", headers=auth_headers(auditor_token))
    assert resp.status_code == 200

    resp2 = client.post(
        "/api/v1/incidents",
        json={"title": "x", "description": "y", "incident_type": "OTHER", "severity": "LOW"},
        headers=auth_headers(auditor_token),
    )
    assert resp2.status_code == 403


def test_not_found_returns_404(client, dpo_token):
    resp = client.get("/api/v1/incidents/99999", headers=auth_headers(dpo_token))
    assert resp.status_code == 404
