"""US-RF09-1: DPIA structured flow and signed PDF generation."""

from datetime import datetime, timezone
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.dpia import DPIAssessment
from app.models.user import User
from app.schemas.dpia import DPIACreate, DPIARead, DPIAUpdate

router = APIRouter(prefix="/dpias", tags=["dpias"])


def _generate_dpia_pdf(dpia: DPIAssessment) -> bytes:
    """Render a DPIAssessment to PDF bytes using fpdf2."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(
        0,
        10,
        "Data Protection Impact Assessment (DPIA)",
        new_x="LMARGIN",
        new_y="NEXT",
        align="C",
    )
    pdf.set_font("Helvetica", "", 12)
    pdf.ln(3)
    pdf.cell(
        0,
        8,
        f"DPIA ID: {dpia.id}  Version: {dpia.version}  Status: {dpia.status}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.cell(
        0,
        8,
        f"Treatment Activity ID: {dpia.treatment_activity_id}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Step 1: Description of Processing", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 7, dpia.step1_description or "(not provided)")
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Step 2: Risk Analysis", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 7, dpia.step2_risk_analysis or "(not provided)")
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Step 3: Mitigation Measures", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 7, dpia.step3_mitigations or "(not provided)")
    pdf.ln(5)
    if dpia.signed_at:
        pdf.set_font("Helvetica", "I", 10)
        pdf.cell(
            0,
            7,
            f"Signed by DPO (user id={dpia.signed_by_id}) at {dpia.signed_at.isoformat()}",
            new_x="LMARGIN",
            new_y="NEXT",
        )
    return pdf.output()


@router.post("", response_model=DPIARead, status_code=status.HTTP_201_CREATED)
def create_dpia(
    body: DPIACreate,
    current_user: Annotated[User, Depends(require_permission("dpias", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a new DPIA for a treatment activity."""
    dpia = DPIAssessment(
        tenant_id=tenant_id,
        treatment_activity_id=body.treatment_activity_id,
        step1_description=body.step1_description,
        step2_risk_analysis=body.step2_risk_analysis,
        step3_mitigations=body.step3_mitigations,
    )
    db.add(dpia)
    db.commit()
    db.refresh(dpia)
    AuditLog.create_log(
        db,
        action="dpia_created",
        resource="dpias",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={dpia.id}",
    )
    return dpia


@router.get("", response_model=list[DPIARead])
def list_dpias(
    _: Annotated[User, Depends(require_permission("dpias", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List all DPIAs for the current tenant."""
    return db.query(DPIAssessment).filter(DPIAssessment.tenant_id == tenant_id).all()


@router.get("/{dpia_id}", response_model=DPIARead)
def get_dpia(
    dpia_id: int,
    _: Annotated[User, Depends(require_permission("dpias", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve a single DPIA by ID."""
    dpia = (
        db.query(DPIAssessment)
        .filter(DPIAssessment.id == dpia_id, DPIAssessment.tenant_id == tenant_id)
        .first()
    )
    if not dpia:
        raise HTTPException(status_code=404, detail="DPIA not found.")
    return dpia


@router.patch("/{dpia_id}", response_model=DPIARead)
def update_dpia(
    dpia_id: int,
    body: DPIAUpdate,
    _: Annotated[User, Depends(require_permission("dpias", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update DPIA steps or status."""
    dpia = (
        db.query(DPIAssessment)
        .filter(DPIAssessment.id == dpia_id, DPIAssessment.tenant_id == tenant_id)
        .first()
    )
    if not dpia:
        raise HTTPException(status_code=404, detail="DPIA not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(dpia, field, value)
    db.commit()
    db.refresh(dpia)
    return dpia


@router.post("/{dpia_id}/sign", response_model=DPIARead)
def sign_dpia(
    dpia_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """DPO or SUPER_ADMIN signs the DPIA, generates and stores the PDF."""
    if current_user.role not in ("DPO", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Only DPO or SUPER_ADMIN can sign a DPIA.")
    dpia = (
        db.query(DPIAssessment)
        .filter(DPIAssessment.id == dpia_id, DPIAssessment.tenant_id == tenant_id)
        .first()
    )
    if not dpia:
        raise HTTPException(status_code=404, detail="DPIA not found.")

    dpia.status = "SIGNED"
    dpia.signed_at = datetime.now(timezone.utc)
    dpia.signed_by_id = current_user.id
    dpia.version += 1
    dpia.pdf_bytes = _generate_dpia_pdf(dpia)
    db.commit()
    db.refresh(dpia)

    AuditLog.create_log(
        db,
        action="dpia_signed",
        resource="dpias",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={dpia_id} version={dpia.version}",
    )
    return dpia


@router.get("/{dpia_id}/pdf")
def get_dpia_pdf(
    dpia_id: int,
    _: Annotated[User, Depends(require_permission("dpias", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return the stored DPIA PDF bytes."""
    dpia = (
        db.query(DPIAssessment)
        .filter(DPIAssessment.id == dpia_id, DPIAssessment.tenant_id == tenant_id)
        .first()
    )
    if not dpia:
        raise HTTPException(status_code=404, detail="DPIA not found.")
    if not dpia.pdf_bytes:
        raise HTTPException(status_code=404, detail="PDF not yet generated. Sign the DPIA first.")
    return StreamingResponse(
        BytesIO(dpia.pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=dpia_{dpia_id}_v{dpia.version}.pdf"},
    )
