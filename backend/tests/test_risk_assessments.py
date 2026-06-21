"""Tests for US-RF37-1: Risk Assessment Questionnaire Integration."""

from tests.conftest import auth_headers


def _create_ta(client, token):
    """Handle create ta."""
    resp = client.post(
        "/api/v1/treatment-activities",
        json={"name": "TA for risk", "purpose": "testing", "legal_basis": "CONSENT"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_assessment(client, token, ta_id, responses=None) -> dict:
    """Handle create assessment."""
    if responses is None:
        responses = {
            "q1": True,
            "q2": True,
            "q3": False,
            "q4": True,
            "q5": False,
            "q6": False,
            "q7": False,
            "q8": True,
            "q9": True,
            "q10": True,
        }
    resp = client.post(
        "/api/v1/risk-assessments",
        json={"treatment_activity_id": ta_id, "responses": responses, "notes": ""},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Questionnaire structure ───────────────────────────────────────────────────


def test_get_questionnaire(client, dpo_token):
    """Test that get questionnaire behaves as expected."""
    resp = client.get("/api/v1/risk-assessments/questionnaire", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "questions" in data
    questions = data["questions"]
    assert len(questions) == 10
    # First question is the gateway
    assert questions[0]["id"] == "q1"
    assert questions[0]["is_gateway"] is True


# ── Score computation ─────────────────────────────────────────────────────────


def test_score_low_risk(client, dpo_token):
    """Test that score low risk behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    responses = {f"q{i}": (i == 1) for i in range(1, 11)}  # only q1=True, rest False → no controls
    data = _create_assessment(client, dpo_token, ta_id, responses)
    # q2,q4,q5,q7 = False → impact=1; q3,q6 = False → prob=1; q8,q9,q10 = False → +3 prob → prob=4
    # score = 4 × 1 = 4 → LOW
    assert data["risk_level"] == "LOW"
    assert 1 <= data["risk_score"] <= 8


def test_score_high_risk(client, dpo_token):
    """Test that score high risk behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    responses = {
        "q1": True,
        "q2": True,
        "q3": True,
        "q4": True,
        "q5": True,
        "q6": True,
        "q7": True,
        "q8": False,
        "q9": False,
        "q10": False,
    }
    data = _create_assessment(client, dpo_token, ta_id, responses)
    assert data["risk_level"] == "HIGH"
    assert data["risk_score"] >= 17


def test_score_formula(client, dpo_token):
    """Test that score formula behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    responses = {f"q{i}": True for i in range(1, 11)}
    data = _create_assessment(client, dpo_token, ta_id, responses)
    assert data["risk_score"] == data["probability"] * data["impact"]


# ── Gateway check ─────────────────────────────────────────────────────────────


def test_gateway_q1_false_rejected(client, dpo_token):
    """Test that gateway q1 false rejected behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    resp = client.post(
        "/api/v1/risk-assessments",
        json={"treatment_activity_id": ta_id, "responses": {"q1": False}},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422


# ── CRUD ──────────────────────────────────────────────────────────────────────


def test_list_assessments(client, dpo_token):
    """Test that list assessments behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    _create_assessment(client, dpo_token, ta_id)
    resp = client.get("/api/v1/risk-assessments", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_filter_by_activity(client, dpo_token):
    """Test that filter by activity behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    _create_assessment(client, dpo_token, ta_id)
    resp = client.get(
        f"/api/v1/risk-assessments?treatment_activity_id={ta_id}",
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    for ra in resp.json():
        assert ra["treatment_activity_id"] == ta_id


def test_update_assessment_notes(client, dpo_token):
    """Test that update assessment notes behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    created = _create_assessment(client, dpo_token, ta_id)
    resp = client.patch(
        f"/api/v1/risk-assessments/{created['id']}",
        json={"notes": "Updated note"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Updated note"


# ── Tenant isolation ─────────────────────────────────────────────────────────


def test_cross_tenant_activity_rejected(client, dpo_token, tenant_b_token):
    """Test that cross tenant activity rejected behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    responses = {f"q{i}": True for i in range(1, 11)}
    resp = client.post(
        "/api/v1/risk-assessments",
        json={"treatment_activity_id": ta_id, "responses": responses},
        headers=auth_headers(tenant_b_token),
    )
    assert resp.status_code == 404  # activity not visible to tenant B


# ── RBAC ─────────────────────────────────────────────────────────────────────


def test_auditor_can_read_not_create(client, dpo_token, auditor_token):
    """Test that auditor can read not create behaves as expected."""
    ta_id = _create_ta(client, dpo_token)
    _create_assessment(client, dpo_token, ta_id)
    resp = client.get("/api/v1/risk-assessments", headers=auth_headers(auditor_token))
    assert resp.status_code == 200

    resp2 = client.post(
        "/api/v1/risk-assessments",
        json={"treatment_activity_id": ta_id, "responses": {"q1": True}},
        headers=auth_headers(auditor_token),
    )
    assert resp2.status_code == 403
