"""Sprint 4 tests: US-RF05-1, US-RF12-1, US-RF13-1, US-RF14-1, US-RF20-1,
US-RF25-1, US-RF32-1, US-RF33-1, US-RF34-1, US-RF42-1.
"""
# pylint: disable=missing-class-docstring,missing-function-docstring,unused-argument,line-too-long

from fastapi.testclient import TestClient

from tests.conftest import auth_headers

# ─────────────────────────────────────────────────────────────────────────────
# US-RF05-1: Catalog automatic classification
# ─────────────────────────────────────────────────────────────────────────────

class TestCatalogAutoClassification:
    def test_bulk_load_auto_classifies_known_codes(self, client: TestClient, dpo_token: str):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": [
                {"type": "DATA_CATEGORY", "code": "HEALTH_DATA", "label": "Health Data"},
                {"type": "DATA_CATEGORY", "code": "EMAIL", "label": "Email Address"},
                {"type": "DATA_CATEGORY", "code": "NATIONAL_ID", "label": "National ID"},
            ]},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        health = next(e for e in data if e["code"] == "HEALTH_DATA")
        email = next(e for e in data if e["code"] == "EMAIL")
        nid = next(e for e in data if e["code"] == "NATIONAL_ID")
        assert health["sensitivity"] == "SENSITIVE"
        assert health["criticality"] == "HIGH"
        assert email["sensitivity"] == "ORDINARY"
        assert email["criticality"] == "MEDIUM"
        assert nid["sensitivity"] == "ORDINARY"
        assert nid["criticality"] == "HIGH"

    def test_bulk_load_unknown_code_no_classification(self, client: TestClient, dpo_token: str):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": [{"type": "DATA_CATEGORY", "code": "CUSTOM_FIELD", "label": "Custom"}]},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        entry = resp.json()[0]
        assert entry["sensitivity"] is None
        assert entry["criticality"] is None

    def test_version_starts_at_one(self, client: TestClient, dpo_token: str):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": [{"type": "DATA_CATEGORY", "code": "VER_TEST", "label": "Version Test"}]},
            headers=auth_headers(dpo_token),
        )
        assert resp.json()[0]["version"] == 1


# ─────────────────────────────────────────────────────────────────────────────
# US-RF20-1: Editable and versioned catalogs
# ─────────────────────────────────────────────────────────────────────────────

class TestCatalogVersioning:
    def _create_entry(self, client, dpo_token):
        resp = client.post(
            "/api/v1/catalogs/bulk-load",
            json={"entries": [{"type": "DATA_CATEGORY", "code": "RF20_ENTRY", "label": "Original"}]},
            headers=auth_headers(dpo_token),
        )
        return resp.json()[0]

    def test_patch_increments_version(self, client: TestClient, dpo_token: str):
        entry = self._create_entry(client, dpo_token)
        entry_id = entry["id"]
        resp = client.patch(
            f"/api/v1/catalogs/{entry_id}",
            json={"label": "Updated Label"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["version"] == 2
        assert resp.json()["label"] == "Updated Label"

    def test_patch_set_classification(self, client: TestClient, dpo_token: str):
        entry = self._create_entry(client, dpo_token)
        entry_id = entry["id"]
        resp = client.patch(
            f"/api/v1/catalogs/{entry_id}",
            json={"sensitivity": "SENSITIVE", "criticality": "HIGH"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["sensitivity"] == "SENSITIVE"
        assert resp.json()["criticality"] == "HIGH"

    def test_patch_invalid_sensitivity_rejected(self, client: TestClient, dpo_token: str):
        entry = self._create_entry(client, dpo_token)
        resp = client.patch(
            f"/api/v1/catalogs/{entry['id']}",
            json={"sensitivity": "INVALID"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 400

    def test_patch_cross_tenant_denied(self, client: TestClient, dpo_token: str, tenant_b_token: str):
        entry = self._create_entry(client, dpo_token)
        resp = client.patch(
            f"/api/v1/catalogs/{entry['id']}",
            json={"label": "Hack"},
            headers=auth_headers(tenant_b_token),
        )
        # Tenant B user (ADMIN role) has "u" permission on catalogs but
        # the entry belongs to tenant A — returns 404 from tenant filter
        assert resp.status_code in (403, 404)


# ─────────────────────────────────────────────────────────────────────────────
# US-RF32-1: Explicit and immutable consent revocation
# ─────────────────────────────────────────────────────────────────────────────

class TestConsentRevocation:
    def _create_consent(self, client, dpo_token, token="subj-001"):
        return client.post(
            "/api/v1/consents",
            json={
                "data_subject_token": token,
                "legal_basis": "CONSENT",
                "purpose": "Marketing emails",
                "is_sensitive": False,
            },
            headers=auth_headers(dpo_token),
        )

    def test_create_consent(self, client: TestClient, dpo_token: str):
        resp = self._create_consent(client, dpo_token)
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_revoked"] is False
        assert data["revoked_at"] is None

    def test_revoke_consent_immutable(self, client: TestClient, dpo_token: str):
        r = self._create_consent(client, dpo_token, "subj-revoke-001")
        cid = r.json()["id"]
        resp = client.post(
            f"/api/v1/consents/{cid}/revoke",
            json={"revocation_reason": "Subject withdrew consent"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_revoked"] is True
        assert resp.json()["revoked_at"] is not None

    def test_revoke_twice_rejected(self, client: TestClient, dpo_token: str):
        r = self._create_consent(client, dpo_token, "subj-revoke-002")
        cid = r.json()["id"]
        client.post(f"/api/v1/consents/{cid}/revoke", json={}, headers=auth_headers(dpo_token))
        resp = client.post(f"/api/v1/consents/{cid}/revoke", json={}, headers=auth_headers(dpo_token))
        assert resp.status_code == 400

    def test_sensitive_consent_flag(self, client: TestClient, dpo_token: str):
        resp = client.post(
            "/api/v1/consents",
            json={"data_subject_token": "subj-sens-001", "legal_basis": "EXPLICIT_CONSENT",
                  "purpose": "Health processing", "is_sensitive": True},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json()["is_sensitive"] is True

    def test_list_filter_revoked(self, client: TestClient, dpo_token: str):
        self._create_consent(client, dpo_token, "filter-001")
        r = self._create_consent(client, dpo_token, "filter-002")
        client.post(f"/api/v1/consents/{r.json()['id']}/revoke", json={}, headers=auth_headers(dpo_token))
        resp = client.get("/api/v1/consents?is_revoked=true", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert all(c["is_revoked"] for c in resp.json())

    def test_cross_tenant_isolation(self, client: TestClient, dpo_token: str, tenant_b_token: str):
        r = self._create_consent(client, dpo_token, "iso-subj-001")
        cid = r.json()["id"]
        resp = client.get(f"/api/v1/consents/{cid}", headers=auth_headers(tenant_b_token))
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# US-RF25-1: Cookie banner versioning
# ─────────────────────────────────────────────────────────────────────────────

class TestCookieBanners:
    def _create_banner(self, client, dpo_token, version="1.0"):
        return client.post(
            "/api/v1/cookie-banners",
            json={"version": version, "content": "We use cookies.", "effective_date": "2024-01-01T00:00:00"},
            headers=auth_headers(dpo_token),
        )

    def test_create_banner(self, client: TestClient, dpo_token: str):
        resp = self._create_banner(client, dpo_token)
        assert resp.status_code == 201
        assert resp.json()["version"] == "1.0"

    def test_list_banners(self, client: TestClient, dpo_token: str):
        self._create_banner(client, dpo_token, "list-1.0")
        resp = client.get("/api/v1/cookie-banners", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_record_cookie_consent(self, client: TestClient, dpo_token: str):
        banner_id = self._create_banner(client, dpo_token, "consent-1.0").json()["id"]
        resp = client.post(
            "/api/v1/cookie-consents",
            json={"banner_id": banner_id, "data_subject_token": "cookie-subj-001"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        assert resp.json()["is_revoked"] is False

    def test_revoke_cookie_consent(self, client: TestClient, dpo_token: str):
        banner_id = self._create_banner(client, dpo_token, "revoke-1.0").json()["id"]
        consent_id = client.post(
            "/api/v1/cookie-consents",
            json={"banner_id": banner_id, "data_subject_token": "cookie-revoke-001"},
            headers=auth_headers(dpo_token),
        ).json()["id"]
        resp = client.post(
            f"/api/v1/cookie-consents/{consent_id}/revoke",
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_revoked"] is True


# ─────────────────────────────────────────────────────────────────────────────
# US-RF14-1 + US-RF33-1: Parameterized legal document generation
# ─────────────────────────────────────────────────────────────────────────────

class TestLegalDocuments:
    def _create_doc(self, client, dpo_token, doc_type="PRIVACY_POLICY", version="1.0"):
        return client.post(
            "/api/v1/legal-documents",
            json={
                "doc_type": doc_type,
                "title": f"Privacy Policy v{version}",
                "version": version,
                "effective_date": "2024-01-01",
                "parameters": {"company_name": "Acme SA", "dpo_name": "Jane Doe"},
            },
            headers=auth_headers(dpo_token),
        )

    def test_create_privacy_policy(self, client: TestClient, dpo_token: str):
        resp = self._create_doc(client, dpo_token)
        assert resp.status_code == 201
        assert resp.json()["doc_type"] == "PRIVACY_POLICY"
        assert resp.json()["is_current"] is True

    def test_new_version_supersedes_old(self, client: TestClient, dpo_token: str):
        v1_id = self._create_doc(client, dpo_token, version="1.0").json()["id"]
        self._create_doc(client, dpo_token, version="2.0")
        resp = client.get(f"/api/v1/legal-documents/{v1_id}", headers=auth_headers(dpo_token))
        assert resp.json()["is_current"] is False

    def test_template_types_endpoint(self, client: TestClient, dpo_token: str):
        resp = client.get("/api/v1/legal-documents/template-types", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        types = {t["doc_type"] for t in resp.json()}
        # US-RF14-1 core types
        assert "PRIVACY_POLICY" in types
        assert "SECURITY_POLICY" in types
        assert "COOKIE_NOTICE" in types
        # US-RF33-1 expanded types
        assert "CUSTOMER_NOTICE" in types
        assert "CONTRACTUAL_CLAUSE" in types
        assert "PROCESSOR_CONTRACT" in types

    def test_expanded_template_types(self, client: TestClient, dpo_token: str):
        for doc_type in ["CUSTOMER_NOTICE", "CONTRACTUAL_CLAUSE", "PROCESSOR_CONTRACT"]:
            resp = self._create_doc(client, dpo_token, doc_type=doc_type)
            assert resp.status_code == 201, f"Failed for {doc_type}: {resp.json()}"

    def test_invalid_doc_type_rejected(self, client: TestClient, dpo_token: str):
        resp = client.post(
            "/api/v1/legal-documents",
            json={"doc_type": "INVALID_TYPE", "title": "Bad", "version": "1.0",
                  "effective_date": "2024-01-01"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 400

    def test_pdf_download(self, client: TestClient, dpo_token: str):
        doc_id = self._create_doc(client, dpo_token, version="pdf-1.0").json()["id"]
        resp = client.get(f"/api/v1/legal-documents/{doc_id}/pdf", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        # PDF magic bytes
        assert resp.content[:4] == b"%PDF"

    def test_list_current_only(self, client: TestClient, dpo_token: str):
        for v in ["cur-1.0", "cur-2.0"]:
            self._create_doc(client, dpo_token, doc_type="SECURITY_POLICY", version=v)
        resp = client.get("/api/v1/legal-documents?current_only=true", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        sp_docs = [d for d in resp.json() if d["doc_type"] == "SECURITY_POLICY"]
        assert len(sp_docs) == 1


# ─────────────────────────────────────────────────────────────────────────────
# US-RF13-1: Audit planning, findings, and PDF report
# ─────────────────────────────────────────────────────────────────────────────

class TestAuditPlans:
    def _create_plan(self, client, token, name="Test Audit"):
        return client.post(
            "/api/v1/audit-plans",
            json={"name": name, "scope": "All data processing activities"},
            headers=auth_headers(token),
        )

    def test_create_audit_plan(self, client: TestClient, auditor_token: str):
        resp = self._create_plan(client, auditor_token)
        assert resp.status_code == 201
        assert resp.json()["status"] == "PLANNED"

    def test_update_plan_status(self, client: TestClient, auditor_token: str):
        plan_id = self._create_plan(client, auditor_token).json()["id"]
        resp = client.patch(
            f"/api/v1/audit-plans/{plan_id}",
            json={"status": "IN_PROGRESS"},
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROGRESS"

    def test_create_finding(self, client: TestClient, auditor_token: str):
        plan_id = self._create_plan(client, auditor_token, "Finding Test Audit").json()["id"]
        resp = client.post(
            "/api/v1/audit-plans/findings",
            json={
                "audit_plan_id": plan_id,
                "title": "Encryption not applied to backups",
                "severity": "HIGH",
                "evidence": "Backup files found unencrypted on NAS",
                "description": "Backup storage does not encrypt at rest",
            },
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 201
        assert resp.json()["severity"] == "HIGH"
        assert resp.json()["status"] == "OPEN"

    def test_list_findings(self, client: TestClient, auditor_token: str):
        plan_id = self._create_plan(client, auditor_token, "List Findings Audit").json()["id"]
        client.post(
            "/api/v1/audit-plans/findings",
            json={"audit_plan_id": plan_id, "title": "F1", "severity": "MEDIUM"},
            headers=auth_headers(auditor_token),
        )
        resp = client.get(f"/api/v1/audit-plans/{plan_id}/findings", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_finding_severity_filter(self, client: TestClient, auditor_token: str):
        plan_id = self._create_plan(client, auditor_token, "Severity Filter Audit").json()["id"]
        for sev in ["CRITICAL", "LOW", "INFO"]:
            client.post(
                "/api/v1/audit-plans/findings",
                json={"audit_plan_id": plan_id, "title": f"F-{sev}", "severity": sev},
                headers=auth_headers(auditor_token),
            )
        resp = client.get(
            f"/api/v1/audit-plans/{plan_id}/findings?severity=CRITICAL",
            headers=auth_headers(auditor_token),
        )
        assert resp.status_code == 200
        assert all(f["severity"] == "CRITICAL" for f in resp.json())

    def test_pdf_report_download(self, client: TestClient, auditor_token: str):
        plan_id = self._create_plan(client, auditor_token, "PDF Report Audit").json()["id"]
        client.post(
            "/api/v1/audit-plans/findings",
            json={"audit_plan_id": plan_id, "title": "PDF Finding", "severity": "HIGH",
                  "evidence": "Screenshot of error"},
            headers=auth_headers(auditor_token),
        )
        resp = client.get(f"/api/v1/audit-plans/{plan_id}/report", headers=auth_headers(auditor_token))
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

    def test_cross_tenant_plan_isolation(self, client: TestClient, auditor_token: str, tenant_b_token: str):
        plan_id = self._create_plan(client, auditor_token).json()["id"]
        resp = client.get(f"/api/v1/audit-plans/{plan_id}", headers=auth_headers(tenant_b_token))
        assert resp.status_code in (403, 404)


# ─────────────────────────────────────────────────────────────────────────────
# US-RF12-1: Remediations with risk impact
# ─────────────────────────────────────────────────────────────────────────────

class TestRemediations:
    def _create_treatment_activity(self, client, dpo_token):
        resp = client.post(
            "/api/v1/treatment-activities",
            json={
                "name": "Remediation TA",
                "legal_basis": "CONSENT",
                "purpose": "Testing",
                "personal_data_types": ["Email"],
            },
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201, resp.json()
        return resp.json()["id"]

    def _create_risk_assessment(self, client, dpo_token, ta_id):
        resp = client.post(
            "/api/v1/risk-assessments",
            json={
                "treatment_activity_id": ta_id,
                "responses": {"q1": True, "q2": True},
                "probability": 4,
                "impact": 5,
            },
            headers=auth_headers(dpo_token),
        )
        return resp.json()

    def test_create_remediation_snapshots_risk(self, client: TestClient, dpo_token: str):
        ta_id = self._create_treatment_activity(client, dpo_token)
        ra = self._create_risk_assessment(client, dpo_token, ta_id)
        resp = client.post(
            "/api/v1/remediations",
            json={"risk_assessment_id": ra["id"], "title": "Implement encryption"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["risk_score_before"] == ra["risk_score"]
        assert data["risk_level_before"] == ra["risk_level"]
        assert data["status"] == "OPEN"

    def test_update_remediation_with_after_score(self, client: TestClient, dpo_token: str):
        ta_id = self._create_treatment_activity(client, dpo_token)
        ra = self._create_risk_assessment(client, dpo_token, ta_id)
        rem_id = client.post(
            "/api/v1/remediations",
            json={"risk_assessment_id": ra["id"], "title": "Apply patch"},
            headers=auth_headers(dpo_token),
        ).json()["id"]
        resp = client.patch(
            f"/api/v1/remediations/{rem_id}",
            json={"status": "COMPLETED", "risk_score_after": 4, "risk_level_after": "LOW"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "COMPLETED"
        assert resp.json()["risk_score_after"] == 4
        assert resp.json()["risk_level_after"] == "LOW"

    def test_remediation_nonexistent_ra(self, client: TestClient, dpo_token: str):
        resp = client.post(
            "/api/v1/remediations",
            json={"risk_assessment_id": 999999, "title": "Ghost"},
            headers=auth_headers(dpo_token),
        )
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# US-RF34-1: Economic sector configuration
# ─────────────────────────────────────────────────────────────────────────────

class TestSectors:
    def test_list_sectors(self, client: TestClient, admin_token: str):
        resp = client.get("/api/v1/sectors", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        codes = {s["sector_code"] for s in resp.json()}
        assert "HEALTH" in codes
        assert "EDUCATION" in codes
        assert "FINANCE" in codes

    def test_get_sector_suggestions(self, client: TestClient, admin_token: str):
        resp = client.get("/api/v1/sectors/HEALTH", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["sector_code"] == "HEALTH"
        assert "Health Data" in data["suggested_data_types"]
        assert "PRIVACY_POLICY" in data["suggested_templates"]

    def test_update_company_sector(self, client: TestClient, admin_token: str):
        resp = client.patch(
            "/api/v1/sectors/company/sector",
            json={"sector": "FINANCE"},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 200
        assert resp.json()["sector"] == "FINANCE"
        assert "suggestions" in resp.json()

    def test_invalid_sector_rejected(self, client: TestClient, admin_token: str):
        resp = client.patch(
            "/api/v1/sectors/company/sector",
            json={"sector": "UNKNOWN_SECTOR"},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 400

    def test_unknown_sector_code_404(self, client: TestClient, admin_token: str):
        resp = client.get("/api/v1/sectors/NOTEXIST", headers=auth_headers(admin_token))
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# US-RF42-1: Consolidated summary report
# ─────────────────────────────────────────────────────────────────────────────

class TestSummaryReport:
    def test_summary_report_structure(self, client: TestClient, dpo_token: str):
        resp = client.get("/api/v1/reports/summary", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        data = resp.json()
        # Verify top-level keys
        assert "risks" in data
        assert "arco" in data
        assert "incidents" in data
        assert "action_plans" in data
        assert "audits" in data
        assert "consents" in data
        assert "total_legal_documents" in data
        assert "total_dpias" in data
        assert "open_remediations" in data

    def test_summary_reflects_created_data(self, client: TestClient, dpo_token: str):
        # Create a consent
        client.post(
            "/api/v1/consents",
            json={"data_subject_token": "summ-subj-001", "legal_basis": "CONSENT",
                  "purpose": "Testing", "is_sensitive": False},
            headers=auth_headers(dpo_token),
        )
        resp = client.get("/api/v1/reports/summary", headers=auth_headers(dpo_token))
        assert resp.status_code == 200
        assert resp.json()["consents"]["total"] >= 1

    def test_auditor_can_access_summary(self, client: TestClient, auditor_token: str):
        resp = client.get("/api/v1/reports/summary", headers=auth_headers(auditor_token))
        assert resp.status_code == 200

    def test_summary_cross_tenant_isolation(self, client: TestClient, dpo_token: str, tenant_b_token: str):
        # Create data for tenant A
        client.post(
            "/api/v1/consents",
            json={"data_subject_token": "a-isolation-001", "legal_basis": "CONSENT",
                  "purpose": "Test isolation", "is_sensitive": False},
            headers=auth_headers(dpo_token),
        )
        resp_a = client.get("/api/v1/reports/summary", headers=auth_headers(dpo_token))
        resp_b = client.get("/api/v1/reports/summary", headers=auth_headers(tenant_b_token))
        # Tenant B should have fewer or equal consents than tenant A
        assert resp_b.json()["consents"]["total"] <= resp_a.json()["consents"]["total"]
