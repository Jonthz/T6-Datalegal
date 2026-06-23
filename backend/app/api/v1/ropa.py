"""US-RF31-1: ROPA report generation from registered treatment activities."""

from datetime import datetime, timezone
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.treatment_activity import TreatmentActivity
from app.models.user import User

router = APIRouter(prefix="/ropa", tags=["ropa"])


def _build_ropa_data(tenant_id: int, db: Session) -> dict:
    """Build the ROPA data structure grouped by legal basis."""
    activities = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.tenant_id == tenant_id)
        .all()
    )
    activities_by_basis: dict[str, list] = {}
    for act in activities:
        entry = {
            "id": act.id,
            "name": act.name,
            "purpose": act.purpose,
            "legal_basis": act.legal_basis,
            "personal_data_types": act.personal_data_types,
            "data_subjects": act.data_subjects,
            "is_cross_border": act.is_cross_border,
            "destination_countries": act.destination_countries,
            "processor_name": act.processor_name,
            "processor_country": act.processor_country,
            "retention_period_days": act.retention_period_days,
            "status": act.status,
            "created_at": act.created_at.isoformat() if act.created_at else None,
        }
        activities_by_basis.setdefault(act.legal_basis, []).append(entry)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tenant_id": tenant_id,
        "total_activities": len(activities),
        "activities_by_legal_basis": activities_by_basis,
    }


def _generate_ropa_pdf(ropa_data: dict) -> bytes:
    """Render the ROPA data dict to PDF bytes using fpdf2."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(
        0, 10, "Record of Processing Activities (ROPA)",
        new_x="LMARGIN", new_y="NEXT", align="C",
    )
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(
        0, 8, f"Generated: {ropa_data['generated_at']}",
        new_x="LMARGIN", new_y="NEXT", align="C",
    )
    pdf.cell(
        0, 8, f"Generated: {ropa_data['generated_at']}", new_x="LMARGIN", new_y="NEXT", align="C"
    )
    pdf.cell(
        0,
        8,
        f"Tenant ID: {ropa_data['tenant_id']}  Total activities: {ropa_data['total_activities']}",
        new_x="LMARGIN",
        new_y="NEXT",
        align="C",
    )
    pdf.ln(6)

    for legal_basis, entries in ropa_data["activities_by_legal_basis"].items():
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_fill_color(220, 220, 220)
        pdf.cell(
            0,
            9,
            f"Legal Basis: {legal_basis} ({len(entries)} activities)",
            new_x="LMARGIN",
            new_y="NEXT",
            fill=True,
        )
        pdf.ln(2)

        for act in entries:
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(
                0, 7, f"[{act['id']}] {act['name']} - Status: {act['status']}",
                new_x="LMARGIN", new_y="NEXT",
            )
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(0, 6, f"Purpose: {act['purpose']}")
            pdf.cell(
                0, 6, f"Retention: {act['retention_period_days']} days",
                new_x="LMARGIN", new_y="NEXT",
            )
            types_str = (
                ", ".join(act["personal_data_types"]) if act["personal_data_types"] else "N/A"
            )
            pdf.cell(0, 6, f"Data types: {types_str}", new_x="LMARGIN", new_y="NEXT")
            subjects_str = ", ".join(act["data_subjects"]) if act["data_subjects"] else "N/A"
            pdf.cell(0, 6, f"Data subjects: {subjects_str}", new_x="LMARGIN", new_y="NEXT")
            if act["is_cross_border"]:
                destinations = act["destination_countries"]
                countries = ", ".join(destinations) if destinations else "N/A"
                pdf.cell(
                    0, 6, f"Cross-border - Destinations: {countries}",
                    new_x="LMARGIN", new_y="NEXT",
                )
            if act["processor_name"]:
                pdf.cell(
                    0,
                    6,
                    f"Processor: {act['processor_name']} ({act['processor_country'] or 'N/A'})",
                    new_x="LMARGIN",
                    new_y="NEXT",
                )
            pdf.ln(3)
        pdf.ln(4)

    return pdf.output()
