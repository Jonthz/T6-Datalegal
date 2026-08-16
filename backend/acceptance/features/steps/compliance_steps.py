"""Steps for compliance flows: ARCO, ROPA, audit plans, portability, consent.

Covers: US-RF07-1/US-RF30-1, US-RF31-1, US-RF13-1, US-RF26-1, US-RF32-1.
"""

# behave's given/when/then decorators are false positives for `not-callable`.
# pylint: disable=not-callable

from datetime import date

from behave import given, then, when
from steps.common_steps import unique


# ── US-RF07-1 / US-RF30-1: ARCO with legal SLA ───────────────────────────────
@when('I register an ARCO request of type "{rtype}"')
def step_create_arco(context, rtype):
    """Register an ARCO request of the given type as the current actor."""
    context.response = context.api.post(
        "/api/v1/arco-requests",
        token=context.token,
        json={
            "request_type": rtype,
            "requester_name": "Juan Perez",
            "requester_email": "juan@example.com",
            "requester_id_number": "0912345678",
            "description": "I request access to my personal data.",
        },
    )
    if context.response.status_code == 201:
        context.data["arco_id"] = context.response.json()["id"]


@then('the request is created with ticket number "{prefix}"')
def step_arco_ticket(context, prefix):
    """Assert the ARCO request got a ticket number with the expected prefix."""
    body = context.response.json()
    assert body["ticket_number"].startswith(prefix), body


@then('the request is in status "{status}"')
def step_arco_status(context, status):
    """Assert the ARCO request is in the expected status."""
    assert context.response.json()["status"] == status, context.response.text


@then("the legal response deadline is {days:d} days")
def step_arco_deadline(context, days):
    """Assert the difference between received and deadline dates is N days."""
    body = context.response.json()
    received = date.fromisoformat(body["received_date"])
    deadline = date.fromisoformat(body["deadline_date"])
    assert (deadline - received).days == days, f"{(deadline - received).days} != {days}"


@then('the SLA stoplight is "{color}"')
def step_arco_sla(context, color):
    """Assert the SLA stoplight for the created ARCO request shows the expected color."""
    aid = context.data["arco_id"]
    resp = context.api.get(f"/api/v1/arco-requests/{aid}/sla-status", token=context.token)
    assert resp.status_code == 200, resp.text
    assert resp.json()["stoplight"] == color, resp.text


# ── US-RF31-1: ROPA report ───────────────────────────────────────────────────
@when("I generate the ROPA report")
def step_generate_ropa(context):
    """Request the consolidated ROPA report."""
    context.response = context.api.get("/api/v1/ropa", token=context.token)


@then("the ROPA report is generated successfully")
def step_ropa_ok(context):
    """Assert the ROPA report was returned successfully."""
    assert context.response.status_code == 200, context.response.text


@when("I download the ROPA as PDF")
def step_ropa_pdf(context):
    """Download the ROPA report as a PDF."""
    context.response = context.api.get("/api/v1/ropa/pdf", token=context.token)


# ── US-RF13-1: Audit planning, findings and PDF report ───────────────────────
@when('I create an audit plan "{name}"')
def step_create_audit_plan(context, name):
    """Create an audit plan with the given name."""
    context.response = context.api.post(
        "/api/v1/audit-plans",
        token=context.token,
        json={"name": name, "scope": "All data processing activities"},
    )
    if context.response.status_code == 201:
        context.data["plan_id"] = context.response.json()["id"]


@then('the plan is in status "{status}"')
def step_audit_plan_status(context, status):
    """Assert the audit plan is in the expected status."""
    assert context.response.json()["status"] == status, context.response.text


@when('I register a finding "{title}" with severity "{severity}"')
def step_create_finding(context, title, severity):
    """Register an audit finding under the current plan."""
    context.response = context.api.post(
        "/api/v1/audit-plans/findings",
        token=context.token,
        json={
            "audit_plan_id": context.data["plan_id"],
            "title": title,
            "severity": severity,
            "evidence": "Evidence collected during the audit.",
            "description": "Finding detail.",
        },
    )


@when("I download the audit report as PDF")
def step_audit_pdf(context):
    """Download the audit plan's PDF report."""
    pid = context.data["plan_id"]
    context.response = context.api.get(f"/api/v1/audit-plans/{pid}/report", token=context.token)


# ── US-RF26-1: Portability request and interoperable delivery ────────────────
@when('I register a portability request for "{name}"')
def step_create_portability(context, name):
    """Register a data portability request for a data subject."""
    context.response = context.api.post(
        "/api/v1/portability",
        token=context.token,
        json={
            "subject_name": name,
            "subject_email": "subject@example.com",
            "notes": "Data portability request under the LOPDP.",
        },
    )
    if context.response.status_code == 201:
        context.data["port_id"] = context.response.json()["id"]


@when("I complete the portability request")
def step_complete_portability(context):
    """Mark the portability request as completed with the response data."""
    pid = context.data["port_id"]
    context.response = context.api.put(
        f"/api/v1/portability/{pid}/complete",
        token=context.token,
        json={
            "status": "COMPLETED",
            "response_data": {"personal_data": {"name": "Subject", "email": "subject@example.com"}},
        },
    )


@when("I export the data subject's data")
def step_export_portability(context):
    """Export the completed portability request's data."""
    pid = context.data["port_id"]
    context.response = context.api.get(f"/api/v1/portability/{pid}/export", token=context.token)


@then('I receive the data in interoperable format "{standard}"')
def step_portability_standard(context, standard):
    """Assert the export is JSON in the expected interoperable standard."""
    body = context.response.json()
    assert body["format"] == "JSON", body
    assert body["standard"] == standard, body


# ── US-RF32-1: Explicit and immutable consent revocation ─────────────────────
@given("a registered consent")
def step_create_consent(context):
    """Register a consent record to be revoked later."""
    resp = context.api.post(
        "/api/v1/consents",
        token=context.token,
        json={
            "data_subject_token": unique("subj-"),
            "legal_basis": "CONSENT",
            "purpose": "Sending marketing communications",
            "is_sensitive": False,
        },
    )
    assert resp.status_code == 201, resp.text
    context.data["consent_id"] = resp.json()["id"]


@when('I revoke the consent with reason "{reason}"')
def step_revoke_consent(context, reason):
    """Revoke the registered consent with a reason."""
    cid = context.data["consent_id"]
    context.response = context.api.post(
        f"/api/v1/consents/{cid}/revoke",
        token=context.token,
        json={"revocation_reason": reason},
    )


@then("the consent is revoked with a date")
def step_consent_revoked(context):
    """Assert the consent is now revoked and carries a revocation timestamp."""
    body = context.response.json()
    assert body["is_revoked"] is True, body
    assert body["revoked_at"] is not None, body


@when("I try to revoke the same consent again")
def step_revoke_again(context):
    """Attempt to revoke the same consent a second time."""
    cid = context.data["consent_id"]
    context.response = context.api.post(
        f"/api/v1/consents/{cid}/revoke", token=context.token, json={}
    )


@then("the second revocation is rejected")
def step_revoke_rejected(context):
    """Assert the second revocation is rejected (immutability)."""
    assert context.response.status_code == 400, context.response.text


# ── Shared PDF assertion (ROPA + audit report) ───────────────────────────────
@then("I get a PDF document")
def step_get_pdf(context):
    """Assert the last response is a downloadable PDF document."""
    assert context.response.status_code == 200, context.response.text
    ctype = context.response.headers.get("content-type", "")
    assert "pdf" in ctype.lower(), f"unexpected content-type: {ctype}"
    assert context.response.content[:4] == b"%PDF", "Content does not start with %PDF"
