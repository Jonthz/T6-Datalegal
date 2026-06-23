"""Tests for US-RF36-1 (Technical Metadata) and US-RF38-1 (Classification Levels)."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def _create_asset(client: TestClient, token: str, **overrides) -> dict:
    """Handle create asset."""
    payload = {
        "name": "Customer DB",
        "description": "Main customer database",
        "asset_type_code": "SOFTWARE",
        "format_code": "DATABASE",
        "storage_medium_code": "DIGITAL",
        "classification_level_code": "PUBLICA_CLASIFICADA",
        **overrides,
    }
    resp = client.post("/api/v1/information-assets", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── CRUD ──────────────────────────────────────────────────────────────────────


def test_create_information_asset(client, dpo_token):
    """Test that create information asset behaves as expected."""
    data = _create_asset(client, dpo_token)
    assert data["name"] == "Customer DB"
    assert data["asset_type_code"] == "SOFTWARE"
    assert data["format_code"] == "DATABASE"
    assert data["storage_medium_code"] == "DIGITAL"


def test_list_information_assets(client, dpo_token):
    """Test that list information assets behaves as expected."""
    _create_asset(client, dpo_token, name="Asset 1")
    _create_asset(client, dpo_token, name="Asset 2")
    resp = client.get("/api/v1/information-assets", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    names = [a["name"] for a in resp.json()]
    assert "Asset 1" in names
    assert "Asset 2" in names


def test_filter_by_classification(client, dpo_token):
    """Test that filter by classification behaves as expected."""
    _create_asset(
        client, dpo_token, name="Internal", classification_level_code="PUBLICA_USO_INTERNO"
    )
    _create_asset(client, dpo_token, name="Reserved", classification_level_code="PUBLICA_RESERVADA")
    resp = client.get(
        "/api/v1/information-assets?classification=PUBLICA_USO_INTERNO",
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    codes = {a["classification_level_code"] for a in resp.json()}
    assert codes == {"PUBLICA_USO_INTERNO"}


def test_update_asset_metadata(client, dpo_token):
    """Test that update asset metadata behaves as expected."""
    created = _create_asset(client, dpo_token)
    resp = client.patch(
        f"/api/v1/information-assets/{created['id']}",
        json={"format_code": "SPREADSHEET", "description": "Updated description"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["format_code"] == "SPREADSHEET"
    assert data["description"] == "Updated description"


def test_delete_asset(client, dpo_token):
    """Test that delete asset behaves as expected."""
    created = _create_asset(client, dpo_token)
    resp = client.delete(
        f"/api/v1/information-assets/{created['id']}",
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 204


def test_link_to_treatment_activity(client, dpo_token):
    # Create a treatment activity first
    """Test that link to treatment activity behaves as expected."""
    ta_resp = client.post(
        "/api/v1/treatment-activities",
        json={
            "name": "TA for asset",
            "purpose": "test",
            "legal_basis": "CONSENT",
        },
        headers=auth_headers(dpo_token),
    )
    assert ta_resp.status_code == 201
    ta_id = ta_resp.json()["id"]

    asset = _create_asset(client, dpo_token, treatment_activity_id=ta_id)
    assert asset["treatment_activity_id"] == ta_id


# ── US-RF38-1: Classification levels ─────────────────────────────────────────


def test_all_classification_levels_accepted(client, dpo_token):
    """Test that all classification levels accepted behaves as expected."""
    levels = ["PUBLICA_USO_INTERNO", "PUBLICA_CLASIFICADA", "PUBLICA_RESERVADA"]
    for level in levels:
        data = _create_asset(
            client, dpo_token, name=f"Asset {level}", classification_level_code=level
        )
        assert data["classification_level_code"] == level


# ── Tenant isolation ─────────────────────────────────────────────────────────


def test_tenant_isolation(client, dpo_token, tenant_b_token):
    """Test that tenant isolation behaves as expected."""
    created = _create_asset(client, dpo_token, name="Tenant A Asset")
    resp = client.get("/api/v1/information-assets", headers=auth_headers(tenant_b_token))
    assert resp.status_code == 200
    ids = [a["id"] for a in resp.json()]
    assert created["id"] not in ids


# ── RBAC ─────────────────────────────────────────────────────────────────────


def test_auditor_cannot_create_asset(client, auditor_token):
    """Test that auditor cannot create asset behaves as expected."""
    resp = client.post(
        "/api/v1/information-assets",
        json={
            "name": "x",
            "asset_type_code": "y",
            "format_code": "z",
            "storage_medium_code": "q",
            "classification_level_code": "PUBLICA_CLASIFICADA",
        },
        headers=auth_headers(auditor_token),
    )
    assert resp.status_code == 403


def test_auditor_can_list_assets(client, dpo_token, auditor_token):
    """Test that auditor can list assets behaves as expected."""
    _create_asset(client, dpo_token)
    resp = client.get("/api/v1/information-assets", headers=auth_headers(auditor_token))
    assert resp.status_code == 200
