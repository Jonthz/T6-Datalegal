"""US-RF21-1: Bulk CSV/JSON import and export of treatment activities and compliance reports."""

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.arco_request import ARCORequest
from app.models.audit_log import AuditLog
from app.models.consent import ConsentRecord
from app.models.incident import Incident
from app.models.risk_assessment import RiskAssessment
from app.models.treatment_activity import TreatmentActivity
from app.models.user import User
from app.schemas.treatment_activity import TreatmentActivityCreate

router = APIRouter(tags=["import-export"])

# CSV column order for treatment activity exports
_TA_CSV_COLUMNS = [
    "id",
    "name",
    "purpose",
    "legal_basis",
    "status",
    "retention_period_days",
    "is_cross_border",
    "department_id",
]


# ── Import ────────────────────────────────────────────────────────────────────


class BulkImportRequest(BaseModel):
    activities: list[dict]


@router.post("/import/treatment-activities")
def import_treatment_activities(
    body: BulkImportRequest,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
) -> dict:
    """Bulk-import treatment activities from a JSON payload.

    Body: {"activities": [{"name": "...", "purpose": "...", "legal_basis": "...", ...}, ...]}
    Returns: {"created": N, "errors": [{"row": N, "detail": "..."}]}
    """
    created = 0
    errors: list[dict] = []

    for idx, row in enumerate(body.activities):
        try:
            validated = TreatmentActivityCreate.model_validate(row)
        except ValidationError as exc:
            errors.append({"row": idx, "detail": str(exc)})
            continue

        activity = TreatmentActivity(
            tenant_id=tenant_id,
            name=validated.name,
            purpose=validated.purpose,
            legal_basis=validated.legal_basis,
            personal_data_types=validated.personal_data_types,
            data_subjects=validated.data_subjects,
            retention_period_days=validated.retention_period_days,
            is_cross_border=validated.is_cross_border,
            destination_countries=validated.destination_countries,
            processor_name=validated.processor_name,
            processor_country=validated.processor_country,
            department_id=validated.department_id,
            status=validated.status,
            owner_id=current_user.id,
        )
        db.add(activity)
        created += 1

    if created:
        db.commit()

    AuditLog.create_log(
        db,
        action="treatment_activities_imported",
        resource="treatment_activities",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"created={created} errors={len(errors)}",
    )
    return {"created": created, "errors": errors}


# ── Export: Treatment Activities ──────────────────────────────────────────────

@router.get("/export/treatment-activities")
def export_treatment_activities(
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Export all treatment activities for the tenant as a CSV file (streamed)."""
    activities = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.tenant_id == tenant_id)
        .order_by(TreatmentActivity.id)
        .all()
    )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=_TA_CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()

    for act in activities:
        writer.writerow(
            {
                "id": act.id,
                "name": act.name,
                "purpose": act.purpose,
                "legal_basis": act.legal_basis,
                "status": act.status,
                "retention_period_days": act.retention_period_days,
                "is_cross_border": act.is_cross_border,
                "department_id": act.department_id,
            }
        )

    csv_bytes = output.getvalue().encode("utf-8")

    AuditLog.create_log(
        db,
        action="treatment_activities_exported",
        resource="treatment_activities",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"rows={len(activities)}",
    )

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=\"treatment_activities.csv\""},
    )


# ── Export: Compliance Report ─────────────────────────────────────────────────

@router.get("/export/compliance-report")
def export_compliance_report(
    current_user: Annotated[User, Depends(require_permission("reports", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
) -> dict:
    """Return a full JSON compliance snapshot for the tenant.

    Includes counts and status breakdowns for: treatment activities, risk
    assessments, ARCO requests, consent records, and security incidents.
    """
    # Treatment activities
    ta_all = db.query(TreatmentActivity).filter(TreatmentActivity.tenant_id == tenant_id).all()
    ta_summary: dict = {"total": len(ta_all), "by_status": {}}
    for act in ta_all:
        ta_summary["by_status"][act.status] = ta_summary["by_status"].get(act.status, 0) + 1

    # Risk assessments
    ra_all = db.query(RiskAssessment).filter(RiskAssessment.tenant_id == tenant_id).all()
    ra_summary: dict = {"total": len(ra_all), "by_level": {}}
    for ra in ra_all:
        ra_summary["by_level"][ra.risk_level] = ra_summary["by_level"].get(ra.risk_level, 0) + 1

    # ARCO requests
    arco_all = db.query(ARCORequest).filter(ARCORequest.tenant_id == tenant_id).all()
    arco_summary: dict = {"total": len(arco_all), "by_status": {}, "by_type": {}}
    for req in arco_all:
        arco_summary["by_status"][req.status] = arco_summary["by_status"].get(req.status, 0) + 1
        arco_summary["by_type"][req.request_type] = (
            arco_summary["by_type"].get(req.request_type, 0) + 1
        )

    # Consent records
    consent_all = db.query(ConsentRecord).filter(ConsentRecord.tenant_id == tenant_id).all()
    consent_summary: dict = {
        "total": len(consent_all),
        "active": sum(1 for c in consent_all if not c.is_revoked),
        "revoked": sum(1 for c in consent_all if c.is_revoked),
    }

    # Security incidents
    incident_all = db.query(Incident).filter(Incident.tenant_id == tenant_id).all()
    incident_summary: dict = {"total": len(incident_all), "by_status": {}, "by_severity": {}}
    for inc in incident_all:
        incident_summary["by_status"][inc.status] = (
            incident_summary["by_status"].get(inc.status, 0) + 1
        )
        incident_summary["by_severity"][inc.severity] = (
            incident_summary["by_severity"].get(inc.severity, 0) + 1
        )

    AuditLog.create_log(
        db,
        action="compliance_report_exported",
        resource="reports",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=(
            f"ta={ta_summary['total']} ra={ra_summary['total']} "
            f"arco={arco_summary['total']} consents={consent_summary['total']} "
            f"incidents={incident_summary['total']}"
        ),
    )

    return {
        "tenant_id": tenant_id,
        "treatment_activities": ta_summary,
        "risk_assessments": ra_summary,
        "arco_requests": arco_summary,
        "consent_records": consent_summary,
        "incidents": incident_summary,
    }
