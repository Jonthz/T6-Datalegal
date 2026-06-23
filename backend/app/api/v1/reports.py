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
    """Risk assessment totals grouped by level."""

    total: int
    high: int
    medium: int
    low: int


class ARCOSummary(BaseModel):
    """ARCO request totals grouped by status."""

    total: int
    open: int
    completed: int


class IncidentSummary(BaseModel):
    """Security incident totals for report summaries."""

    total: int
    open: int
    regulatory_notification_required: int


class ActionPlanSummary(BaseModel):
    """Action plan totals grouped by status."""

    total: int
    draft: int
    active: int
    completed: int


class AuditSummary(BaseModel):
    """Audit plan and finding totals for report summaries."""

    total_plans: int
    open_findings: int
    critical_findings: int


class ConsentSummary(BaseModel):
    """Consent record totals grouped by state."""

    total: int
    active: int
    revoked: int
    sensitive: int


class ConsolidatedSummaryReport(BaseModel):
    """Consolidated tenant compliance report."""

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


def _count_for_tenant(db: Session, tenant_id: int, model, **filters) -> int:
    """Count tenant-scoped records with optional equality filters."""
    query = db.query(model).filter(model.tenant_id == tenant_id)
    for attr, val in filters.items():
        query = query.filter(getattr(model, attr) == val)
    return query.count()


def _count_open_arco_requests(db: Session, tenant_id: int) -> int:
    """Count ARCO requests that are still open."""
    return db.query(ARCORequest).filter(
        ARCORequest.tenant_id == tenant_id,
        ARCORequest.status.notin_(["CLOSED", "REJECTED"]),
    ).count()


def _count_open_incidents(db: Session, tenant_id: int) -> int:
    """Count incidents that are still open."""
    return db.query(Incident).filter(
        Incident.tenant_id == tenant_id,
        Incident.status.notin_(["CLOSED", "FALSE_POSITIVE"]),
    ).count()


def _count_regulatory_notification_incidents(db: Session, tenant_id: int) -> int:
    """Count incidents that require regulatory notification."""
    return db.query(Incident).filter(
        Incident.tenant_id == tenant_id,
        Incident.regulatory_notification_required.is_(True),
    ).count()


def _count_current_legal_documents(db: Session, tenant_id: int) -> int:
    """Count current legal documents."""
    return db.query(LegalDocument).filter(
        LegalDocument.tenant_id == tenant_id,
        LegalDocument.is_current.is_(True),
    ).count()


def _count_open_remediations(db: Session, tenant_id: int) -> int:
    """Count remediations that are still open."""
    return db.query(Remediation).filter(
        Remediation.tenant_id == tenant_id,
        Remediation.status.notin_(["COMPLETED", "CANCELLED"]),
    ).count()


# ── US-RF42-1: Consolidated summary ──────────────────────────────────────────

@router.get("/summary", response_model=ConsolidatedSummaryReport)
def get_summary_report(
    current_user: Annotated[  # pylint: disable=unused-argument
        User, Depends(require_permission("reports", "r"))
    ],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Consolidated compliance summary report (US-RF42-1)."""
    return ConsolidatedSummaryReport(
        tenant_id=tenant_id,
        total_treatment_activities=_count_for_tenant(db, tenant_id, TreatmentActivity),
        risks=RiskSummary(
            total=_count_for_tenant(db, tenant_id, RiskAssessment),
            high=_count_for_tenant(db, tenant_id, RiskAssessment, risk_level="HIGH"),
            medium=_count_for_tenant(db, tenant_id, RiskAssessment, risk_level="MEDIUM"),
            low=_count_for_tenant(db, tenant_id, RiskAssessment, risk_level="LOW"),
        ),
        arco=ARCOSummary(
            total=_count_for_tenant(db, tenant_id, ARCORequest),
            open=_count_open_arco_requests(db, tenant_id),
            completed=_count_for_tenant(db, tenant_id, ARCORequest, status="CLOSED"),
        ),
        incidents=IncidentSummary(
            total=_count_for_tenant(db, tenant_id, Incident),
            open=_count_open_incidents(db, tenant_id),
            regulatory_notification_required=_count_regulatory_notification_incidents(
                db, tenant_id
            ),
        ),
        action_plans=ActionPlanSummary(
            total=_count_for_tenant(db, tenant_id, ActionPlan),
            draft=_count_for_tenant(db, tenant_id, ActionPlan, status="DRAFT"),
            active=_count_for_tenant(db, tenant_id, ActionPlan, status="ACTIVE"),
            completed=_count_for_tenant(db, tenant_id, ActionPlan, status="COMPLETED"),
        ),
        audits=AuditSummary(
            total_plans=_count_for_tenant(db, tenant_id, AuditPlan),
            open_findings=_count_for_tenant(db, tenant_id, AuditFinding, status="OPEN"),
            critical_findings=_count_for_tenant(
                db, tenant_id, AuditFinding, severity="CRITICAL"
            ),
        ),
        consents=ConsentSummary(
            total=_count_for_tenant(db, tenant_id, ConsentRecord),
            active=_count_for_tenant(db, tenant_id, ConsentRecord, is_revoked=False),
            revoked=_count_for_tenant(db, tenant_id, ConsentRecord, is_revoked=True),
            sensitive=_count_for_tenant(db, tenant_id, ConsentRecord, is_sensitive=True),
        ),
        total_legal_documents=_count_current_legal_documents(db, tenant_id),
        total_dpias=_count_for_tenant(db, tenant_id, DPIAssessment),
        open_remediations=_count_open_remediations(db, tenant_id),
    )


# ── US-RF16-1: KPI dashboard ──────────────────────────────────────────────────

@router.get("/kpis")
def get_kpis(
    current_user: Annotated[  # pylint: disable=unused-argument
        User, Depends(require_permission("reports", "r"))
    ],
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
    ra_rows = (
        db.query(RiskAssessment.risk_score)
        .filter(RiskAssessment.tenant_id == tenant_id)
        .all()
    )
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
    current_user: Annotated[  # pylint: disable=unused-argument
        User, Depends(require_permission("reports", "r"))
    ],
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

        def _count_in_period(
            model,
            date_col: str,
            start: datetime,
            end: datetime,
        ) -> int:
            col = getattr(model, date_col)
            return db.query(model).filter(
                model.tenant_id == tenant_id,
                col >= start,
                col < end,
            ).count()

        new_activities = _count_in_period(
            TreatmentActivity, "created_at", period_start, period_end
        )
        new_incidents = _count_in_period(Incident, "created_at", period_start, period_end)
        new_arco = _count_in_period(ARCORequest, "created_at", period_start, period_end)
        new_consents = _count_in_period(ConsentRecord, "granted_at", period_start, period_end)
        new_risks = _count_in_period(RiskAssessment, "created_at", period_start, period_end)

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
    current_user: Annotated[  # pylint: disable=unused-argument
        User, Depends(require_permission("reports", "r"))
    ],
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
    total_docs = _count_current_legal_documents(db, tenant_id)

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
            regulatory_notification_required=_count_regulatory_notification_incidents(
                db, tenant_id
            ),
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
    current_user: Annotated[  # pylint: disable=unused-argument
        User, Depends(require_permission("reports", "r"))
    ],
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
        [
            "Incidents",
            "Regulatory Notification Required",
            _count_regulatory_notification_incidents(db, tenant_id),
        ],
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
        ["Legal Documents", "Current", _count_current_legal_documents(db, tenant_id)],
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
