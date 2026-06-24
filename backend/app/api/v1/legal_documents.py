"""US-RF14-1: Parameterized and versioned legal document generation.
US-RF33-1: Expanded contractual document templates.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.legal_document import (
    ALL_TEMPLATE_TYPES,
    CORE_TEMPLATE_TYPES,
    LegalDocument,
)
from app.models.user import User
from app.schemas.legal_document import LegalDocumentCreate, LegalDocumentRead, TemplateTypeInfo

router = APIRouter(prefix="/legal-documents", tags=["legal-documents"])

_TEMPLATE_DESCRIPTIONS = {
    "PRIVACY_POLICY": "Privacy Policy compliant with LOPDP Art.13",
    "SECURITY_POLICY": "Information Security Policy",
    "COOKIE_NOTICE": "Cookie consent notice and usage policy",
    "CUSTOMER_NOTICE": "Notice to data subjects (customers)",
    "CONTRACTUAL_CLAUSE": "Standard data protection contractual clause",
    "PROCESSOR_CONTRACT": "Data processor agreement (DPA)",
}


@router.get("/template-types", response_model=list[TemplateTypeInfo])
def list_template_types(
    _: Annotated[User, Depends(require_permission("legal_documents", "r"))],
):
    """List all supported document template types (US-RF14-1 + US-RF33-1)."""
    result = []
    for dt in sorted(ALL_TEMPLATE_TYPES):
        result.append(
            TemplateTypeInfo(
                doc_type=dt,
                category="CORE" if dt in CORE_TEMPLATE_TYPES else "EXPANDED",
                description=_TEMPLATE_DESCRIPTIONS.get(dt, ""),
            )
        )
    return result


@router.post("", response_model=LegalDocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    body: LegalDocumentCreate,
    current_user: Annotated[User, Depends(require_permission("legal_documents", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a new versioned legal document from a template type."""
    if body.doc_type not in ALL_TEMPLATE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown doc_type '{body.doc_type}'. Valid: {sorted(ALL_TEMPLATE_TYPES)}",
        )
    # Supersede prior current version for same type
    db.query(LegalDocument).filter(
        LegalDocument.tenant_id == tenant_id,
        LegalDocument.doc_type == body.doc_type,
        LegalDocument.is_current.is_(True),
    ).update({"is_current": False})

    doc = LegalDocument(
        tenant_id=tenant_id,
        doc_type=body.doc_type,
        title=body.title,
        version=body.version,
        effective_date=body.effective_date,
        parameters=body.parameters,
        content=body.content or _render_default_content(body.doc_type, body.parameters),
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    AuditLog.create_log(
        db,
        action="legal_document_created",
        resource="legal_documents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"type={body.doc_type} version={body.version}",
    )
    return doc


@router.get("", response_model=list[LegalDocumentRead])
def list_documents(
    _: Annotated[User, Depends(require_permission("legal_documents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    doc_type: str | None = Query(None),
    current_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List legal documents with optional type and current-version filters."""
    q = db.query(LegalDocument).filter(LegalDocument.tenant_id == tenant_id)
    if doc_type:
        q = q.filter(LegalDocument.doc_type == doc_type)
    if current_only:
        q = q.filter(LegalDocument.is_current.is_(True))
    return q.order_by(LegalDocument.id.desc()).offset(skip).limit(limit).all()


@router.get("/{doc_id}", response_model=LegalDocumentRead)
def get_document(
    doc_id: int,
    _: Annotated[User, Depends(require_permission("legal_documents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve a legal document by ID."""
    doc = db.query(LegalDocument).filter(
        LegalDocument.id == doc_id, LegalDocument.tenant_id == tenant_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found.")
    return doc


@router.get("/{doc_id}/pdf")
def download_pdf(
    doc_id: int,
    current_user: Annotated[User, Depends(require_permission("legal_documents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Generate and download a PDF for the legal document (US-RF14-1)."""
    doc = (
        db.query(LegalDocument)
        .filter(LegalDocument.id == doc_id, LegalDocument.tenant_id == tenant_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found.")
    pdf_bytes = _generate_pdf(doc)
    AuditLog.create_log(
        db,
        action="legal_document_pdf_downloaded",
        resource="legal_documents",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"doc_id={doc_id}",
    )
    filename = f"{doc.doc_type.lower()}_v{doc.version}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Helpers ───


def _render_default_content(doc_type: str, params: dict) -> str:
    """Render default text content for a legal document type using provided parameters."""
    company = params.get("company_name", "[Company]")
    dpo = params.get("dpo_name", "[DPO]")
    sector = params.get("sector", "")
    date_str = params.get("effective_date", "")

    templates = {
        "PRIVACY_POLICY": (
            f"PRIVACY POLICY\n\nCompany: {company}\nSector: {sector}\nDPO: {dpo}\n"
            f"Effective date: {date_str}\n\n"
            "1. Data Controller\nThis organization acts as data controller under LOPDP.\n\n"
            "2. Purposes and Legal Basis\nPersonal data is processed for the purposes "
            "and legal bases described in the Data Registry.\n\n"
            "3. Data Subject Rights\nData subjects may exercise ARCO rights "
            "(Access, Rectification, Cancellation, Opposition) as established by LOPDP Art.7.\n\n"
            "4. Retention\nData is retained per the Retention Policy "
            "and applicable legal requirements.\n\n"
            "5. Contact\nDPO: " + dpo
        ),
        "SECURITY_POLICY": (
            f"INFORMATION SECURITY POLICY\n\nCompany: {company}\nDPO: {dpo}\n"
            f"Effective date: {date_str}\n\n"
            "1. Scope\nThis policy applies to all information assets and processing activities.\n\n"
            "2. Classification\nInformation assets are classified by sensitivity "
            "(ORDINARY/SENSITIVE) and criticality (LOW/MEDIUM/HIGH).\n\n"
            "3. Access Control\nRole-based access control (RBAC) is enforced per LOPDP RNF-04.\n\n"
            "4. Incident Management\nSecurity incidents are reported to SPDP "
            "within 72 hours per LOPDP Art.39.\n\n"
            "5. Review\nThis policy is reviewed annually or after significant incidents."
        ),
        "COOKIE_NOTICE": (
            f"COOKIE NOTICE\n\nCompany: {company}\nEffective date: {date_str}\n\n"
            "We use cookies to improve user experience and comply with regulatory requirements.\n\n"
            "Types of cookies: Essential, Analytics, Marketing.\n"
            "You may accept or reject non-essential cookies via the consent banner.\n"
            "To revoke consent, contact: " + dpo
        ),
        "CUSTOMER_NOTICE": (
            f"NOTICE TO DATA SUBJECTS\n\nCompany: {company}\nDPO: {dpo}\n"
            f"Effective date: {date_str}\n\n"
            "Dear Customer,\nWe process your personal data in accordance with LOPDP. "
            "You have the right to access, rectify, and request deletion of your data. "
            "Contact our DPO for any privacy-related requests."
        ),
        "CONTRACTUAL_CLAUSE": (
            f"DATA PROTECTION CONTRACTUAL CLAUSE\n\nParties: {company}\n"
            f"Effective date: {date_str}\n\n"
            "Both parties agree to process personal data in accordance with LOPDP "
            "and applicable regulations. Each party is responsible for its own processing "
            "activities and must implement appropriate technical and organizational measures."
        ),
        "PROCESSOR_CONTRACT": (
            f"DATA PROCESSING AGREEMENT (DPA)\n\nController: {company}\nDPO: {dpo}\n"
            f"Effective date: {date_str}\n\n"
            "1. Subject Matter\nThe Processor will process personal data on behalf "
            "of the Controller as described in Annex A.\n\n"
            "2. Obligations\nThe Processor shall process data only on documented "
            "instructions from the Controller.\n\n"
            "3. Security\nThe Processor shall implement appropriate technical "
            "measures per LOPDP RNF-04.\n\n"
            "4. Sub-processors\nThe Processor shall not engage sub-processors "
            "without prior written consent.\n\n"
            "5. Termination\nUpon termination, all data shall be deleted or returned."
        ),
    }
    return templates.get(doc_type, f"{doc_type}\n\nGenerated for: {company}\nDPO: {dpo}")


def _latin1(text: str) -> str:
    """Replace characters outside latin-1 range so fpdf core fonts don't crash."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _generate_pdf(doc: LegalDocument) -> bytes:
    """Render a LegalDocument to PDF bytes using fpdf2."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    w = pdf.w - pdf.l_margin - pdf.r_margin  # usable width

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(w, 10, _latin1(doc.title), align="C")
    pdf.ln(2)
    pdf.set_font("Helvetica", size=10)
    version_line = _latin1(f"Version: {doc.version}  Effective date: {doc.effective_date}")
    pdf.multi_cell(w, 6, version_line, align="C")
    pdf.ln(5)

    # Content (multi_cell handles word wrap)
    pdf.set_font("Helvetica", size=11)
    for line in doc.content.splitlines():
        if line.strip() == "":
            pdf.ln(4)
        elif line.isupper() and len(line) < 80:
            pdf.set_font("Helvetica", "B", 12)
            pdf.multi_cell(w, 7, _latin1(line))
            pdf.set_font("Helvetica", size=11)
        else:
            pdf.multi_cell(w, 6, _latin1(line))

    # Footer
    pdf.set_y(-20)
    pdf.set_font("Helvetica", "I", 8)
    footer = _latin1(f"DataLegal - Generated document - {doc.doc_type} v{doc.version}")
    pdf.multi_cell(w, 5, footer, align="C")

    return bytes(pdf.output())
