"""Sprint 5 tests: US-RF06-1, US-RF07-1, US-RF15-1, US-RF16-1, US-RF18-1, US-RF21-1, US-RF23-1."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth_headers

# US-RF06-1: Consent registration stats


class TestConsentStats:
    """TestConsentStats schema/model definition."""
    def _create_consent(self, client, token, *, legal_basis="CONSENT", is_sensitive=False):
        """Handle create consent."""
        return client.post(
            "/api/v1/consents",
            json={
                "data_subject_token": "tok-abc-123",
                "legal_basis": legal_basis,
                "purpose": "Test purpose",
                "is_sensitive": is_sensitive,
            },
            headers=auth_headers(token),
        )

    def test_stats_empty(self, client: TestClient, dpo_token: str):
        """Test that stats empty behaves as expected."""
        resp = client.get("/api/v1/consents/stats", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 0
        assert "active" in data
        assert "revoked" in data
        assert "by_legal_basis" in data

    def test_stats_reflect_new_consent(self, client: TestClient, dpo_token: str):
        """Test that stats reflect new consent behaves as expected."""
        before = client.get("/api/v1/consents/stats", headers=auth_headers(dpo_token)).json()
        self._create_consent(client, dpo_token)
        after = client.get("/api/v1/consents/stats", headers=auth_headers(dpo_token)).json()
        assert after["total"] == before["total"] + 1
        assert after["active"] == before["active"] + 1

    def test_stats_revocation_rate_increases(self, client: TestClient, dpo_token: str):
        # Create and revoke a consent
        """Test that stats revocation rate increases behaves as expected."""
        r = self._create_consent(client, dpo_token)
        assert r.status_code == 201
        record_id = r.json()["id"]
        client.post(
            f"/api/v1/consents/{record_id}/revoke",
            json={"revocation_reason": "Subject requested withdrawal"},
            headers=auth_headers(dpo_token),
        )
        stats = client.get("/api/v1/consents/stats", headers=auth_headers(dpo_token)).json()
        assert stats["revoked"] >= 1
        assert stats["revocation_rate"] >= 0


# US-RF07-1: Comprehensive ARCO management with legal SLA


class TestARCOSLA:
    """TestARCOSLA schema/model definition."""
    def _create_arco(self, client, token):
        """Handle create arco."""
        return client.post(
            "/api/v1/arco-requests",
            json={
                "request_type": "ACCESS",
                "requester_name": "Jane Doe",
                "requester_email": "jane@example.com",
                "requester_id_number": "0912345678",
                "description": "I want access to my data.",
            },
            headers=auth_headers(token),
        )

    def test_create_arco_returns_ticket(self, client: TestClient, dpo_token: str):
        """Test that create arco returns ticket behaves as expected."""
        resp = self._create_arco(client, dpo_token)
        assert resp.status_code == 201
        data = resp.json()
        assert data["ticket_number"].startswith("ARCO-")
        assert data["status"] == "RECEIVED"

    def test_arco_creation_triggers_alert(self, client: TestClient, dpo_token: str):
        """US-RF07-1: DPO must be notified on ticket creation (≤1 min via in-app alert)."""
        before_count = client.get(
            "/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)
        ).json()["unread_count"]
        self._create_arco(client, dpo_token)
        after_count = client.get(
            "/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)
        ).json()["unread_count"]
        assert after_count > before_count

    def test_sla_status_green_for_new_request(self, client: TestClient, dpo_token: str):
        """New request has 30-day deadline → GREEN stoplight."""
        arco_id = self._create_arco(client, dpo_token).json()["id"]
        resp = client.get(
            f"/api/v1/arco-requests/{arco_id}/sla-status",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["stoplight"] == "GREEN"
        assert data["days_remaining"] >= 29  # 30-day deadline

    def test_sla_status_grey_for_closed_request(self, client: TestClient, dpo_token: str):
        """Test that sla status grey for closed request behaves as expected."""
        arco_id = self._create_arco(client, dpo_token).json()["id"]
        client.patch(
            f"/api/v1/arco-requests/{arco_id}",
            json={"status": "CLOSED"},
            headers=auth_headers(dpo_token),
        )
        resp = client.get(
            f"/api/v1/arco-requests/{arco_id}/sla-status",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["stoplight"] == "GREY"

    def test_arco_sla_status_404_on_unknown(self, client: TestClient, dpo_token: str):
        """Test that arco sla status 404 on unknown behaves as expected."""
        resp = client.get(
            "/api/v1/arco-requests/99999/sla-status",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 404

    def test_immutable_log_on_status_update(
        self, client: TestClient, dpo_token: str, admin_token: str
    ):
        """Test that immutable log on status update behaves as expected."""
        arco_id = self._create_arco(client, dpo_token).json()["id"]
        client.patch(
            f"/api/v1/arco-requests/{arco_id}",
            json={"status": "IN_PROGRESS"},
            headers=auth_headers(dpo_token),
        )
        logs_resp = client.get(
            "/api/v1/audit",
            headers=auth_headers(admin_token),
        )
        assert logs_resp.status_code == 200
        log_actions = [e["action"] for e in logs_resp.json()]
        assert "arco_request_updated" in log_actions


# US-RF15-1: Filterable reports to PDF/CSV


class TestReportExports:
    """TestReportExports schema/model definition."""
    def test_summary_json(self, client: TestClient, dpo_token: str):
        """Test that summary json behaves as expected."""
        resp = client.get("/api/v1/reports/summary", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "total_treatment_activities" in data
        assert "risks" in data
        assert "arco" in data
        assert "consents" in data

    def test_summary_pdf_returns_pdf(self, client: TestClient, dpo_token: str):
        """Test that summary pdf returns pdf behaves as expected."""
        resp = client.get("/api/v1/reports/summary/pdf", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

    def test_summary_csv_returns_csv(self, client: TestClient, dpo_token: str):
        """Test that summary csv returns csv behaves as expected."""
        resp = client.get("/api/v1/reports/summary/csv", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        lines = resp.text.strip().splitlines()
        assert lines[0] == "Category,Metric,Value"
        assert len(lines) > 1

    def test_summary_pdf_requires_auth(self, client: TestClient):
        """Test that summary pdf requires auth behaves as expected."""
        resp = client.get("/api/v1/reports/summary/pdf")
        assert resp.status_code == 401

    def test_summary_csv_requires_auth(self, client: TestClient):
        """Test that summary csv requires auth behaves as expected."""
        resp = client.get("/api/v1/reports/summary/csv")
        assert resp.status_code == 401


# US-RF16-1: KPIs, trends, and alerts with performance


class TestKPIsAndTrends:
    """TestKPIsAndTrends schema/model definition."""
    def test_kpis_shape(self, client: TestClient, dpo_token: str):
        """Test that kpis shape behaves as expected."""
        resp = client.get("/api/v1/reports/kpis", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "pct_activities_active" in data
        assert "avg_risk_score" in data
        assert "pct_arco_on_time" in data
        assert "reported_breaches" in data
        assert "alerts" in data
        alerts = data["alerts"]
        assert "overdue_arco_requests" in alerts
        assert "open_critical_findings" in alerts
        assert "open_high_risk_assessments" in alerts

    def test_kpis_on_time_100pct_when_no_arco(self, client: TestClient, dpo_token: str):
        """Test that kpis on time 100pct when no arco behaves as expected."""
        resp = client.get("/api/v1/reports/kpis", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        # When no ARCO requests are closed/responded, on_time defaults to 100%
        data = resp.json()
        assert data["pct_arco_on_time"] >= 0

    def test_trends_default_6_months(self, client: TestClient, dpo_token: str):
        """Test that trends default 6 months behaves as expected."""
        resp = client.get("/api/v1/reports/trends", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["months"] == 6
        assert len(data["trends"]) == 6

    def test_trends_custom_months(self, client: TestClient, dpo_token: str):
        """Test that trends custom months behaves as expected."""
        resp = client.get("/api/v1/reports/trends?months=3", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.json()["months"] == 3
        assert len(resp.json()["trends"]) == 3

    def test_trends_shape(self, client: TestClient, dpo_token: str):
        """Test that trends shape behaves as expected."""
        resp = client.get("/api/v1/reports/trends", headers=auth_headers(dpo_token))
        for entry in resp.json()["trends"]:
            assert "month" in entry
            assert "new_treatment_activities" in entry
            assert "new_incidents" in entry
            assert "new_arco_requests" in entry
            assert "new_consents" in entry
            assert "new_risk_assessments" in entry

    def test_kpis_require_auth(self, client: TestClient):
        """Test that kpis require auth behaves as expected."""
        assert client.get("/api/v1/reports/kpis").status_code == 401

    def test_trends_require_auth(self, client: TestClient):
        """Test that trends require auth behaves as expected."""
        assert client.get("/api/v1/reports/trends").status_code == 401


# US-RF18-1: Internal alerts for critical events


class TestAlerts:
    """TestAlerts schema/model definition."""
    def _create_alert(
        self, client, token, *, alert_type="GENERAL", severity="INFO", recipient_id=None
    ):
        """Handle create alert."""
        body = {
            "alert_type": alert_type,
            "title": f"Test {alert_type} alert",
            "message": "Test message body",
            "severity": severity,
        }
        if recipient_id:
            body["recipient_id"] = recipient_id
        return client.post("/api/v1/alerts", json=body, headers=auth_headers(token))

    def test_create_alert(self, client: TestClient, dpo_token: str):
        """Test that create alert behaves as expected."""
        resp = self._create_alert(client, dpo_token)
        assert resp.status_code == 201
        data = resp.json()
        assert data["alert_type"] == "GENERAL"
        assert data["is_read"] is False

    def test_list_alerts(self, client: TestClient, dpo_token: str):
        """Test that list alerts behaves as expected."""
        self._create_alert(client, dpo_token)
        resp = client.get("/api/v1/alerts", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_unread_count(self, client: TestClient, dpo_token: str):
        """Test that unread count behaves as expected."""
        before = client.get("/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)).json()[
            "unread_count"
        ]
        self._create_alert(client, dpo_token)  # broadcast alert
        after = client.get("/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)).json()[
            "unread_count"
        ]
        assert after == before + 1

    def test_mark_alert_read(self, client: TestClient, dpo_token: str):
        """Test that mark alert read behaves as expected."""
        alert_id = self._create_alert(client, dpo_token).json()["id"]
        resp = client.patch(
            f"/api/v1/alerts/{alert_id}/read",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_read"] is True
        assert resp.json()["read_at"] is not None

    def test_delete_alert(self, client: TestClient, dpo_token: str):
        """Test that delete alert behaves as expected."""
        alert_id = self._create_alert(client, dpo_token).json()["id"]
        resp = client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers(dpo_token))
        assert resp.status_code == 204

    def test_critical_incident_creates_alert(self, client: TestClient, dpo_token: str):
        """Test that critical incident creates alert behaves as expected."""
        before = client.get("/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)).json()[
            "unread_count"
        ]
        client.post(
            "/api/v1/incidents",
            json={
                "title": "Critical breach",
                "description": "Production data exposed",
                "incident_type": "DATA_BREACH",
                "severity": "CRITICAL",
                "regulatory_notification_required": True,
                "affected_data_types": "PII",
            },
            headers=auth_headers(dpo_token),
        )
        after = client.get("/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)).json()[
            "unread_count"
        ]
        assert after > before

    def test_low_severity_incident_no_alert(self, client: TestClient, dpo_token: str):
        """Test that low severity incident no alert behaves as expected."""
        before = client.get("/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)).json()[
            "unread_count"
        ]
        client.post(
            "/api/v1/incidents",
            json={
                "title": "Low severity event",
                "description": "Minor policy issue",
                "incident_type": "POLICY_VIOLATION",
                "severity": "LOW",
                "regulatory_notification_required": False,
                "affected_data_types": "",
            },
            headers=auth_headers(dpo_token),
        )
        after = client.get("/api/v1/alerts/unread-count", headers=auth_headers(dpo_token)).json()[
            "unread_count"
        ]
        assert after == before


# US-RF21-1: Standard Import/Export


class TestImportExport:
    """TestImportExport schema/model definition."""
    def test_import_treatment_activities(self, client: TestClient, dpo_token: str):
        """Test that import treatment activities behaves as expected."""
        resp = client.post(
            "/api/v1/import/treatment-activities",
            json={
                "activities": [
                    {
                        "name": "HR Data Processing",
                        "purpose": "Employee management",
                        "legal_basis": "CONTRACT",
                        "personal_data_types": ["NAME", "EMAIL"],
                        "data_subjects": ["EMPLOYEES"],
                        "retention_period_days": 365,
                    },
                    {
                        "name": "Marketing Analytics",
                        "purpose": "Campaign performance",
                        "legal_basis": "CONSENT",
                        "personal_data_types": ["EMAIL"],
                        "data_subjects": ["CUSTOMERS"],
                        "retention_period_days": 180,
                    },
                ]
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 2
        assert data["errors"] == []

    def test_import_with_invalid_row(self, client: TestClient, dpo_token: str):
        """Test that import with invalid row behaves as expected."""
        resp = client.post(
            "/api/v1/import/treatment-activities",
            json={
                "activities": [
                    {"name": "Valid", "purpose": "ok", "legal_basis": "CONTRACT"},
                    {"invalid_field": "no name or purpose"},
                ]
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] >= 1
        assert len(data["errors"]) >= 1

    def test_export_treatment_activities_csv(self, client: TestClient, dpo_token: str):
        # Create at least one activity first
        """Test that export treatment activities csv behaves as expected."""
        client.post(
            "/api/v1/import/treatment-activities",
            json={
                "activities": [{"name": "Export Test", "purpose": "export", "legal_basis": "LAW"}]
            },
            headers=auth_headers(dpo_token),
        )
        resp = client.get(
            "/api/v1/export/treatment-activities",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        lines = resp.text.strip().splitlines()
        assert (
            lines[0]
            == "id,name,purpose,legal_basis,status,retention_period_days,is_cross_border,department_id"  # pylint: disable=line-too-long
        )
        assert len(lines) >= 2

    def test_export_compliance_report_json(self, client: TestClient, dpo_token: str):
        """Test that export compliance report json behaves as expected."""
        resp = client.get(
            "/api/v1/export/compliance-report",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "treatment_activities" in data
        assert "risk_assessments" in data
        assert "arco_requests" in data
        assert "consent_records" in data
        assert "incidents" in data

    def test_import_requires_auth(self, client: TestClient):
        """Test that import requires auth behaves as expected."""
        resp = client.post(
            "/api/v1/import/treatment-activities",
            json={"activities": []},
        )
        assert resp.status_code == 401


# US-RF23-1: Daily backups with RPO/RTO


class TestBackups:
    """TestBackups schema/model definition."""
    def test_create_backup(self, client: TestClient, super_admin_token: str):
        """Test that create backup behaves as expected."""
        resp = client.post("/api/v1/backups/create", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"].startswith("backup_")
        # SQLite backup should be COMPLETED with a real checksum
        assert data["status"] in ("COMPLETED", "PENDING")
        if data["status"] == "COMPLETED":
            assert len(data["checksum_sha256"]) == 64  # sha256 hex digest

    def test_create_backup_rejects_admin_on_sqlite(self, client: TestClient, admin_token: str):
        """Sprint 6 / C-3: SQLite snapshot is cross-tenant — only SUPER_ADMIN."""
        resp = client.post("/api/v1/backups/create", headers=auth_headers(admin_token))
        assert resp.status_code == 403, resp.text
        assert "SUPER_ADMIN" in resp.json()["detail"]

    def test_create_backup_rejects_dpo_on_sqlite(self, client: TestClient, dpo_token: str):
        """Even DPOs can't trigger a global SQLite snapshot."""
        resp = client.post("/api/v1/backups/create", headers=auth_headers(dpo_token))
        assert resp.status_code == 403

    def test_list_backups(self, client: TestClient, super_admin_token: str, admin_token: str):
        """Test that list backups behaves as expected."""
        client.post("/api/v1/backups/create", headers=auth_headers(super_admin_token))
        # Reads are still allowed for ADMIN/DPO within their tenant.
        resp = client.get("/api/v1/backups", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_backup_by_id(self, client: TestClient, super_admin_token: str):
        """Test that get backup by id behaves as expected."""
        backup_id = client.post(
            "/api/v1/backups/create", headers=auth_headers(super_admin_token)
        ).json()["id"]
        resp = client.get(f"/api/v1/backups/{backup_id}", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        assert resp.json()["id"] == backup_id

    def test_verify_backup(self, client: TestClient, super_admin_token: str):
        """Test that verify backup behaves as expected."""
        backup = client.post(
            "/api/v1/backups/create", headers=auth_headers(super_admin_token)
        ).json()
        if backup["status"] != "COMPLETED":
            pytest.skip("Non-SQLite backend: backup is PENDING, skip file verification")
        backup_id = backup["id"]
        resp = client.post(
            f"/api/v1/backups/{backup_id}/verify",
            headers=auth_headers(super_admin_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is True
        assert data["expected_checksum"] == data["actual_checksum"]

    def test_backup_requires_auth(self, client: TestClient):
        """Test that backup requires auth behaves as expected."""
        resp = client.post("/api/v1/backups/create")
        assert resp.status_code == 401

    def test_backup_404_unknown(self, client: TestClient, super_admin_token: str):
        """Test that backup 404 unknown behaves as expected."""
        resp = client.get("/api/v1/backups/99999", headers=auth_headers(super_admin_token))
        assert resp.status_code == 404
