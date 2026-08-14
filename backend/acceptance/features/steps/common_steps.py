"""Shared steps: authentication and generic response assertions."""

# behave's given/when/then are dynamically-built decorators that pylint cannot
# resolve, so it reports false positives for `not-callable` at each step.
# pylint: disable=not-callable

import uuid

from behave import given, then, when


def _password_for(context, email):
    """Return the demo password for an email, defaulting to the common one."""
    if email in context.passwords:
        return context.passwords[email]
    if email == "owner@datalegal.local":
        return "Owner123!"
    return "Admin123!"


def login(context, email, password=None):
    """Log in via the API and remember the token for the email on success."""
    resp = context.api.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password or _password_for(context, email)},
    )
    context.response = resp
    if resp.status_code == 200 and "access_token" in resp.json():
        token = resp.json()["access_token"]
        context.token = token
        context.tokens[email] = token
    return resp


def get_token(context, email):
    """Return a valid token for a demo user, logging in on first use."""
    if email not in context.tokens:
        login(context, email)
    return context.tokens.get(email)


def unique(prefix):
    """Return a collision-free suffix so scenarios are safe to re-run in live mode."""
    return f"{prefix}{uuid.uuid4().hex[:8]}"


def unique_ruc():
    """Return a collision-free 13-digit RUC-like string for provisioning scenarios."""
    return str(uuid.uuid4().int)[:13]


@given('I am authenticated as "{email}"')
def step_authenticated_as(context, email):
    """Authenticate as the given demo user and assert a token was issued."""
    resp = login(context, email)
    assert resp.status_code == 200, f"Login failed for {email}: {resp.status_code} {resp.text}"
    assert context.token, f"No token obtained for {email}"


@when('I log in as "{email}" with password "{password}"')
def step_login_with_password(context, email, password):
    """Attempt a login with an explicit password (used by the login scenario)."""
    login(context, email, password)


@then('I receive an access token with role "{role}"')
def step_token_with_role(context, role):
    """Assert the login response carries an access token and the expected role."""
    body = context.response.json()
    assert "access_token" in body, f"No token in response: {body}"
    assert body.get("role") == role, f"Expected role {role}, got {body.get('role')}"


@then('the response status is {code:d}')
def step_status_code(context, code):
    """Assert the last response has the expected HTTP status code."""
    assert context.response is not None, "No response recorded."
    assert context.response.status_code == code, (
        f"Expected {code}, got {context.response.status_code}: {context.response.text}"
    )


@then('the system responds "403 Forbidden"')
def step_forbidden(context):
    """Assert the last response was a 403 Forbidden."""
    assert context.response.status_code == 403, (
        f"Expected 403, got {context.response.status_code}: {context.response.text}"
    )


@then('access is denied')
def step_access_denied(context):
    """Assert access was denied (403 Forbidden or 404 hidden by tenant isolation)."""
    assert context.response.status_code in (403, 404), (
        f"Expected 403/404, got {context.response.status_code}: {context.response.text}"
    )
