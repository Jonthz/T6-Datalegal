"""Tests for US-RF18-1: automated internal alerts for critical legal-deadline events."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.models.alert import Alert
from app.models.arco_request import ARCORequest
from app.models.audit_plan import AuditPlan
from app.services.critical_alerts import scan_tenant_for_critical_alerts
from tests.conftest import auth_headers


def _make_arco(session, *, tenant_id, deadline_date, status="RECEIVED", assigned_dpo_id=None):
    """Handle make arco."""
    req = ARCORequest(
        tenant_id=tenant_id,
        ticket_number=f"ARCO-TEST-{deadline_date.isoformat()}-{status}",
        request_type="ACCESS",
        requester_name="Juan Perez",
        requester_email="juan@email.com",
        requester_id_number="0912345678",
        received_date=date.today(),
        deadline_date=deadline_date,
        status=status,
        assigned_dpo_id=assigned_dpo_id,
    )
    session.add(req)
    session.flush()
    return req


def _make_audit_plan(session, *, tenant_id, period_start, status="PLANNED"):
    """Handle make audit plan."""
    plan = AuditPlan(
        tenant_id=tenant_id,
        name="Q3 Internal Audit",
        scope="Full data inventory",
        period_start=period_start,
        status=status,
    )
    session.add(plan)
    session.flush()
    return plan


# ── Service-level (unit) tests ───────────────────────────────────────────────


def test_scan_raises_overdue_alert(session, tenant_a):
    """An open ARCO request past its deadline must raise ARCO_OVERDUE."""
    req = _make_arco(session, tenant_id=tenant_a.id, deadline_date=date.today() - timedelta(days=2))
    session.commit()

    created = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert len(created) == 1
    assert created[0].alert_type == "ARCO_OVERDUE"
    assert created[0].severity == "CRITICAL"
    assert created[0].resource_id == req.id


def test_scan_raises_approaching_alert(session, tenant_a):
    """An open ARCO request due within 3 days must raise ARCO_DEADLINE_APPROACHING."""
    _make_arco(session, tenant_id=tenant_a.id, deadline_date=date.today() + timedelta(days=2))
    session.commit()

    created = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert len(created) == 1
    assert created[0].alert_type == "ARCO_DEADLINE_APPROACHING"
    assert created[0].severity == "WARNING"


def test_scan_ignores_requests_outside_window(session, tenant_a):
    """A request due far in the future must not raise any alert."""
    _make_arco(session, tenant_id=tenant_a.id, deadline_date=date.today() + timedelta(days=20))
    session.commit()

    created = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert not created


def test_scan_ignores_terminal_requests(session, tenant_a):
    """A RESPONDED request past the original deadline must not raise ARCO_OVERDUE."""
    _make_arco(
        session,
        tenant_id=tenant_a.id,
        deadline_date=date.today() - timedelta(days=5),
        status="RESPONDED",
    )
    session.commit()

    created = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert not created


def test_scan_is_idempotent(session, tenant_a):
    """Running the scan twice must not create duplicate unread alerts."""
    _make_arco(session, tenant_id=tenant_a.id, deadline_date=date.today() - timedelta(days=1))
    session.commit()

    first = scan_tenant_for_critical_alerts(session, tenant_a.id)
    second = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert len(first) == 1
    assert len(second) == 0
    assert session.query(Alert).filter(Alert.alert_type == "ARCO_OVERDUE").count() == 1


def test_scan_raises_audit_scheduled_alert(session, tenant_a):
    """A PLANNED audit starting within the window must raise AUDIT_SCHEDULED."""
    plan = _make_audit_plan(
        session, tenant_id=tenant_a.id, period_start=date.today() + timedelta(days=3)
    )
    session.commit()

    created = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert len(created) == 1
    assert created[0].alert_type == "AUDIT_SCHEDULED"
    assert created[0].resource_id == plan.id


def test_scan_respects_tenant_isolation(session, tenant_a, tenant_b):
    """A scan for tenant A must not raise alerts from tenant B's overdue requests."""
    _make_arco(session, tenant_id=tenant_b.id, deadline_date=date.today() - timedelta(days=1))
    session.commit()

    created = scan_tenant_for_critical_alerts(session, tenant_a.id)

    assert not created


# ── API-level tests ──────────────────────────────────────────────────────────


def test_scan_endpoint_creates_alerts(client: TestClient, session, tenant_a, dpo_token):
    """POST /alerts/scan must persist and return newly raised alerts."""
    _make_arco(session, tenant_id=tenant_a.id, deadline_date=date.today() - timedelta(days=1))
    session.commit()

    resp = client.post("/api/v1/alerts/scan", headers=auth_headers(dpo_token))

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data) == 1
    assert data[0]["alert_type"] == "ARCO_OVERDUE"

    # The alert must now show up in the regular alerts inbox.
    list_resp = client.get("/api/v1/alerts", headers=auth_headers(dpo_token))
    assert any(a["alert_type"] == "ARCO_OVERDUE" for a in list_resp.json())


def test_scan_endpoint_forbidden_for_auditor(client: TestClient, auditor_token):
    """Non-privileged roles without alerts:c permission must not trigger a scan."""
    resp = client.post("/api/v1/alerts/scan", headers=auth_headers(auditor_token))
    assert resp.status_code == 403
