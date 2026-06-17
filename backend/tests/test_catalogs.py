"""Tests for master catalog bulk load, list, and filter."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers

SAMPLE_ENTRIES = [
    {"type": "sector", "code": "TECH", "label": "Technology", "description": "Tech sector"},
    {"type": "sector", "code": "FINANCE", "label": "Finance", "description": "Finance sector"},
    {"type": "country", "code": "EC", "label": "Ecuador", "description": ""},
]


class TestCatalogs:
    def test_bulk_load_catalogs(self, client: TestClient, dpo_token):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": SAMPLE_ENTRIES},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 3
        assert data[0]["type"] == "sector"

    def test_list_all_catalogs(self, client: TestClient, dpo_token):
        client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": SAMPLE_ENTRIES},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/catalogs", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 3

    def test_filter_by_type(self, client: TestClient, dpo_token):
        client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": SAMPLE_ENTRIES},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/catalogs?type=sector", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["type"] == "sector" for r in results)

    def test_get_catalogs_by_type_path(self, client: TestClient, dpo_token):
        client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": SAMPLE_ENTRIES},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/catalogs/country", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["type"] == "country" for r in results)

    def test_delete_catalog_entry(self, client: TestClient, dpo_token):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": [{"type": "temp", "code": "T001", "label": "Temp", "description": ""}]},
            headers=auth_headers(dpo_token),
        )
        entry_id = resp.json()[0]["id"]
        del_resp = client.delete(f"/api/v1/catalogs/{entry_id}", headers=auth_headers(dpo_token))
        assert del_resp.status_code == 204

    def test_bulk_load_empty_list(self, client: TestClient, dpo_token):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": []},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json() == []

    def test_auditor_cannot_bulk_load(self, client: TestClient, auditor_token):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": SAMPLE_ENTRIES},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 403
