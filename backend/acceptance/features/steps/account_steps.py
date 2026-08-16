"""Steps for accounts, departments, RBAC, tenant provisioning and isolation.

Covers: US-RF01-1, US-RF03-1, US-RF24-1, US-RF41-1, US-RF19-1.
"""

# behave's given/when/then decorators are false positives for `not-callable`.
# pylint: disable=not-callable

from behave import given, then, when
from steps.common_steps import get_token, unique, unique_ruc


# ── US-RF01-1: Account creation with role and department ─────────────────────
@when('I create a user with role "{role}"')
def step_create_user(context, role):
    """Create a user with a unique email and the given role."""
    email = unique("newuser_") + "@datalegal.local"
    context.data["new_user_email"] = email
    context.response = context.api.post(
        "/api/v1/users",
        token=context.token,
        json={
            "email": email,
            "password": "Valid@Pass1!",
            "full_name": "New User",
            "role": role,
        },
    )


@then('the created user has role "{role}"')
def step_created_user_role(context, role):
    """Assert the created user carries the expected role."""
    body = context.response.json()
    assert body.get("role") == role, f"Expected {role}, got {body}"


# ── US-RF03-1: Initial company / department setup ────────────────────────────
@when('I create the department "{name}"')
def step_create_department(context, name):
    """Create a department with the given name."""
    context.data["dept_name"] = name
    context.response = context.api.post(
        "/api/v1/departments", token=context.token, json={"name": name}
    )


@then('the department "{name}" appears in the department list')
def step_department_listed(context, name):
    """Assert the named department is returned by the department listing."""
    resp = context.api.get("/api/v1/departments", token=context.token)
    names = [d["name"] for d in resp.json()]
    assert name in names, f"'{name}' not in {names}"


# ── US-RF24-1: Permission matrix / RBAC (negative) ───────────────────────────
@when('I try to create a treatment activity')
def step_try_create_activity(context):
    """Attempt to create a treatment activity as the current actor."""
    context.response = context.api.post(
        "/api/v1/treatment-activities",
        token=context.token,
        json={"name": unique("Activity "), "purpose": "test", "legal_basis": "CONSENT"},
    )


@then('the activity is not created')
def step_activity_not_created(context):
    """Assert the request was forbidden and no activity was returned."""
    assert context.response.status_code == 403
    assert "id" not in context.response.json(), context.response.text


# ── US-RF41-1: Tenant provisioning ───────────────────────────────────────────
@when('I provision a new tenant "{name}"')
def step_provision_tenant(context, name):
    """Provision a new tenant with a unique RUC and first administrator."""
    admin_email = unique("first_dpo_") + "@new-company.local"
    context.data["provisioned_admin"] = admin_email
    context.response = context.api.post(
        "/api/v1/tenants/provision",
        token=context.token,
        json={
            "tenant": {
                "name": name,
                "ruc": unique_ruc(),
                "country": "Ecuador",
                "sector": "Technology",
            },
            "admin_user": {
                "email": admin_email,
                "password": "Secure@Pass1!",
                "full_name": "First DPO",
                "role": "DPO",
            },
        },
    )


@then('the tenant is created with its administrator')
def step_tenant_created(context):
    """Assert the tenant was created and its admin belongs to it."""
    body = context.response.json()
    assert context.response.status_code == 201, body
    assert body["admin_user"]["tenant_id"] == body["tenant"]["id"], body


# ── US-RF19-1: Tenant isolation (negative) ───────────────────────────────────
@given('an ARCO request registered by "{email}"')
def step_arco_precondition(context, email):
    """Create an ARCO request owned by the given tenant user as a precondition."""
    token = get_token(context, email)
    resp = context.api.post(
        "/api/v1/arco-requests",
        token=token,
        json={
            "request_type": "ACCESS",
            "requester_name": "Company A Subject",
            "requester_email": "subject@company-a.local",
            "requester_id_number": "0912345678",
            "description": "Internal request from company A",
        },
    )
    assert resp.status_code == 201, resp.text
    context.data["arco_id"] = resp.json()["id"]


@when('"{email}" tries to read that ARCO request')
def step_cross_tenant_access(context, email):
    """Attempt to read the ARCO request as a user from another tenant."""
    token = get_token(context, email)
    context.response = context.api.get(
        f"/api/v1/arco-requests/{context.data['arco_id']}", token=token
    )
