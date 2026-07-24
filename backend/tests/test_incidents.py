"""Tests for US-RF08-1: Incident registration and regulatory notifications."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def _create_incident(client: TestClient, token: str, **overrides) -> dict:
    """Handle create incident."""
    payload = {
        "title": "Data breach in HR system",
        "description": "Unauthorized access to HR records detected.",
        "incident_type": "DATA_BREACH",
        "severity": "HIGH",
        "regulatory_notification_required": False,
        "affected_data_types": "NAME,EMAIL,SALARY",
        **overrides,
    }
    resp = client.post("/api/v1/incidents", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── CRUD ──────────────────────────────────────────────────────────────────────


def test_create_incident(client, dpo_token):
    """Test that create incident behaves as expected."""
    data = _create_incident(client, dpo_token)
    assert data["title"] == "Data breach in HR system"
    assert data["incident_type"] == "DATA_BREACH"
    assert data["severity"] == "HIGH"
    assert data["status"] == "OPEN"


def test_list_incidents(client, dpo_token):
    """Test that list incidents behaves as expected."""
    _create_incident(client, dpo_token, title="Incident 1")
    _create_incident(client, dpo_token, title="Incident 2")
    resp = client.get("/api/v1/incidents", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    titles = [i["title"] for i in resp.json()]
    assert "Incident 1" in titles
    assert "Incident 2" in titles


def test_get_incident(client, dpo_token):
    """Test that get incident behaves as expected."""
    created = _create_incident(client, dpo_token)
    resp = client.get(f"/api/v1/incidents/{created['id']}", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_update_incident_status(client, dpo_token):
    """Test that update incident status behaves as expected."""
    created = _create_incident(client, dpo_token)
    resp = client.patch(
        f"/api/v1/incidents/{created['id']}",
        json={"status": "INVESTIGATING"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "INVESTIGATING"


def test_filter_by_status(client, dpo_token):
    """Test that filter by status behaves as expected."""
    _create_incident(client, dpo_token, title="Open Inc")
    resp = client.get("/api/v1/incidents?status=OPEN", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    for inc in resp.json():
        assert inc["status"] == "OPEN"


def test_filter_by_severity(client, dpo_token):
    """Test that filter by severity behaves as expected."""
    _create_incident(client, dpo_token, severity="CRITICAL", title="Critical one")
    resp = client.get("/api/v1/incidents?severity=CRITICAL", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    assert any(i["severity"] == "CRITICAL" for i in resp.json())


# ── US-RF08-1: Regulatory notification ───────────────────────────────────────


def test_mark_regulatory_notification(client, dpo_token):
    """Test that mark regulatory notification behaves as expected."""
    created = _create_incident(client, dpo_token, regulatory_notification_required=False)
    assert created["regulatory_notified_at"] is None

    resp = client.post(
        f"/api/v1/incidents/{created['id']}/notify",
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["regulatory_notification_required"] is True
    assert data["regulatory_notified_at"] is not None


def test_create_incident_with_regulatory_flag(client, dpo_token):
    """Test that create incident with regulatory flag behaves as expected."""
    data = _create_incident(client, dpo_token, regulatory_notification_required=True)
    assert data["regulatory_notification_required"] is True


# ── Tenant isolation ─────────────────────────────────────────────────────────


def test_tenant_isolation(client, dpo_token, tenant_b_token):
    """Test that tenant isolation behaves as expected."""
    created = _create_incident(client, dpo_token, title="Tenant A incident")
    resp = client.get("/api/v1/incidents", headers=auth_headers(tenant_b_token))
    ids = [i["id"] for i in resp.json()]
    assert created["id"] not in ids


# ── RBAC ─────────────────────────────────────────────────────────────────────


def test_auditor_can_list_not_create(client, dpo_token, auditor_token):
    """Test that auditor can list not create behaves as expected."""
    _create_incident(client, dpo_token)
    resp = client.get("/api/v1/incidents", headers=auth_headers(auditor_token))
    assert resp.status_code == 200

    resp2 = client.post(
        "/api/v1/incidents",
        json={"title": "x", "description": "y", "incident_type": "OTHER", "severity": "LOW"},
        headers=auth_headers(auditor_token),
    )
    assert resp2.status_code == 403


def test_not_found_returns_404(client, dpo_token):
    """Test that not found returns 404 behaves as expected."""
    resp = client.get("/api/v1/incidents/99999", headers=auth_headers(dpo_token))
    assert resp.status_code == 404


# ── DAT-52: SSPDP fields ─────────────────────────────────────────────────────


def _closable_incident(client: TestClient, token: str, **overrides) -> dict:
    """Create an incident with all fields required to close it (DAT-52)."""
    return _create_incident(
        client,
        token,
        vulnerability_types=["CONFIDENTIALITY", "INTEGRITY"],
        delegate_name="Ana Delgado",
        delegate_email="dpo@empresa.ec",
        delegate_phone="0999999999",
        controller_name="Empresa S.A.",
        controller_email="legal@empresa.ec",
        controller_phone="022222222",
        **overrides,
    )


def test_create_with_vulnerability_and_parties(client, dpo_token):
    """Vulnerability types and delegate/controller details are persisted (DAT-52)."""
    data = _closable_incident(client, dpo_token)
    assert data["vulnerability_types"] == ["CONFIDENTIALITY", "INTEGRITY"]
    assert data["delegate_name"] == "Ana Delgado"
    assert data["controller_name"] == "Empresa S.A."
    assert data["has_closure_report"] is False


def test_vulnerability_types_are_validated(client, dpo_token):
    """An unknown breach type is rejected with 422."""
    resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "x",
            "description": "y",
            "incident_type": "OTHER",
            "vulnerability_types": ["NONSENSE"],
        },
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422


def test_vulnerability_types_are_deduped_and_ordered(client, dpo_token):
    """Duplicates are dropped and canonical CIA order is enforced."""
    data = _create_incident(
        client,
        dpo_token,
        vulnerability_types=["AVAILABILITY", "CONFIDENTIALITY", "CONFIDENTIALITY"],
    )
    assert data["vulnerability_types"] == ["CONFIDENTIALITY", "AVAILABILITY"]


def test_cannot_close_via_patch(client, dpo_token):
    """Setting status=CLOSED through PATCH is blocked; use the close endpoint."""
    created = _closable_incident(client, dpo_token)
    resp = client.patch(
        f"/api/v1/incidents/{created['id']}",
        json={"status": "CLOSED"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 400


def test_close_requires_mandatory_fields(client, dpo_token):
    """Closing an incident missing SSPDP fields returns 422 listing what's missing."""
    created = _create_incident(client, dpo_token, vulnerability_types=[])
    resp = client.post(
        f"/api/v1/incidents/{created['id']}/close",
        json={"closure_summary": "Resuelto"},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422
    assert "vulnerability_types" in resp.text


def test_close_requires_summary(client, dpo_token):
    """A blank closure summary is rejected."""
    created = _closable_incident(client, dpo_token)
    resp = client.post(
        f"/api/v1/incidents/{created['id']}/close",
        json={"closure_summary": "   "},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 422
    assert "closure_summary" in resp.text


def test_close_incident_generates_report(client, dpo_token):
    """A compliant close sets status CLOSED and produces a stored PDF report."""
    created = _closable_incident(client, dpo_token)
    resp = client.post(
        f"/api/v1/incidents/{created['id']}/close",
        json={"closure_summary": "Contenido remediado y notificado."},
        headers=auth_headers(dpo_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "CLOSED"
    assert data["closed_at"] is not None
    assert data["has_closure_report"] is True


def test_download_incident_report_pdf(client, dpo_token):
    """The generated closure report is downloadable as a PDF."""
    created = _closable_incident(client, dpo_token)
    client.post(
        f"/api/v1/incidents/{created['id']}/close",
        json={"closure_summary": "Cerrado."},
        headers=auth_headers(dpo_token),
    )
    resp = client.get(
        f"/api/v1/incidents/{created['id']}/report.pdf", headers=auth_headers(dpo_token)
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


def test_report_pdf_404_before_close(client, dpo_token):
    """Requesting the report before closing returns 404."""
    created = _closable_incident(client, dpo_token)
    resp = client.get(
        f"/api/v1/incidents/{created['id']}/report.pdf", headers=auth_headers(dpo_token)
    )
    assert resp.status_code == 404


def test_parties_prefill_from_company_profile(client, session, tenant_a, dpo_token):
    """Delegate/controller default from the company profile when not provided (RF-03)."""
    tenant_a.dpo_name = "Oficial RF-03"
    tenant_a.dpo_email = "rf03@empresa.ec"
    tenant_a.dpo_phone = "0988888888"
    session.commit()

    data = _create_incident(client, dpo_token)  # no delegate/controller in payload

    assert data["delegate_name"] == "Oficial RF-03"
    assert data["delegate_email"] == "rf03@empresa.ec"
    assert data["delegate_phone"] == "0988888888"
    assert data["controller_name"] == tenant_a.name


def test_explicit_parties_override_profile_defaults(client, session, tenant_a, dpo_token):
    """Values sent in the request take precedence over the company-profile defaults."""
    tenant_a.dpo_name = "Oficial RF-03"
    session.commit()

    data = _create_incident(client, dpo_token, delegate_name="Delegado Especifico")

    assert data["delegate_name"] == "Delegado Especifico"


def test_cannot_close_twice(client, dpo_token):
    """Closing an already-closed incident returns 400."""
    created = _closable_incident(client, dpo_token)
    payload = {"closure_summary": "Cerrado."}
    first = client.post(
        f"/api/v1/incidents/{created['id']}/close",
        json=payload,
        headers=auth_headers(dpo_token),
    )
    assert first.status_code == 200
    second = client.post(
        f"/api/v1/incidents/{created['id']}/close",
        json=payload,
        headers=auth_headers(dpo_token),
    )
    assert second.status_code == 400
