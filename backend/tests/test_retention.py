"""Tests for RF-11 / US-RF29-1: Retention policies and expired data alerts."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def _create_policy(client: TestClient, token: str, **overrides) -> dict:
    """Handle create policy."""
    payload = {
        "name": "Customer Data Policy",
        "data_category": "CUSTOMER",
        "retention_days": 730,
        "action_on_expiry": "REVIEW",
        "legal_basis": "Art. 11 LOPDP",
        **overrides,
    }
    resp = client.post("/api/v1/retention/policies", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_asset(client: TestClient, token: str) -> dict:
    """Handle create asset."""
    resp = client.post(
        "/api/v1/information-assets",
        json={
            "name": "Test Asset",
            "asset_type_code": "SOFTWARE",
            "format_code": "DATABASE",
            "storage_medium_code": "DIGITAL",
            "classification_level_code": "PUBLICA_CLASIFICADA",
        },
        headers=auth_headers(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_record(
    client: TestClient, token: str, asset_id: int, expiry: date, **overrides
) -> dict:
    """Handle create record."""
    payload = {
        "information_asset_id": asset_id,
        "expiry_date": expiry.isoformat(),
        **overrides,
    }
    resp = client.post("/api/v1/retention/records", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Policies ─────────────────────────────────────────────────────────────────


def test_create_retention_policy(client, dpo_token):
    """Test that create retention policy behaves as expected."""
    data = _create_policy(client, dpo_token)
    assert data["name"] == "Customer Data Policy"
    assert data["retention_days"] == 730
    assert data["action_on_expiry"] == "REVIEW"
    assert data["is_active"] is True


def test_list_policies(client, dpo_token):
    """Test that list policies behaves as expected."""
    _create_policy(client, dpo_token, name="Policy A")
    _create_policy(client, dpo_token, name="Policy B")
    resp = client.get("/api/v1/retention/policies", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "Policy A" in names
    assert "Policy B" in names


def test_update_policy(client, dpo_token):
    """Test that update policy behaves as expected."""
    policy = _create_policy(client, dpo_token)
    resp = client.patch(
        f"/api/v1/retention/policies/{policy['id']}",
        json={"retention_days": 1095},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    assert resp.json()["retention_days"] == 1095


# ── Records ───────────────────────────────────────────────────────────────────


def test_create_retention_record(client, dpo_token):
    """Test that create retention record behaves as expected."""
    asset = _create_asset(client, dpo_token)
    future = date.today() + timedelta(days=365)
    data = _create_record(client, dpo_token, asset["id"], future)
    assert data["information_asset_id"] == asset["id"]
    assert data["status"] == "ACTIVE"
    assert data["legal_hold"] is False


def test_list_records(client, dpo_token):
    """Test that list records behaves as expected."""
    asset = _create_asset(client, dpo_token)
    future = date.today() + timedelta(days=365)
    _create_record(client, dpo_token, asset["id"], future)
    resp = client.get("/api/v1/retention/records", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ── US-RF29-1: Expired under review report ───────────────────────────────────


def test_expired_under_review_report_shows_held_expired_records(client, dpo_token):
    """Test that expired under review report shows held expired records behaves as expected."""
    asset = _create_asset(client, dpo_token)
    past = date.today() - timedelta(days=10)
    # Create expired record with legal hold
    _create_record(
        client, dpo_token, asset["id"], past, legal_hold=True, hold_justification="Legal case"
    )

    resp = client.get("/api/v1/retention/expired-under-review", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert "as_of" in data
    # All returned records should have legal_hold=True and expired
    for r in data["records"]:
        assert r["legal_hold"] is True


def test_expired_without_hold_not_in_report(client, dpo_token):
    """Test that expired without hold not in report behaves as expected."""
    asset = _create_asset(client, dpo_token)
    past = date.today() - timedelta(days=10)
    # No legal_hold → should not appear
    record = _create_record(client, dpo_token, asset["id"], past, legal_hold=False)

    resp = client.get("/api/v1/retention/expired-under-review", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    ids = [r["id"] for r in resp.json()["records"]]
    assert record["id"] not in ids


def test_review_decision_closes_record(client, dpo_token):
    """Test that review decision closes record behaves as expected."""
    asset = _create_asset(client, dpo_token)
    past = date.today() - timedelta(days=5)
    record = _create_record(client, dpo_token, asset["id"], past, legal_hold=True)

    resp = client.patch(
        f"/api/v1/retention/records/{record['id']}",
        json={"review_decision": "ANONYMIZE", "decision_rationale": "Privacy requirement"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["review_decision"] == "ANONYMIZE"
    assert data["status"] == "CLOSED"
    assert data["reviewed_by_id"] is not None


# ── Tenant isolation ─────────────────────────────────────────────────────────


def test_policy_tenant_isolation(client, dpo_token, tenant_b_token):
    """Test that policy tenant isolation behaves as expected."""
    created = _create_policy(client, dpo_token, name="Tenant A Policy")
    resp = client.get("/api/v1/retention/policies", headers=auth_headers(tenant_b_token))
    ids = [p["id"] for p in resp.json()]
    assert created["id"] not in ids


# ── RBAC ─────────────────────────────────────────────────────────────────────


def test_auditor_can_read_retention(client, dpo_token, auditor_token):
    """Test that auditor can read retention behaves as expected."""
    _create_policy(client, dpo_token)
    resp = client.get("/api/v1/retention/policies", headers=auth_headers(auditor_token))
    assert resp.status_code == 200


def test_auditor_cannot_create_policy(client, auditor_token):
    """Test that auditor cannot create policy behaves as expected."""
    resp = client.post(
        "/api/v1/retention/policies",
        json={"name": "x", "data_category": "y", "retention_days": 30},
        headers=auth_headers(auditor_token),
    )
    assert resp.status_code == 403
