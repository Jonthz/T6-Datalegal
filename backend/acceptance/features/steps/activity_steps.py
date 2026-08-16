"""Steps for treatment activities: RoT wizard, department isolation, risk score.

Covers: US-RF04-1, US-RF01-2, US-RF10-1.
"""

# behave's given/when/then decorators are false positives for `not-callable`.
# pylint: disable=not-callable

from behave import given, then, when
from steps.common_steps import get_token


def _resolve_dept_id(context, name):
    """Look up a department id by name via the API (works in both modes)."""
    token = get_token(context, "admin@datalegal.local")
    resp = context.api.get("/api/v1/departments", token=token)
    for d in resp.json():
        if d["name"] == name:
            return d["id"]
    raise AssertionError(f"Department not found: {name}")


# ── US-RF04-1: Guided RoT wizard ─────────────────────────────────────────────
@when('I start the RoT wizard for the activity "{name}"')
def step_wizard_start(context, name):
    """Start the RoT wizard, creating a DRAFT activity."""
    context.response = context.api.post(
        "/api/v1/treatment-activities/wizard/start",
        token=context.token,
        json={"name": name, "purpose": "Guided registration of the activity"},
    )
    if context.response.status_code in (200, 201):
        context.data["activity_id"] = context.response.json()["id"]


@when('I complete the legal basis "{basis}"')
def step_wizard_legal_basis(context, basis):
    """Complete the wizard's legal-basis step for the current activity."""
    aid = context.data["activity_id"]
    context.response = context.api.patch(
        f"/api/v1/treatment-activities/wizard/{aid}/legal-basis",
        token=context.token,
        json={"legal_basis": basis},
    )


@when("I finalize the wizard")
def step_wizard_finalize(context):
    """Finalize the wizard, activating the current activity."""
    aid = context.data["activity_id"]
    context.response = context.api.post(
        f"/api/v1/treatment-activities/wizard/{aid}/finalize", token=context.token
    )


@then('the activity is in status "{status}"')
def step_activity_status(context, status):
    """Assert the activity in the last response is in the expected status."""
    assert context.response.json().get("status") == status, context.response.text


# ── US-RF01-2: Department isolation ──────────────────────────────────────────
@given('an activity "{name}" in the department "{dept}"')
def step_activity_in_department(context, name, dept):
    """Create an ACTIVE activity assigned to a specific department (as DPO)."""
    token = get_token(context, "dpo@datalegal.local")
    dept_id = _resolve_dept_id(context, dept)
    resp = context.api.post(
        "/api/v1/treatment-activities",
        token=token,
        json={
            "name": name,
            "purpose": "Seed activity for the test",
            "legal_basis": "CONSENT",
            "department_id": dept_id,
            "status": "ACTIVE",
        },
    )
    assert resp.status_code == 201, resp.text


@when('"{email}" lists the treatment activities')
def step_list_activities(context, email):
    """List treatment activities as the given user and keep the result."""
    token = get_token(context, email)
    context.response = context.api.get("/api/v1/treatment-activities", token=token)
    context.data["activities"] = context.response.json()


@then('I see the activity "{name}"')
def step_see_activity(context, name):
    """Assert the named activity is present in the last listing."""
    names = [a["name"] for a in context.data["activities"]]
    assert name in names, f"Did not see '{name}' in {names}"


@then('I do not see the activity "{name}"')
def step_not_see_activity(context, name):
    """Assert the named activity is absent from the last listing."""
    names = [a["name"] for a in context.data["activities"]]
    assert name not in names, f"Should not see '{name}' in {names}"


# ── US-RF10-1: Immediate risk calculation ────────────────────────────────────
@given('a treatment activity "{name}"')
def step_create_activity_named(context, name):
    """Create a simple treatment activity to attach a risk assessment to."""
    token = context.token or get_token(context, "dpo@datalegal.local")
    resp = context.api.post(
        "/api/v1/treatment-activities",
        token=token,
        json={"name": name, "purpose": "test", "legal_basis": "CONSENT"},
    )
    assert resp.status_code == 201, resp.text
    context.data["activity_id"] = resp.json()["id"]


@when("I assess the risk with high-impact answers")
def step_high_risk(context):
    """Submit a risk assessment whose answers yield a HIGH classification."""
    responses = {f"q{i}": i <= 7 for i in range(1, 11)}
    context.response = context.api.post(
        "/api/v1/risk-assessments",
        token=context.token,
        json={"treatment_activity_id": context.data["activity_id"], "responses": responses},
    )


@then('the calculated risk level is "{level}"')
def step_risk_level(context, level):
    """Assert the computed risk level matches the expected value."""
    assert context.response.json().get("risk_level") == level, context.response.text


@then("the response includes a risk score")
def step_has_risk_score(context):
    """Assert the risk assessment response carries a numeric risk score."""
    assert "risk_score" in context.response.json(), context.response.text
