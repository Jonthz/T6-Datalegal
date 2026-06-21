"""US-RF13-1: Audit planning, findings with severity/evidence, and PDF report."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.audit_plan import AuditFinding, AuditPlan
from app.models.user import User
from app.schemas.audit_plan import (
    AuditFindingCreate,
    AuditFindingRead,
    AuditFindingUpdate,
    AuditPlanCreate,
    AuditPlanRead,
    AuditPlanUpdate,
)

router = APIRouter(prefix="/audit-plans", tags=["audit-plans"])


# ── Audit Plans ────

@router.post("", response_model=AuditPlanRead, status_code=status.HTTP_201_CREATED)
def create_audit_plan(
    body: AuditPlanCreate,
    current_user: Annotated[User, Depends(require_permission("audit_plans", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a new audit plan for the current tenant."""
    plan = AuditPlan(
        tenant_id=tenant_id,
        name=body.name,
        scope=body.scope,
        period_start=body.period_start,
        period_end=body.period_end,
        auditor_id=body.auditor_id,
        notes=body.notes,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    AuditLog.create_log(
        db, action="audit_plan_created", resource="audit_plans",
        tenant_id=tenant_id, user_id=current_user.id, detail=f"id={plan.id} name={plan.name}",
    )
    return plan


@router.get("", response_model=list[AuditPlanRead])
def list_audit_plans(
    _: Annotated[User, Depends(require_permission("audit_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    plan_status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List audit plans for the current tenant, optionally filtered by status."""
    q = db.query(AuditPlan).filter(AuditPlan.tenant_id == tenant_id)
    if plan_status:
        q = q.filter(AuditPlan.status == plan_status)
    return q.order_by(AuditPlan.id.desc()).offset(skip).limit(limit).all()


@router.get("/{plan_id}", response_model=AuditPlanRead)
def get_audit_plan(
    plan_id: int,
    _: Annotated[User, Depends(require_permission("audit_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve a single audit plan by id within the current tenant."""
    plan = db.query(AuditPlan).filter(
        AuditPlan.id == plan_id, AuditPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Audit plan not found.")
    return plan

@router.patch("/{plan_id}", response_model=AuditPlanRead)
def update_audit_plan(
    plan_id: int,
    body: AuditPlanUpdate,
    _: Annotated[User, Depends(require_permission("audit_plans", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update an existing audit plan."""
    plan = db.query(AuditPlan).filter(
        AuditPlan.id == plan_id, AuditPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Audit plan not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


# ── Audit Findings ──

@router.post("/findings", response_model=AuditFindingRead, status_code=status.HTTP_201_CREATED)
def create_finding(
    body: AuditFindingCreate,
    current_user: Annotated[User, Depends(require_permission("audit_plans", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Register a new finding under an audit plan."""
    # Verify audit plan belongs to tenant
    plan = db.query(AuditPlan).filter(
        AuditPlan.id == body.audit_plan_id, AuditPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Audit plan not found.")
    finding = AuditFinding(
        tenant_id=tenant_id,
        audit_plan_id=body.audit_plan_id,
        title=body.title,
        description=body.description,
        evidence=body.evidence,
        severity=body.severity,
        remediation_notes=body.remediation_notes,
        remediation_date=body.remediation_date,
        created_by_id=current_user.id,
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    AuditLog.create_log(
        db, action="audit_finding_created", resource="audit_plans",
        tenant_id=tenant_id, user_id=current_user.id,
        detail=f"plan_id={body.audit_plan_id} severity={body.severity}",
    )
    return finding


@router.get("/{plan_id}/findings", response_model=list[AuditFindingRead])
def list_findings(
    plan_id: int,
    _: Annotated[User, Depends(require_permission("audit_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    severity: str | None = Query(None),
    finding_status: str | None = Query(None),
):
    """List findings for an audit plan, optionally filtered by severity/status."""
    # Verify plan belongs to tenant
    plan = db.query(AuditPlan).filter(
        AuditPlan.id == plan_id, AuditPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Audit plan not found.")
    q = db.query(AuditFinding).filter(
        AuditFinding.audit_plan_id == plan_id, AuditFinding.tenant_id == tenant_id
    )
    if severity:
        q = q.filter(AuditFinding.severity == severity)
    if finding_status:
        q = q.filter(AuditFinding.status == finding_status)
    return q.order_by(AuditFinding.id.desc()).all()

@router.patch("/findings/{finding_id}", response_model=AuditFindingRead)
def update_finding(
    finding_id: int,
    body: AuditFindingUpdate,
    _: Annotated[User, Depends(require_permission("audit_plans", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update an existing audit finding."""
    finding = db.query(AuditFinding).filter(
        AuditFinding.id == finding_id, AuditFinding.tenant_id == tenant_id
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Audit finding not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(finding, field, value)
    db.commit()
    db.refresh(finding)
    return finding


# ── PDF Report ──

@router.get("/{plan_id}/report")
def download_audit_report(
    plan_id: int,
    current_user: Annotated[User, Depends(require_permission("audit_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Generate and download a PDF audit report with all findings (US-RF13-1)."""
    plan = db.query(AuditPlan).filter(
        AuditPlan.id == plan_id, AuditPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Audit plan not found.")
    findings = db.query(AuditFinding).filter(
        AuditFinding.audit_plan_id == plan_id, AuditFinding.tenant_id == tenant_id
    ).order_by(AuditFinding.severity, AuditFinding.id).all()

    pdf_bytes = _generate_audit_pdf(plan, findings)
    AuditLog.create_log(
        db, action="audit_report_downloaded", resource="audit_plans",
        tenant_id=tenant_id, user_id=current_user.id, detail=f"plan_id={plan_id}",
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=audit_report_{plan_id}.pdf"},
    )

# ── PDF helpers ───

_SEVERITY_COLORS = {
    "CRITICAL": (200, 0, 0),
    "HIGH": (220, 80, 0),
    "MEDIUM": (200, 150, 0),
    "LOW": (0, 120, 0),
    "INFO": (0, 80, 160),
}


def _latin1(text: str) -> str:
    """Replace characters outside latin-1 range so fpdf core fonts don't crash."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _generate_audit_pdf(plan: AuditPlan, findings: list[AuditFinding]) -> bytes:
    """Build the audit report PDF and return its raw bytes."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    w = pdf.w - pdf.l_margin - pdf.r_margin  # usable width

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.multi_cell(w, 12, "AUDIT REPORT", align="C")
    pdf.set_font("Helvetica", "B", 14)
    pdf.multi_cell(w, 8, _latin1(plan.name), align="C")
    pdf.ln(4)

    # Plan metadata
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(w, 6, f"Status: {plan.status}")
    if plan.period_start:
        end_str = str(plan.period_end) if plan.period_end else "ongoing"
        pdf.multi_cell(w, 6, f"Period: {plan.period_start} to {end_str}")
    if plan.scope:
        pdf.multi_cell(w, 6, _latin1(f"Scope: {plan.scope}"))
    pdf.ln(4)

    # Summary table
    total = len(findings)
    open_count = sum(1 for f in findings if f.status == "OPEN")
    resolved_count = sum(1 for f in findings if f.status == "RESOLVED")
    by_severity: dict[str, int] = {}
    for f in findings:
        by_severity[f.severity] = by_severity.get(f.severity, 0) + 1

    pdf.set_font("Helvetica", "B", 11)
    pdf.multi_cell(w, 7, "SUMMARY")
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(w, 6, f"Total: {total}  Open: {open_count}  Resolved: {resolved_count}")
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
        count = by_severity.get(sev, 0)
        if count:
            pdf.multi_cell(w, 6, f"  {sev}: {count}")
    pdf.ln(4)

    # Findings detail
    pdf.set_font("Helvetica", "B", 11)
    pdf.multi_cell(w, 7, "FINDINGS")
    pdf.ln(2)

    for i, finding in enumerate(findings, start=1):
        color = _SEVERITY_COLORS.get(finding.severity, (0, 0, 0))
        pdf.set_text_color(*color)
        pdf.set_font("Helvetica", "B", 10)
        header = f"{i}. [{finding.severity}] {finding.title} - {finding.status}"
        pdf.multi_cell(w, 6, _latin1(header))
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", size=9)
        if finding.description:
            pdf.multi_cell(w, 5, _latin1(f"Description: {finding.description}"))
        if finding.evidence:
            pdf.multi_cell(w, 5, _latin1(f"Evidence: {finding.evidence}"))
        if finding.remediation_notes:
            pdf.multi_cell(w, 5, _latin1(f"Remediation: {finding.remediation_notes}"))
        if finding.remediation_date:
            pdf.multi_cell(w, 5, f"Remediation date: {finding.remediation_date}")
        pdf.ln(3)

    # Footer
    pdf.set_y(-20)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(w, 5, "DataLegal 2.0 - Audit Report - Confidential", align="C")

    return bytes(pdf.output())
