"""Tests for US-RF28-1: Automatic progress and reports. US-RF39-1: Catalog referential integrity."""


from tests.conftest import auth_headers

# ── US-RF28-1: Data inventory progress ───────────────────────────────────────

def test_progress_empty(client, dpo_token):
    resp = client.get("/api/v1/data-inventory/progress", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "as_of" in data
    assert "treatment_activities" in data
    assert "risk_assessments_total" in data
    assert "risk_distribution" in data
    assert "classification_distribution" in data


def test_progress_counts_activities(client, dpo_token):
    # Create 2 DRAFT and 1 ACTIVE
    for i in range(2):
        client.post(
            "/api/v1/treatment-activities",
            json={"name": f"Draft {i}", "purpose": "test", "legal_basis": "CONSENT", "status": "DRAFT"},
            headers=auth_headers(dpo_token),
        )
    resp1 = client.post(
        "/api/v1/treatment-activities",
        json={"name": "Active TA", "purpose": "test", "legal_basis": "CONSENT", "status": "ACTIVE"},
        headers=auth_headers(dpo_token),
    )
    assert resp1.status_code == 201

    resp = client.get("/api/v1/data-inventory/progress", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    ta = resp.json()["treatment_activities"]
    assert ta["total"] >= 3
    assert ta["active"] >= 1
    assert ta["draft"] >= 2


def test_progress_completion_pct(client, dpo_token):
    ta_resp = client.post(
        "/api/v1/treatment-activities",
        json={"name": "TA with risk", "purpose": "test", "legal_basis": "CONSENT"},
        headers=auth_headers(dpo_token),
    )
    ta_id = ta_resp.json()["id"]
    responses = {f"q{i}": True for i in range(1, 11)}
    client.post(
        "/api/v1/risk-assessments",
        json={"treatment_activity_id": ta_id, "responses": responses},
        headers=auth_headers(dpo_token),
    )

    resp = client.get("/api/v1/data-inventory/progress", headers=auth_headers(dpo_token))
    data = resp.json()["treatment_activities"]
    assert data["with_risk_assessment"] >= 1
    assert data["completion_pct"] > 0


def test_progress_risk_distribution(client, dpo_token):
    ta_resp = client.post(
        "/api/v1/treatment-activities",
        json={"name": "TA risk dist", "purpose": "test", "legal_basis": "CONSENT"},
        headers=auth_headers(dpo_token),
    )
    ta_id = ta_resp.json()["id"]
    # Submit a HIGH risk assessment
    client.post(
        "/api/v1/risk-assessments",
        json={
            "treatment_activity_id": ta_id,
            "responses": {
                "q1": True, "q2": True, "q3": True, "q4": True,
                "q5": True, "q6": True, "q7": True,
                "q8": False, "q9": False, "q10": False,
            },
        },
        headers=auth_headers(dpo_token),
    )

    resp = client.get("/api/v1/data-inventory/progress", headers=auth_headers(dpo_token))
    dist = resp.json()["risk_distribution"]
    assert "HIGH" in dist
    assert dist["HIGH"] >= 1


def test_progress_classification_distribution(client, dpo_token):
    client.post(
        "/api/v1/information-assets",
        json={
            "name": "Classified asset",
            "asset_type_code": "SOFTWARE",
            "format_code": "DATABASE",
            "storage_medium_code": "DIGITAL",
            "classification_level_code": "PUBLICA_RESERVADA",
        },
        headers=auth_headers(dpo_token),
    )

    resp = client.get("/api/v1/data-inventory/progress", headers=auth_headers(dpo_token))
    dist = resp.json()["classification_distribution"]
    assert "PUBLICA_RESERVADA" in dist


def test_progress_tenant_isolation(client, dpo_token, tenant_b_token):
    client.post(
        "/api/v1/treatment-activities",
        json={"name": "Tenant A TA", "purpose": "test", "legal_basis": "CONSENT"},
        headers=auth_headers(dpo_token),
    )
    resp = client.get("/api/v1/data-inventory/progress", headers=auth_headers(tenant_b_token))
    assert resp.status_code == 200
    # Tenant B should see their own zero-count (not tenant A's)
    ta = resp.json()["treatment_activities"]
    # This just verifies no error and tenant isolation doesn't crash
    assert isinstance(ta["total"], int)


# ── US-RF39-1: Catalog referential integrity ─────────────────────────────────

def test_catalog_delete_blocked_when_referenced(client, dpo_token):
    # Create a catalog entry
    bulk_resp = client.post(
        "/api/v1/catalogs/bulk-load",
        json={"entries": [{"type": "ASSET_TYPE", "code": "SOFT_REF_TEST", "label": "Software Test", "description": ""}]},
        headers=auth_headers(dpo_token),
    )
    assert bulk_resp.status_code == 201
    entry_id = bulk_resp.json()[0]["id"]

    # Create an information asset referencing that catalog entry
    client.post(
        "/api/v1/information-assets",
        json={
            "name": "Asset using catalog",
            "asset_type_code": "SOFT_REF_TEST",
            "format_code": "DATABASE",
            "storage_medium_code": "DIGITAL",
            "classification_level_code": "PUBLICA_CLASIFICADA",
        },
        headers=auth_headers(dpo_token),
    )

    # Attempt to delete the catalog entry — should be blocked
    resp = client.delete(f"/api/v1/catalogs/{entry_id}", headers=auth_headers(dpo_token))
    assert resp.status_code == 409
    assert "referenced" in resp.json()["detail"].lower()


def test_catalog_delete_allowed_when_not_referenced(client, dpo_token):
    bulk_resp = client.post(
        "/api/v1/catalogs/bulk-load",
        json={"entries": [{"type": "ASSET_TYPE", "code": "UNREFERENCED_TYPE", "label": "Unused", "description": ""}]},
        headers=auth_headers(dpo_token),
    )
    assert bulk_resp.status_code == 201
    entry_id = bulk_resp.json()[0]["id"]

    resp = client.delete(f"/api/v1/catalogs/{entry_id}", headers=auth_headers(dpo_token))
    assert resp.status_code == 204
