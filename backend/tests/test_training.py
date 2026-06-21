"""Tests for training: programs, modules, materials, enrollments."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


class TestTrainingPrograms:
    def test_create_program(self, client: TestClient, dpo_token):
        resp = client.post(
            "/api/v1/training/programs",
            json={"title": "LOPDP Fundamentals", "description": "Basic compliance training"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "LOPDP Fundamentals"
        assert data["is_active"] is True

    def test_list_programs(self, client: TestClient, dpo_token):
        client.post(
            "/api/v1/training/programs",
            json={"title": "Listed Program"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/training/programs", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_get_program(self, client: TestClient, dpo_token):
        create_resp = client.post(
            "/api/v1/training/programs",
            json={"title": "Fetch Me"},
            headers=auth_headers(dpo_token),
        )
        prog_id = create_resp.json()["id"]
        resp = client.get(f"/api/v1/training/programs/{prog_id}", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.json()["id"] == prog_id

    def test_update_program(self, client: TestClient, dpo_token):
        create_resp = client.post(
            "/api/v1/training/programs",
            json={"title": "Old Title"},
            headers=auth_headers(dpo_token),
        )
        prog_id = create_resp.json()["id"]
        resp = client.put(
            f"/api/v1/training/programs/{prog_id}",
            json={"title": "New Title"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"

    def test_delete_program(self, client: TestClient, dpo_token):
        create_resp = client.post(
            "/api/v1/training/programs",
            json={"title": "Delete Me"},
            headers=auth_headers(dpo_token),
        )
        prog_id = create_resp.json()["id"]
        resp = client.delete(f"/api/v1/training/programs/{prog_id}", headers=auth_headers(dpo_token))
        assert resp.status_code == 204


class TestTrainingModules:
    def _create_program(self, client, token):
        resp = client.post(
            "/api/v1/training/programs",
            json={"title": "Program for Module Test"},
            headers=auth_headers(token),
        )
        return resp.json()["id"]

    def test_create_module(self, client: TestClient, dpo_token):
        prog_id = self._create_program(client, dpo_token)
        resp = client.post(
            f"/api/v1/training/programs/{prog_id}/modules",
            json={"title": "Module 1", "description": "First module", "order": 1},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["program_id"] == prog_id

    def test_list_modules(self, client: TestClient, dpo_token):
        prog_id = self._create_program(client, dpo_token)
        client.post(
            f"/api/v1/training/programs/{prog_id}/modules",
            json={"title": "Module A"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get(f"/api/v1/training/programs/{prog_id}/modules", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_update_module(self, client: TestClient, dpo_token):
        prog_id = self._create_program(client, dpo_token)
        mod_resp = client.post(
            f"/api/v1/training/programs/{prog_id}/modules",
            json={"title": "Old Module"},
            headers=auth_headers(dpo_token),
        )
        mod_id = mod_resp.json()["id"]
        resp = client.put(
            f"/api/v1/training/modules/{mod_id}",
            json={"title": "Updated Module"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Module"


class TestTrainingMaterials:
    def _setup(self, client, token):
        prog = client.post(
            "/api/v1/training/programs", json={"title": "Mat Prog"}, headers=auth_headers(token)
        ).json()
        mod = client.post(
            f"/api/v1/training/programs/{prog['id']}/modules",
            json={"title": "Mat Module"},
            headers=auth_headers(token),
        ).json()
        return prog["id"], mod["id"]

    def test_create_material(self, client: TestClient, dpo_token):
        _, mod_id = self._setup(client, dpo_token)
        resp = client.post(
            f"/api/v1/training/modules/{mod_id}/materials",
            json={"title": "PDF Guide", "content_type": "pdf", "url": "https://example.com/guide.pdf"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json()["module_id"] == mod_id

    def test_list_materials(self, client: TestClient, dpo_token):
        _, mod_id = self._setup(client, dpo_token)
        client.post(
            f"/api/v1/training/modules/{mod_id}/materials",
            json={"title": "Text Content", "content": "Some text"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get(f"/api/v1/training/modules/{mod_id}/materials", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestEnrollments:
    def _setup_program(self, client, token):
        prog = client.post(
            "/api/v1/training/programs", json={"title": "Enroll Prog"}, headers=auth_headers(token)
        ).json()
        return prog["id"]

    def test_create_enrollment(self, client: TestClient, dpo_token, dpo_user, tenant_a):
        prog_id = self._setup_program(client, dpo_token)
        resp = client.post(
            "/api/v1/training/enrollments",
            json={"user_id": dpo_user.id, "program_id": prog_id},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] == dpo_user.id
        assert data["program_id"] == prog_id
        assert data["progress_pct"] == 0

    def test_update_enrollment_progress(self, client: TestClient, dpo_token, dpo_user):
        prog_id = self._setup_program(client, dpo_token)
        enroll_resp = client.post(
            "/api/v1/training/enrollments",
            json={"user_id": dpo_user.id, "program_id": prog_id},
            headers=auth_headers(dpo_token),
        )
        enroll_id = enroll_resp.json()["id"]
        resp = client.put(
            f"/api/v1/training/enrollments/{enroll_id}",
            json={"progress_pct": 75},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["progress_pct"] == 75

    def test_list_enrollments(self, client: TestClient, dpo_token, dpo_user):
        prog_id = self._setup_program(client, dpo_token)
        client.post(
            "/api/v1/training/enrollments",
            json={"user_id": dpo_user.id, "program_id": prog_id},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/training/enrollments", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
