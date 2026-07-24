"""US-RF08-1 / US-RF18-1: Incident registration, regulatory notifications, and critical alerts.

DAT-52: SSPDP breach-form alignment — breach type (confidentiality/integrity/
availability), delegado (DPO) and responsable (controller) details, and a
generated PDF closure report required to close an incident.
"""

from datetime import datetime, timezone
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.incident import Incident
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.incident import (
    IncidentClose,
    IncidentCreate,
    IncidentRead,
    IncidentUpdate,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])

# Human-readable labels for the SSPDP breach types, used in the PDF report.
VULNERABILITY_LABELS = {
    "CONFIDENTIALITY": "Confidentiality",
    "INTEGRITY": "Integrity",
    "AVAILABILITY": "Availability",
}


def _latin1(text: str) -> str:
    """Encode text to latin-1 for fpdf2, replacing unmappable characters."""
    return str(text).encode("latin-1", errors="replace").decode("latin-1")


def _generate_incident_report_pdf(incident: Incident, tenant: Tenant | None) -> bytes:
    """Render an incident closure report to PDF bytes (DAT-52 evidence)."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Incident Closure Report", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    org = tenant.name if tenant else f"Tenant #{incident.tenant_id}"
    pdf.cell(0, 7, _latin1(f"Organization: {org}"), new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 7, _latin1(f"Generated: {generated}"), new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(3)

    def field(label: str, value: str) -> None:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 6, _latin1(label), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(0, 6, _latin1(value or "-"))
        pdf.ln(1)

    def section(title: str) -> None:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, _latin1(title), new_x="LMARGIN", new_y="NEXT")

    section("Incident")
    field("ID:", str(incident.id))
    field("Title:", incident.title)
    field("Type:", incident.incident_type)
    field("Severity:", incident.severity)
    vuln = ", ".join(VULNERABILITY_LABELS.get(v, v) for v in (incident.vulnerability_types or []))
    field("Breach type:", vuln)
    field("Affected data:", incident.affected_data_types)
    field("Description:", incident.description)

    section("Responsible parties")
    field("Delegate (DPO):", incident.delegate_name)
    field("Delegate email:", incident.delegate_email)
    field("Delegate phone:", incident.delegate_phone)
    field("Controller:", incident.controller_name)
    field("Controller email:", incident.controller_email)
    field("Controller phone:", incident.controller_phone)

    section("Regulatory notification")
    field("SPDP required:", "Yes" if incident.regulatory_notification_required else "No")
    field(
        "Notified at:",
        incident.regulatory_notified_at.strftime("%Y-%m-%d %H:%M UTC")
        if incident.regulatory_notified_at
        else "-",
    )

    section("Closure")
    field("Summary:", incident.closure_summary)
    return bytes(pdf.output())


@router.get("", response_model=list[IncidentRead])
def list_incidents(
    current_user: Annotated[User, Depends(require_permission("incidents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List incidents."""
    q = db.query(Incident).filter(Incident.tenant_id == tenant_id)
    if current_user.role == "DEPT_HEAD" and current_user.department_id:
        q = q.filter(Incident.department_id == current_user.department_id)
    if status_filter:
        q = q.filter(Incident.status == status_filter)
    if severity:
        q = q.filter(Incident.severity == severity)
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
def create_incident(
    body: IncidentCreate,
    current_user: Annotated[User, Depends(require_permission("incidents", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create incident.

    DAT-52 / RF-03: the delegado (DPO) and responsable (controller) default to the
    organization's official company-profile designation when not provided, and are
    stored as an editable per-incident snapshot for traceability.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    def _default(value: str | None, fallback: str | None) -> str | None:
        return value if (value and value.strip()) else fallback

    incident = Incident(
        tenant_id=tenant_id,
        reporter_id=current_user.id,
        title=body.title,
        description=body.description,
        incident_type=body.incident_type,
        severity=body.severity,
        vulnerability_types=body.vulnerability_types,
        regulatory_notification_required=body.regulatory_notification_required,
        affected_data_types=body.affected_data_types,
        department_id=body.department_id,
        assigned_to_id=body.assigned_to_id,
        # Delegado (DPO): default to the company profile's designated DPO.
        delegate_name=_default(body.delegate_name, tenant.dpo_name if tenant else None),
        delegate_email=_default(body.delegate_email, tenant.dpo_email if tenant else None),
        delegate_phone=_default(body.delegate_phone, tenant.dpo_phone if tenant else None),
        # Responsable (controller): the organization itself, by default.
        controller_name=_default(body.controller_name, tenant.name if tenant else None),
        controller_email=body.controller_email,
        controller_phone=body.controller_phone,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    AuditLog.create_log(
        db,
        action="incident_created",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident.id} type={incident.incident_type} severity={incident.severity}",
    )
    # US-RF18-1: auto-alert DPOs for HIGH/CRITICAL incidents
    if incident.severity in ("HIGH", "CRITICAL"):
        alert = Alert(
            tenant_id=tenant_id,
            alert_type="BREACH_REPORTED",
            title=f"[{incident.severity}] Incident Reported: {incident.title}",
            message=(
                f"A {incident.severity} severity incident of type '{incident.incident_type}' "
                f"has been reported. Immediate review required."
            ),
            severity="CRITICAL" if incident.severity == "CRITICAL" else "WARNING",
            resource_type="incidents",
            resource_id=incident.id,
            recipient_id=None,  # broadcast to all DPOs
        )
        db.add(alert)
        db.commit()
    return incident


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(
    incident_id: int,
    current_user: Annotated[User, Depends(require_permission("incidents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return incident."""
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.tenant_id == tenant_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if current_user.role == "DEPT_HEAD" and incident.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access restricted to your department.")
    return incident


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: int,
    body: IncidentUpdate,
    current_user: Annotated[User, Depends(require_permission("incidents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update incident."""
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.tenant_id == tenant_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    # DAT-52: closing requires a generated PDF report — force use of /close.
    if body.status == "CLOSED" and incident.status != "CLOSED":
        raise HTTPException(
            status_code=400,
            detail="Use POST /incidents/{id}/close to close an incident with a PDF report.",
        )

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(incident, field, value)

    # Auto-stamp regulatory notification time if newly flagged
    if body.regulatory_notification_required is True and incident.regulatory_notified_at is None:
        incident.regulatory_notified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)
    AuditLog.create_log(
        db,
        action="incident_updated",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident_id} status={incident.status}",
    )
    return incident


@router.post("/{incident_id}/notify", response_model=IncidentRead)
def mark_regulatory_notification(
    incident_id: int,
    current_user: Annotated[User, Depends(require_permission("incidents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Mark that regulatory authority has been notified (US-RF08-1)."""
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.tenant_id == tenant_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    incident.regulatory_notification_required = True
    incident.regulatory_notified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    AuditLog.create_log(
        db,
        action="incident_regulatory_notified",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident_id} notified_at={incident.regulatory_notified_at}",
    )
    return incident


@router.post("/{incident_id}/close", response_model=IncidentRead)
def close_incident(
    incident_id: int,
    body: IncidentClose,
    current_user: Annotated[User, Depends(require_permission("incidents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Close an incident, generating and storing a PDF closure report (DAT-52).

    Enforces SSPDP traceability: the breach type(s), delegado and responsable
    details, and a closure summary must all be present before the incident can
    be closed. The generated PDF is stored as evidence and downloadable via
    GET /incidents/{id}/report.pdf.
    """
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.tenant_id == tenant_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if incident.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Incident is already closed.")

    # DAT-52: required fields for a compliant closure.
    missing: list[str] = []
    if not incident.vulnerability_types:
        missing.append("vulnerability_types")
    if not (incident.delegate_name and incident.delegate_name.strip()):
        missing.append("delegate_name")
    if not (incident.controller_name and incident.controller_name.strip()):
        missing.append("controller_name")
    if not body.closure_summary.strip():
        missing.append("closure_summary")
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot close incident. Missing required fields: {', '.join(missing)}.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    incident.closure_summary = body.closure_summary
    incident.closure_report_pdf = _generate_incident_report_pdf(incident, tenant)
    incident.status = "CLOSED"
    now = datetime.now(timezone.utc)
    incident.closed_at = now
    if incident.resolved_at is None:
        incident.resolved_at = now
    db.commit()
    db.refresh(incident)

    AuditLog.create_log(
        db,
        action="incident_closed",
        resource="incidents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={incident_id} report_generated=True",
    )
    return incident


@router.get("/{incident_id}/report.pdf")
def get_incident_report(
    incident_id: int,
    _: Annotated[User, Depends(require_permission("incidents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Download the stored PDF closure report for an incident (DAT-52)."""
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.tenant_id == tenant_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if not incident.closure_report_pdf:
        raise HTTPException(
            status_code=404, detail="No closure report yet. Close the incident first."
        )
    return StreamingResponse(
        BytesIO(incident.closure_report_pdf),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=incident_{incident_id}_closure.pdf"
        },
    )
