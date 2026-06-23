"""Reports module: consolidated summaries, KPIs, 6-month trends, PDF/CSV export.

Covers:
- US-RF42-1: Consolidated summary report
- US-RF15-1: Filterable reports to PDF/CSV
- US-RF16-1: KPIs, trends, and alerts with performance
"""

import csv
import io
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from fpdf import FPDF
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.action_plan import ActionPlan
from app.models.arco_request import ARCORequest
from app.models.audit_plan import AuditFinding, AuditPlan
from app.models.consent import ConsentRecord
from app.models.dpia import DPIAssessment
from app.models.incident import Incident
from app.models.legal_document import LegalDocument
from app.models.remediation import Remediation
from app.models.risk_assessment import RiskAssessment
from app.models.treatment_activity import TreatmentActivity
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


# ── Shared schemas ────────────────────────────────────────────────────────────

class RiskSummary(BaseModel):
    total: int
    high: int
    medium: int
    low: int


class ARCOSummary(BaseModel):
    total: int
    open: int
    completed: int


class IncidentSummary(BaseModel):
    total: int
    open: int
    regulatory_notification_required: int


class ActionPlanSummary(BaseModel):
    total: int
    draft: int
    active: int
    completed: int


class AuditSummary(BaseModel):
    total_plans: int
    open_findings: int
    critical_findings: int


class ConsentSummary(BaseModel):
    total: int
    active: int
    revoked: int
    sensitive: int


class ConsolidatedSummaryReport(BaseModel):
    tenant_id: int
    total_treatment_activities: int
    risks: RiskSummary
    arco: ARCOSummary
    incidents: IncidentSummary
    action_plans: ActionPlanSummary
    audits: AuditSummary
    consents: ConsentSummary
    total_legal_documents: int
    total_dpias: int
    open_remediations: int


# ── US-RF42-1: Consolidated summary ──────────────────────────────────────────

@router.get("/summary", response_model=ConsolidatedSummaryReport)
def get_summary_report(
    current_user: Annotated[User, Depends(require_permission("reports", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Consolidated compliance summary report (US-RF42-1)."""

    def count(model, **filters):
        q = db.query(model).filter(model.tenant_id == tenant_id)
        for attr, val in filters.items():
            q = q.filter(getattr(model, attr) == val)
        return q.count()

    total_ra = count(RiskAssessment)
    ra_high = count(RiskAssessment, risk_level="HIGH")
    ra_medium = count(RiskAssessment, risk_level="MEDIUM")
    ra_low = count(RiskAssessment, risk_level="LOW")

    total_arco = count(ARCORequest)
    arco_open = db.query(ARCORequest).filter(
        ARCORequest.tenant_id == tenant_id,
        ARCORequest.status.notin_(["CLOSED", "REJECTED"]),
    ).count()
    arco_completed = count(ARCORequest, status="CLOSED")

    total_incidents = count(Incident)
    incidents_open = db.query(Incident).filter(
        Incident.tenant_id == tenant_id,
        Incident.status.notin_(["CLOSED", "FALSE_POSITIVE"]),
    ).count()
    incidents_notif = db.query(Incident).filter(
        Incident.tenant_id == tenant_id,
        Incident.regulatory_notification_required == True,  # noqa: E712
    ).count()

    total_ap = count(ActionPlan)
    ap_draft = count(ActionPlan, status="DRAFT")
    ap_active = count(ActionPlan, status="ACTIVE")
    ap_completed = count(ActionPlan, status="COMPLETED")

    total_audit_plans = count(AuditPlan)
    open_findings = count(AuditFinding, status="OPEN")
    critical_findings = count(AuditFinding, severity="CRITICAL")

    total_consents = count(ConsentRecord)
    active_consents = count(ConsentRecord, is_revoked=False)
    revoked_consents = count(ConsentRecord, is_revoked=True)
    sensitive_consents = count(ConsentRecord, is_sensitive=True)

    total_docs = db.query(LegalDocument).filter(
        LegalDocument.tenant_id == tenant_id,
        LegalDocument.is_current == True,  # noqa: E712
    ).count()

    total_dpias = count(DPIAssessment)

    open_remediations = db.query(Remediation).filter(
        Remediation.tenant_id == tenant_id,
        Remediation.status.notin_(["COMPLETED", "CANCELLED"]),
    ).count()

    return ConsolidatedSummaryReport(
        tenant_id=tenant_id,
        total_treatment_activities=count(TreatmentActivity),
        risks=RiskSummary(total=total_ra, high=ra_high, medium=ra_medium, low=ra_low),
        arco=ARCOSummary(total=total_arco, open=arco_open, completed=arco_completed),
        incidents=IncidentSummary(
            total=total_incidents,
            open=incidents_open,
            regulatory_notification_required=incidents_notif,
        ),
        action_plans=ActionPlanSummary(
            total=total_ap, draft=ap_draft, active=ap_active, completed=ap_completed
        ),
        audits=AuditSummary(
            total_plans=total_audit_plans,
            open_findings=open_findings,
            critical_findings=critical_findings,
        ),
        consents=ConsentSummary(
            total=total_consents,
            active=active_consents,
            revoked=revoked_consents,
            sensitive=sensitive_consents,
        ),
        total_legal_documents=total_docs,
        total_dpias=total_dpias,
        open_remediations=open_remediations,
    )


# ── US-RF16-1: KPI dashboard ──────────────────────────────────────────────────

@router.get("/kpis")
def get_kpis(
    current_user: Annotated[User, Depends(require_permission("reports", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
) -> dict:
    """Key performance indicators for executive dashboard (US-RF16-1).

    Returns:
    - pct_activities_active: % of treatment activities with status ACTIVE
    - avg_risk_score: average risk_score across all risk assessments (1-25)
    - pct_arco_on_time: % of responded/closed ARCO requests answered before deadline
    - reported_breaches: count of HIGH or CRITICAL incidents
    - alerts: high-urgency items requiring attention
    """
    # % activities registered as ACTIVE
    total_ta = db.query(TreatmentActivity).filter(TreatmentActivity.tenant_id == tenant_id).count()
    active_ta = db.query(TreatmentActivity).filter(
        TreatmentActivity.tenant_id == tenant_id,
        TreatmentActivity.status == "ACTIVE",
    ).count()
    pct_active = round((active_ta / total_ta * 100), 1) if total_ta else 0.0

    # Average risk score
    ra_rows = db.query(RiskAssessment.risk_score).filter(RiskAssessment.tenant_id == tenant_id).all()
    avg_risk = round(sum(r.risk_score for r in ra_rows) / len(ra_rows), 2) if ra_rows else 0.0

    # On-time ARCO %: responded/closed requests where responded_at <= deadline_date
    terminal_arco = db.query(ARCORequest).filter(
        ARCORequest.tenant_id == tenant_id,
        ARCORequest.status.in_(["RESPONDED", "CLOSED"]),
    ).all()
    on_time = sum(
        1 for r in terminal_arco
        if r.responded_at is not None
        and r.responded_at.date() <= r.deadline_date
    )
    pct_arco_on_time = round((on_time / len(terminal_arco) * 100), 1) if terminal_arco else 100.0

    # Reported breaches (HIGH or CRITICAL incidents)
    reported_breaches = db.query(Incident).filter(
        Incident.tenant_id == tenant_id,
        Incident.severity.in_(["HIGH", "CRITICAL"]),
    ).count()

    # Alert items: overdue ARCO, open critical findings, open high-risk RAs
    today = date.today()
    overdue_arco = db.query(ARCORequest).filter(
        ARCORequest.tenant_id == tenant_id,
        ARCORequest.deadline_date < today,
        ARCORequest.status.notin_(["RESPONDED", "CLOSED", "REJECTED"]),
    ).count()

    critical_findings = db.query(AuditFinding).filter(
        AuditFinding.tenant_id == tenant_id,
        AuditFinding.severity == "CRITICAL",
        AuditFinding.status == "OPEN",
    ).count()

    high_risk_open = db.query(RiskAssessment).filter(
        RiskAssessment.tenant_id == tenant_id,
        RiskAssessment.risk_level == "HIGH",
        RiskAssessment.status.notin_(["CLOSED", "ACCEPTED"]),
    ).count()

    return {
        "pct_activities_active": pct_active,
        "avg_risk_score": avg_risk,
        "pct_arco_on_time": pct_arco_on_time,
        "reported_breaches": reported_breaches,
        "alerts": {
            "overdue_arco_requests": overdue_arco,
            "open_critical_findings": critical_findings,
            "open_high_risk_assessments": high_risk_open,
        },
    }


# ── US-RF16-1: 6-month trends ─────────────────────────────────────────────────

@router.get("/trends")
def get_trends(
    current_user: Annotated[User, Depends(require_permission("reports", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    months: int = Query(6, ge=1, le=24),
) -> dict:
    """Monthly trend data for the last N months (default 6) — US-RF16-1."""
    today = datetime.now(timezone.utc)
    result = []

    for i in range(months - 1, -1, -1):
        # First day of the month i months ago
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        period_start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            period_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            period_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        label = period_start.strftime("%Y-%m")

        def _count_in_period(model, date_col: str) -> int:
            col = getattr(model, date_col)
            return db.query(model).filter(
                model.tenant_id == tenant_id,
                col >= period_start,
                col < period_end,
            ).count()

        new_activities = _count_in_period(TreatmentActivity, "created_at")
        new_incidents = _count_in_period(Incident, "created_at")
        new_arco = _count_in_period(ARCORequest, "created_at")
        new_consents = _count_in_period(ConsentRecord, "granted_at")
        new_risks = _count_in_period(RiskAssessment, "created_at")

        result.append({
            "month": label,
            "new_treatment_activities": new_activities,
            "new_incidents": new_incidents,
            "new_arco_requests": new_arco,
            "new_consents": new_consents,
            "new_risk_assessments": new_risks,
        })

    return {"months": months, "trends": result}


# ── US-RF15-1: Filterable PDF/CSV reports ────────────────────────────────────

def _latin1(text: str) -> str:
    """Encode unicode string to latin-1, replacing unmappable chars."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _build_summary_pdf(data: ConsolidatedSummaryReport, generated_at: str) -> bytes:
    """Generate a PDF from the consolidated summary report."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    w = pdf.w - pdf.l_margin - pdf.r_margin

    pdf.set_font("Helvetica", "B", 18)
    pdf.multi_cell(w, 12, "COMPLIANCE SUMMARY REPORT", align="C")
    pdf.set_font("Helvetica", size=9)
    pdf.multi_cell(w, 6, f"Generated: {generated_at}  |  Tenant ID: {data.tenant_id}", align="C")
    pdf.ln(6)

    def section(title: str):
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(w, 8, title, ln=True, fill=True)
        pdf.set_font("Helvetica", size=10)

    def row(label: str, value):
        pdf.cell(w * 0.6, 6, _latin1(f"  {label}"), border=0)
        pdf.cell(w * 0.4, 6, str(value), ln=True)

    section("Treatment Activities")
    row("Total", data.total_treatment_activities)
    pdf.ln(2)

    section("Risk Assessments")
    row("Total", data.risks.total)
    row("HIGH", data.risks.high)
    row("MEDIUM", data.risks.medium)
    row("LOW", data.risks.low)
    pdf.ln(2)

    section("ARCO Requests")
    row("Total", data.arco.total)
    row("Open", data.arco.open)
    row("Completed", data.arco.completed)
    pdf.ln(2)

    section("Security Incidents")
    row("Total", data.incidents.total)
    row("Open", data.incidents.open)
    row("Regulatory notification required", data.incidents.regulatory_notification_required)
    pdf.ln(2)

    section("Consent Records")
    row("Total", data.consents.total)
    row("Active", data.consents.active)
    row("Revoked", data.consents.revoked)
    row("Sensitive", data.consents.sensitive)
    pdf.ln(2)

    section("Action Plans")
    row("Total", data.action_plans.total)
    row("Draft", data.action_plans.draft)
    row("Active", data.action_plans.active)
    row("Completed", data.action_plans.completed)
    pdf.ln(2)

    section("Audit Plans & Findings")
    row("Total Audit Plans", data.audits.total_plans)
    row("Open Findings", data.audits.open_findings)
    row("Critical Findings", data.audits.critical_findings)
    pdf.ln(2)

    section("Other")
    row("Legal Documents (current)", data.total_legal_documents)
    row("DPIAs", data.total_dpias)
    row("Open Remediations", data.open_remediations)

    return pdf.output()


@router.get("/summary/pdf")
def get_summary_pdf(
    current_user: Annotated[User, Depends(require_permission("reports", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Download the consolidated summary report as PDF (US-RF15-1)."""
    # Reuse summary logic inline
    def count(model, **filters):
        q = db.query(model).filter(model.tenant_id == tenant_id)
        for attr, val in filters.items():
            q = q.filter(getattr(model, attr) == val)
        return q.count()

    total_ra = count(RiskAssessment)
    arco_open = db.query(ARCORequest).filter(
        ARCORequest.tenant_id == tenant_id,
        ARCORequest.status.notin_(["CLOSED", "REJECTED"]),
    ).count()
    incidents_open = db.query(Incident).filter(
        Incident.tenant_id == tenant_id,
        Incident.status.notin_(["CLOSED", "FALSE_POSITIVE"]),
    ).count()
    open_remediations = db.query(Remediation).filter(
        Remediation.tenant_id == tenant_id,
        Remediation.status.notin_(["COMPLETED", "CANCELLED"]),
    ).count()
    total_docs = db.query(LegalDocument).filter(
        LegalDocument.tenant_id == tenant_id,
        LegalDocument.is_current == True,  # noqa: E712
    ).count()

    data = ConsolidatedSummaryReport(
        tenant_id=tenant_id,
        total_treatment_activities=count(TreatmentActivity),
        risks=RiskSummary(
            total=total_ra,
            high=count(RiskAssessment, risk_level="HIGH"),
            medium=count(RiskAssessment, risk_level="MEDIUM"),
            low=count(RiskAssessment, risk_level="LOW"),
        ),
        arco=ARCOSummary(
            total=count(ARCORequest),
            open=arco_open,
            completed=count(ARCORequest, status="CLOSED"),
        ),
        incidents=IncidentSummary(
            total=count(Incident),
            open=incidents_open,
            regulatory_notification_required=db.query(Incident).filter(
                Incident.tenant_id == tenant_id,
                Incident.regulatory_notification_required == True,  # noqa: E712
            ).count(),
        ),
        action_plans=ActionPlanSummary(
            total=count(ActionPlan),
            draft=count(ActionPlan, status="DRAFT"),
            active=count(ActionPlan, status="ACTIVE"),
            completed=count(ActionPlan, status="COMPLETED"),
        ),
        audits=AuditSummary(
            total_plans=count(AuditPlan),
            open_findings=count(AuditFinding, status="OPEN"),
            critical_findings=count(AuditFinding, severity="CRITICAL"),
        ),
        consents=ConsentSummary(
            total=count(ConsentRecord),
            active=count(ConsentRecord, is_revoked=False),
            revoked=count(ConsentRecord, is_revoked=True),
            sensitive=count(ConsentRecord, is_sensitive=True),
        ),
        total_legal_documents=total_docs,
        total_dpias=count(DPIAssessment),
        open_remediations=open_remediations,
    )

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    pdf_bytes = _build_summary_pdf(data, generated_at)

    filename = f"compliance_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


@router.get("/summary/csv")
def get_summary_csv(
    current_user: Annotated[User, Depends(require_permission("reports", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Download the consolidated summary report as CSV (US-RF15-1)."""
    def count(model, **filters):
        q = db.query(model).filter(model.tenant_id == tenant_id)
        for attr, val in filters.items():
            q = q.filter(getattr(model, attr) == val)
        return q.count()

    rows = [
        ["Category", "Metric", "Value"],
        ["Treatment Activities", "Total", count(TreatmentActivity)],
        ["Risk Assessments", "Total", count(RiskAssessment)],
        ["Risk Assessments", "HIGH", count(RiskAssessment, risk_level="HIGH")],
        ["Risk Assessments", "MEDIUM", count(RiskAssessment, risk_level="MEDIUM")],
        ["Risk Assessments", "LOW", count(RiskAssessment, risk_level="LOW")],
        ["ARCO Requests", "Total", count(ARCORequest)],
        ["ARCO Requests", "Open", db.query(ARCORequest).filter(
            ARCORequest.tenant_id == tenant_id,
            ARCORequest.status.notin_(["CLOSED", "REJECTED"]),
        ).count()],
        ["ARCO Requests", "Closed", count(ARCORequest, status="CLOSED")],
        ["Incidents", "Total", count(Incident)],
        ["Incidents", "Open", db.query(Incident).filter(
            Incident.tenant_id == tenant_id,
            Incident.status.notin_(["CLOSED", "FALSE_POSITIVE"]),
        ).count()],
        ["Incidents", "Regulatory Notification Required", db.query(Incident).filter(
            Incident.tenant_id == tenant_id,
            Incident.regulatory_notification_required == True,  # noqa: E712
        ).count()],
        ["Consent Records", "Total", count(ConsentRecord)],
        ["Consent Records", "Active", count(ConsentRecord, is_revoked=False)],
        ["Consent Records", "Revoked", count(ConsentRecord, is_revoked=True)],
        ["Action Plans", "Total", count(ActionPlan)],
        ["Action Plans", "Draft", count(ActionPlan, status="DRAFT")],
        ["Action Plans", "Active", count(ActionPlan, status="ACTIVE")],
        ["Action Plans", "Completed", count(ActionPlan, status="COMPLETED")],
        ["Audit Plans", "Total", count(AuditPlan)],
        ["Audit Findings", "Open", count(AuditFinding, status="OPEN")],
        ["Audit Findings", "Critical", count(AuditFinding, severity="CRITICAL")],
        ["Legal Documents", "Current", db.query(LegalDocument).filter(
            LegalDocument.tenant_id == tenant_id,
            LegalDocument.is_current == True,  # noqa: E712
        ).count()],
        ["DPIAs", "Total", count(DPIAssessment)],
        ["Remediations", "Open", db.query(Remediation).filter(
            Remediation.tenant_id == tenant_id,
            Remediation.status.notin_(["COMPLETED", "CANCELLED"]),
        ).count()],
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(rows)
    csv_bytes = output.getvalue().encode("utf-8")

    filename = f"compliance_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )
