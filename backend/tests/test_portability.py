"""Tests for portability request lifecycle and JSON export."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


class TestPortabilityRequests:
    """TestPortabilityRequests schema/model definition."""
    def test_create_portability_request(self, client: TestClient, dpo_token):
        """Test that create portability request behaves as expected."""
        resp = client.post(
            "/api/v1/portability",
            json={
                "subject_name": "Jane Doe",
                "subject_email": "jane@example.com",
                "notes": "Data portability request per LOPDP Art. 22",
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["subject_name"] == "Jane Doe"
        assert data["status"] == "PENDING"

    def test_list_portability_requests(self, client: TestClient, dpo_token):
        """Test that list portability requests behaves as expected."""
        client.post(
            "/api/v1/portability",
            json={"subject_name": "Subject A", "subject_email": "a@test.com"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/portability", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_get_portability_request(self, client: TestClient, dpo_token):
        """Test that get portability request behaves as expected."""
        create_resp = client.post(
            "/api/v1/portability",
            json={"subject_name": "Get Me", "subject_email": "getme@test.com"},
            headers=auth_headers(dpo_token),
        )
        req_id = create_resp.json()["id"]
        resp = client.get(f"/api/v1/portability/{req_id}", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.json()["id"] == req_id

    def test_complete_portability_request(self, client: TestClient, dpo_token):
        """Test that complete portability request behaves as expected."""
        create_resp = client.post(
            "/api/v1/portability",
            json={"subject_name": "Complete Me", "subject_email": "complete@test.com"},
            headers=auth_headers(dpo_token),
        )
        req_id = create_resp.json()["id"]

        resp = client.put(
            f"/api/v1/portability/{req_id}/complete",
            json={
                "status": "COMPLETED",
                "response_data": {
                    "personal_data": {"name": "Complete Me", "email": "complete@test.com"}
                },
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "COMPLETED"
        assert data["completed_at"] is not None

    def test_export_portability_request_json(self, client: TestClient, dpo_token):
        """Test that export portability request json behaves as expected."""
        create_resp = client.post(
            "/api/v1/portability",
            json={"subject_name": "Export Me", "subject_email": "export@test.com"},
            headers=auth_headers(dpo_token),
        )
        req_id = create_resp.json()["id"]

        # Complete it first
        client.put(
            f"/api/v1/portability/{req_id}/complete",
            json={"status": "COMPLETED", "response_data": {"data": "exported"}},
            headers=auth_headers(dpo_token),
        )

        resp = client.get(f"/api/v1/portability/{req_id}/export", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["request_id"] == req_id
        assert data["format"] == "JSON"
        assert data["standard"] == "RFC8259"
        assert "subject" in data
        assert data["subject"]["name"] == "Export Me"
        assert "generated_at" in data

    def test_filter_by_status(self, client: TestClient, dpo_token):
        """Test that filter by status behaves as expected."""
        client.post(
            "/api/v1/portability",
            json={"subject_name": "Filter Test", "subject_email": "filter@test.com"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/portability?status=PENDING", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["status"] == "PENDING" for r in results)

    def test_invalid_status_transition(self, client: TestClient, dpo_token):
        """Test that invalid status transition behaves as expected."""
        create_resp = client.post(
            "/api/v1/portability",
            json={"subject_name": "Invalid Status", "subject_email": "invalid@test.com"},
            headers=auth_headers(dpo_token),
        )
        req_id = create_resp.json()["id"]
        resp = client.put(
            f"/api/v1/portability/{req_id}/complete",
            json={"status": "INVALID_STATUS"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 400

    def test_portability_export_not_found(self, client: TestClient, dpo_token):
        """Test that portability export not found behaves as expected."""
        resp = client.get("/api/v1/portability/99999/export", headers=auth_headers(dpo_token))
        assert resp.status_code == 404
