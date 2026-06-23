"""Sprint 3 test suite — US-RF03-1, RF04-1, RF09-1, RF10-1, RF11-1, RF30-1, RF31-1, RF43-1."""

from datetime import date

import pytest

from tests.conftest import auth_headers

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def activity(client, dpo_token, tenant_a):  # pylint: disable=unused-argument
    """Handle activity."""
    resp = client.post(
        "/api/v1/treatment-activities",
        json={
            "name": "Customer Database",
            "purpose": "CRM and support",
            "legal_basis": "CONSENT",
            "personal_data_types": ["email", "phone"],
            "data_subjects": ["customers"],
            "retention_period_days": 365,
            "is_cross_border": False,
            "status": "ACTIVE",
        },
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def risk_assessment(client, dpo_token, activity):
    """Handle risk assessment."""
    resp = client.post(
        "/api/v1/risk-assessments",
        json={
            "treatment_activity_id": activity["id"],
            "responses": {
                "q1": True,
                "q2": True,
                "q3": True,
                "q4": True,
                "q5": False,
                "q6": True,
                "q7": False,
                "q8": False,
                "q9": False,
                "q10": False,
            },
            "notes": "Risk scenario",
        },
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── US-RF03-1: Company profile and DPO setup ──────────────────────────────────


class TestCompanyProfile:
    """TestCompanyProfile schema/model definition."""
    def test_get_profile_authenticated(self, client, dpo_token):
        """Test that get profile authenticated behaves as expected."""
        resp = client.get("/api/v1/company-profile", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert "name" in resp.json()

    def test_update_profile_dpo(self, client, dpo_token):
        """Test that update profile dpo behaves as expected."""
        resp = client.put(
            "/api/v1/company-profile",
            json={
                "dpo_name": "Ana Garcia",
                "dpo_email": "dpo@empresa.ec",
                "dpo_phone": "+593987654321",
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["dpo_name"] == "Ana Garcia"
        assert data["dpo_email"] == "dpo@empresa.ec"

    def test_update_profile_auditor_forbidden(self, client, auditor_token):
        """Test that update profile auditor forbidden behaves as expected."""
        resp = client.put(
            "/api/v1/company-profile",
            json={"dpo_name": "Hacker"},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 403

    def test_get_profile_unauthenticated(self, client):
        """Test that get profile unauthenticated behaves as expected."""
        resp = client.get("/api/v1/company-profile")
        assert resp.status_code == 401


# ── US-RF04-1: Guided RoT wizard ─────────────────────────────────────────────


class TestWizard:
    """TestWizard schema/model definition."""
    def test_wizard_start(self, client, dpo_token):
        """Test that wizard start behaves as expected."""
        resp = client.post(
            "/api/v1/treatment-activities/wizard/start",
            json={"name": "HR Records", "purpose": "Employee management"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "DRAFT"

    def test_wizard_legal_basis_step(self, client, dpo_token):
        """Test that wizard legal basis step behaves as expected."""
        act_id = client.post(
            "/api/v1/treatment-activities/wizard/start",
            json={"name": "Payroll", "purpose": "Salary processing"},
            headers=auth_headers(dpo_token),
        ).json()["id"]

        resp = client.patch(
            f"/api/v1/treatment-activities/wizard/{act_id}/legal-basis",
            json={
                "legal_basis": "CONTRACT",
                "personal_data_types": ["name", "iban"],
                "data_subjects": ["employees"],
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["legal_basis"] == "CONTRACT"

    def test_wizard_transfers_step(self, client, dpo_token):
        """Test that wizard transfers step behaves as expected."""
        act_id = client.post(
            "/api/v1/treatment-activities/wizard/start",
            json={"name": "Cloud Backup", "purpose": "DR"},
            headers=auth_headers(dpo_token),
        ).json()["id"]

        resp = client.patch(
            f"/api/v1/treatment-activities/wizard/{act_id}/transfers",
            json={
                "is_cross_border": True,
                "destination_countries": ["US"],
                "processor_name": "AWS",
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_cross_border"] is True

    def test_wizard_finalize(self, client, dpo_token):
        """Test that wizard finalize behaves as expected."""
        act_id = client.post(
            "/api/v1/treatment-activities/wizard/start",
            json={"name": "Newsletter", "purpose": "Marketing emails"},
            headers=auth_headers(dpo_token),
        ).json()["id"]

        client.patch(
            f"/api/v1/treatment-activities/wizard/{act_id}/legal-basis",
            json={
                "legal_basis": "CONSENT",
                "personal_data_types": ["email"],
                "data_subjects": ["subscribers"],
            },
            headers=auth_headers(dpo_token),
        )
        resp = client.post(
            f"/api/v1/treatment-activities/wizard/{act_id}/finalize",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ACTIVE"

    def test_wizard_finalize_missing_legal_basis(self, client, dpo_token):
        """Test that wizard finalize missing legal basis behaves as expected."""
        act_id = client.post(
            "/api/v1/treatment-activities/wizard/start",
            json={"name": "Incomplete", "purpose": "Testing"},
            headers=auth_headers(dpo_token),
        ).json()["id"]

        resp = client.post(
            f"/api/v1/treatment-activities/wizard/{act_id}/finalize",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 422


# ── US-RF09-1: DPIA structured flow and signed PDF ───────────────────────────


class TestDPIA:
    """TestDPIA schema/model definition."""
    def test_create_dpia(self, client, dpo_token, activity):
        """Test that create dpia behaves as expected."""
        resp = client.post(
            "/api/v1/dpias",
            json={
                "treatment_activity_id": activity["id"],
                "step1_description": "We process customer contact data for CRM.",
                "step2_risk_analysis": "Risk of unauthorized access is medium.",
                "step3_mitigations": "MFA and encryption applied.",
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "DRAFT"
        assert data["version"] == 1

    def test_list_dpias(self, client, dpo_token, activity):
        """Test that list dpias behaves as expected."""
        client.post(
            "/api/v1/dpias",
            json={"treatment_activity_id": activity["id"]},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/dpias", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_update_dpia(self, client, dpo_token, activity):
        """Test that update dpia behaves as expected."""
        created = client.post(
            "/api/v1/dpias",
            json={"treatment_activity_id": activity["id"]},
            headers=auth_headers(dpo_token),
        ).json()
        resp = client.patch(
            f"/api/v1/dpias/{created['id']}",
            json={"step1_description": "Updated.", "status": "COMPLETED"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["step1_description"] == "Updated."

    def test_sign_dpia(self, client, dpo_token, activity):
        """Test that sign dpia behaves as expected."""
        created = client.post(
            "/api/v1/dpias",
            json={
                "treatment_activity_id": activity["id"],
                "step1_description": "Full",
                "step2_risk_analysis": "Analysis",
                "step3_mitigations": "Measures",
            },
            headers=auth_headers(dpo_token),
        ).json()
        resp = client.post(f"/api/v1/dpias/{created['id']}/sign", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SIGNED"
        assert data["signed_by_id"] is not None
        assert data["signed_at"] is not None

    def test_get_pdf(self, client, dpo_token, activity):
        """Test that get pdf behaves as expected."""
        created = client.post(
            "/api/v1/dpias",
            json={"treatment_activity_id": activity["id"], "step1_description": "Desc"},
            headers=auth_headers(dpo_token),
        ).json()
        client.post(f"/api/v1/dpias/{created['id']}/sign", headers=auth_headers(dpo_token))
        resp = client.get(f"/api/v1/dpias/{created['id']}/pdf", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

    def test_sign_dpia_auditor_forbidden(self, client, auditor_token, dpo_token, activity):
        """Test that sign dpia auditor forbidden behaves as expected."""
        created = client.post(
            "/api/v1/dpias",
            json={"treatment_activity_id": activity["id"]},
            headers=auth_headers(dpo_token),
        ).json()
        resp = client.post(
            f"/api/v1/dpias/{created['id']}/sign", headers=auth_headers(auditor_token)
        )
        assert resp.status_code == 403

    def test_tenant_isolation(self, client, tenant_b_token, dpo_token, activity):
        """Test that tenant isolation behaves as expected."""
        created = client.post(
            "/api/v1/dpias",
            json={"treatment_activity_id": activity["id"]},
            headers=auth_headers(dpo_token),
        ).json()
        resp = client.get(f"/api/v1/dpias/{created['id']}", headers=auth_headers(tenant_b_token))
        assert resp.status_code == 404


# ── US-RF10-1: Risk score dashboard ──────────────────────────────────────────


class TestRiskDashboard:
    """TestRiskDashboard schema/model definition."""
    def test_dashboard_structure(self, client, dpo_token, risk_assessment):  # pylint: disable=unused-argument
        """Test that dashboard structure behaves as expected."""
        resp = client.get("/api/v1/risk-assessments/dashboard", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        for key in (
            "total",
            "green",
            "yellow",
            "red",
            "by_level",
            "avg_score",
            "high_risk_activities",
        ):
            assert key in data

    def test_dashboard_counts(self, client, dpo_token, risk_assessment):  # pylint: disable=unused-argument
        """Test that dashboard counts behaves as expected."""
        resp = client.get("/api/v1/risk-assessments/dashboard", headers=auth_headers(dpo_token))
        data = resp.json()
        assert data["total"] >= 1
        # fixture creates MEDIUM risk (P=5 x I=3 = 15)
        assert data["by_level"]["MEDIUM"] >= 1
        assert data["yellow"] >= 1

    def test_dashboard_auditor_can_read(self, client, auditor_token, risk_assessment):  # pylint: disable=unused-argument
        """Test that dashboard auditor can read behaves as expected."""
        resp = client.get("/api/v1/risk-assessments/dashboard", headers=auth_headers(auditor_token))
        assert resp.status_code == 200


# ── US-RF11-1: Retention execution and audit log ──────────────────────────────


class TestRetentionExecution:
    """TestRetentionExecution schema/model definition."""
    @pytest.fixture
    def policy(self, client, dpo_token):
        """Handle policy."""
        resp = client.post(
            "/api/v1/retention/policies",
            json={
                "name": "Customer Retention",
                "data_category": "CUSTOMER",
                "retention_days": 365,
                "action_on_expiry": "REVIEW",
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        return resp.json()

    def test_execute_retention_run(self, client, dpo_token, policy):
        """Test that execute retention run behaves as expected."""
        resp = client.post(
            "/api/v1/retention/execute",
            json={"policy_id": policy["id"], "run_type": "MANUAL"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "records_processed" in data
        assert "status" in data
        assert data["run_type"] == "MANUAL"

    def test_execute_all_policies(self, client, dpo_token, policy):  # pylint: disable=unused-argument
        """Test that execute all policies behaves as expected."""
        resp = client.post(
            "/api/v1/retention/execute",
            json={"run_type": "MANUAL"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code in (200, 201)

    def test_list_execution_logs(self, client, dpo_token, policy):  # pylint: disable=unused-argument
        """Test that list execution logs behaves as expected."""
        client.post(
            "/api/v1/retention/execute",
            json={"run_type": "MANUAL"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/retention/execution-logs", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_execute_auditor_forbidden(self, client, auditor_token):
        """Test that execute auditor forbidden behaves as expected."""
        resp = client.post(
            "/api/v1/retention/execute",
            json={"run_type": "MANUAL"},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 403


# ── US-RF30-1: ARCO flow ──────────────────────────────────────────────────────


class TestARCO:
    """TestARCO schema/model definition."""
    def _create(self, client, token, rtype="ACCESS"):
        """Handle create."""
        resp = client.post(
            "/api/v1/arco-requests",
            json={
                "request_type": rtype,
                "requester_name": "Juan Perez",
                "requester_email": "juan@email.com",
                "requester_id_number": "0912345678",
                "description": "Request",
            },
            headers=auth_headers(token),
        )
        assert resp.status_code == 201, resp.text
        return resp.json()

    def test_create_arco_request(self, client, dpo_token):
        """Test that create arco request behaves as expected."""
        data = self._create(client, dpo_token)
        assert data["status"] == "RECEIVED"
        assert data["ticket_number"].startswith("ARCO-")

    def test_ticket_number_is_unique(self, client, dpo_token):
        """Test that ticket number is unique behaves as expected."""
        r1 = self._create(client, dpo_token)
        r2 = self._create(client, dpo_token, "RECTIFICATION")
        assert r1["ticket_number"] != r2["ticket_number"]

    def test_deadline_is_30_days(self, client, dpo_token):
        """Test that deadline is 30 days behaves as expected."""
        data = self._create(client, dpo_token)
        received = date.fromisoformat(data["received_date"])
        deadline = date.fromisoformat(data["deadline_date"])
        assert (deadline - received).days == 30

    def test_list_arco_requests(self, client, dpo_token):
        """Test that list arco requests behaves as expected."""
        self._create(client, dpo_token)
        resp = client.get("/api/v1/arco-requests", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_type(self, client, dpo_token):
        """Test that filter by type behaves as expected."""
        self._create(client, dpo_token, "OPPOSITION")
        resp = client.get(
            "/api/v1/arco-requests?request_type=OPPOSITION", headers=auth_headers(dpo_token)
        )
        assert resp.status_code == 200
        for item in resp.json():
            assert item["request_type"] == "OPPOSITION"

    def test_update_status(self, client, dpo_token):
        """Test that update status behaves as expected."""
        r = self._create(client, dpo_token)
        resp = client.patch(
            f"/api/v1/arco-requests/{r['id']}",
            json={"status": "VERIFYING"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "VERIFYING"

    def test_respond_sets_responded_at(self, client, dpo_token):
        """Test that respond sets responded at behaves as expected."""
        r = self._create(client, dpo_token)
        for s in ["VERIFYING", "IN_PROGRESS", "RESPONDED"]:
            client.patch(
                f"/api/v1/arco-requests/{r['id']}",
                json={"status": s},
                headers=auth_headers(dpo_token),
            )
        resp = client.get(f"/api/v1/arco-requests/{r['id']}", headers=auth_headers(dpo_token))
        assert resp.json()["responded_at"] is not None

    def test_dashboard(self, client, dpo_token):
        """Test that dashboard behaves as expected."""
        self._create(client, dpo_token)
        resp = client.get("/api/v1/arco-requests/dashboard", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        for key in ("total", "by_type", "by_status", "overdue_count"):
            assert key in data

    def test_tenant_isolation(self, client, dpo_token, tenant_b_token):
        """Test that tenant isolation behaves as expected."""
        r = self._create(client, dpo_token)
        resp = client.get(f"/api/v1/arco-requests/{r['id']}", headers=auth_headers(tenant_b_token))
        assert resp.status_code == 404


# ── US-RF31-1: ROPA report ────────────────────────────────────────────────────


class TestROPA:
    """TestROPA schema/model definition."""
    def test_ropa_json(self, client, dpo_token, activity):  # pylint: disable=unused-argument
        """Test that ropa json behaves as expected."""
        resp = client.get("/api/v1/ropa", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "generated_at" in data
        assert "total_activities" in data
        assert "activities_by_legal_basis" in data

    def test_ropa_contains_activity(self, client, dpo_token, activity):
        """Test that ropa contains activity behaves as expected."""
        resp = client.get("/api/v1/ropa", headers=auth_headers(dpo_token))
        data = resp.json()
        assert data["total_activities"] >= 1
        assert "CONSENT" in data["activities_by_legal_basis"]
        ids = [a["id"] for a in data["activities_by_legal_basis"]["CONSENT"]]
        assert activity["id"] in ids

    def test_ropa_pdf(self, client, dpo_token, activity):  # pylint: disable=unused-argument
        """Test that ropa pdf behaves as expected."""
        resp = client.get("/api/v1/ropa/pdf", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

    def test_ropa_auditor_can_read(self, client, auditor_token):
        """Test that ropa auditor can read behaves as expected."""
        resp = client.get("/api/v1/ropa", headers=auth_headers(auditor_token))
        assert resp.status_code == 200

    def test_ropa_unauthenticated(self, client):
        """Test that ropa unauthenticated behaves as expected."""
        resp = client.get("/api/v1/ropa")
        assert resp.status_code == 401


# ── US-RF43-1: Action Plan Generation ────────────────────────────────────────


class TestActionPlans:
    """TestActionPlans schema/model definition."""
    def test_create_template(self, client, dpo_token):
        """Test that create template behaves as expected."""
        resp = client.post(
            "/api/v1/action-plans/templates",
            json={
                "name": "High Risk Remediation",
                "applies_to_level": "HIGH",
                "default_tasks": [{"title": "Encrypt data", "priority": "HIGH"}],
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json()["applies_to_level"] == "HIGH"

    def test_list_templates(self, client, dpo_token):
        """Test that list templates behaves as expected."""
        client.post(
            "/api/v1/action-plans/templates",
            json={"name": "Generic", "applies_to_level": "ANY", "default_tasks": []},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/action-plans/templates", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_create_action_plan_manual(self, client, dpo_token, risk_assessment):
        """Test that create action plan manual behaves as expected."""
        resp = client.post(
            "/api/v1/action-plans",
            json={
                "risk_assessment_id": risk_assessment["id"],
                "title": "Fix high risk items",
                "tasks": [],
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json()["auto_generated"] is False

    def test_auto_generate_creates_plans(self, client, dpo_token, risk_assessment):  # pylint: disable=unused-argument
        """Test that auto generate creates plans behaves as expected."""
        client.post(
            "/api/v1/action-plans/templates",
            json={
                "name": "Auto Template",
                "applies_to_level": "ANY",
                "default_tasks": [{"title": "Review access"}],
            },
            headers=auth_headers(dpo_token),
        )
        resp = client.post("/api/v1/action-plans/auto-generate", headers=auth_headers(dpo_token))
        assert resp.status_code in (200, 201)
        assert isinstance(resp.json(), list)

    def test_auto_generate_idempotent(self, client, dpo_token, risk_assessment):  # pylint: disable=unused-argument
        """Test that auto generate idempotent behaves as expected."""
        client.post("/api/v1/action-plans/auto-generate", headers=auth_headers(dpo_token))
        second = client.post(
            "/api/v1/action-plans/auto-generate", headers=auth_headers(dpo_token)
        ).json()
        assert isinstance(second, list)
        assert len(second) == 0  # no new plans on second call

    def test_update_action_plan(self, client, dpo_token):
        """Test that update action plan behaves as expected."""
        plan = client.post(
            "/api/v1/action-plans",
            json={"title": "Test Plan", "tasks": []},
            headers=auth_headers(dpo_token),
        ).json()
        resp = client.patch(
            f"/api/v1/action-plans/{plan['id']}",
            json={"status": "ACTIVE", "title": "Updated Title"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ACTIVE"
        assert resp.json()["title"] == "Updated Title"

    def test_auditor_cannot_create_plan(self, client, auditor_token):
        """Test that auditor cannot create plan behaves as expected."""
        resp = client.post(
            "/api/v1/action-plans",
            json={"title": "Unauth Plan", "tasks": []},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 403

    def test_auditor_can_read_plans(self, client, auditor_token, dpo_token):
        """Test that auditor can read plans behaves as expected."""
        client.post(
            "/api/v1/action-plans",
            json={"title": "Readable", "tasks": []},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/action-plans", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
