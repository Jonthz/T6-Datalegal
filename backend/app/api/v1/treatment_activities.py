"""US-RF35-1: Data Ingestion via Questionnaire — treatment activity CRUD."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_tenant_id,
    get_db,
    require_permission,
)
from app.models.audit_log import AuditLog
from app.models.treatment_activity import TreatmentActivity, area_prefix
from app.models.user import User
from app.schemas.treatment_activity import (
    TreatmentActivityCreate,
    TreatmentActivityRead,
    TreatmentActivityUpdate,
)

router = APIRouter(prefix="/treatment-activities", tags=["treatment-activities"])


# ── RAT helpers ──────────────────────────────────────────────────────────────

# Campos del RAT que son columnas de TreatmentActivity y pueden asignarse dinámicamente.
_RAT_EXTRA_FIELDS = (
    "complementary_legal_bases",
    "area",
    "operational_owner",
    "data_categories",
    "data_origin",
    "treatment_operations",
    "uses_profiling",
    "uses_ai",
    "automated_decision",
    "requires_dpia",
    "has_special_data",
    "involves_minors",
    "recipients",
    "processors",
    "system_platform",
    "technical_measures",
    "organizational_measures",
    "physical_measures",
    "legal_measures",
    "mtge_score",
    "mtge_result",
)


def generate_rat_code(db: Session, tenant_id: int, area: str | None) -> str:
    """Build a structured RAT identifier (PREFIX + 3-digit sequence) per tenant/area.

    Ejemplos: CRÉDITO -> CRE001, TESORERÍA -> TES001, IMPORTACIONES -> IMP001.
    El secuencial es contiguo por prefijo dentro del tenant.
    """
    prefix = area_prefix(area)
    existing = (
        db.query(TreatmentActivity.rat_code)
        .filter(
            TreatmentActivity.tenant_id == tenant_id,
            TreatmentActivity.rat_code.like(f"{prefix}%"),
        )
        .all()
    )
    max_seq = 0
    for (code,) in existing:
        if not code:
            continue
        tail = code[len(prefix) :]
        if tail.isdigit():
            max_seq = max(max_seq, int(tail))
    return f"{prefix}{max_seq + 1:03d}"


# ── US-RF04-1 Wizard inline schemas ──────────────────────────────────────────


class WizardStartBody(BaseModel):
    """WizardStartBody schema/model definition."""

    name: str
    purpose: str
    department_id: int | None = None
    area: str | None = None


class WizardLegalBasisBody(BaseModel):
    """WizardLegalBasisBody schema/model definition."""

    legal_basis: str = ""
    legal_bases: list[str] = []
    complementary_legal_bases: list[str] = []
    personal_data_types: list[str] = []
    data_subjects: list[str] = []


class WizardTransfersBody(BaseModel):
    """WizardTransfersBody schema/model definition."""

    is_cross_border: bool = False
    destination_countries: list[str] = []
    processor_name: str | None = None
    processor_country: str | None = None


# ── Wizard endpoints (MUST be before /{activity_id} routes) ──────────────────


@router.post(
    "/wizard/start", response_model=TreatmentActivityRead, status_code=status.HTTP_201_CREATED
)
def wizard_start(
    body: WizardStartBody,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Step 0: Create a DRAFT treatment activity with minimal info."""
    dept_id = body.department_id
    if current_user.role == "DEPT_HEAD":
        dept_id = current_user.department_id

    activity = TreatmentActivity(
        tenant_id=tenant_id,
        rat_code=generate_rat_code(db, tenant_id, getattr(body, "area", None)),
        owner_id=current_user.id,
        department_id=dept_id,
        name=body.name,
        purpose=body.purpose,
        area=getattr(body, "area", None),
        legal_basis="",
        legal_bases=[],
        personal_data_types=[],
        data_subjects=[],
        status="DRAFT",
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.patch("/wizard/{activity_id}/legal-basis", response_model=TreatmentActivityRead)
def wizard_legal_basis(
    activity_id: int,
    body: WizardLegalBasisBody,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "u"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Step 2: Set legal basis (principal + multiple), personal data types and subjects."""
    bases = list(body.legal_bases)
    principal = body.legal_basis.strip() or (bases[0] if bases else "")
    if not principal:
        raise HTTPException(status_code=422, detail="legal_basis cannot be empty.")
    if not bases:
        bases = [principal]
    activity = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.id == activity_id, TreatmentActivity.tenant_id == tenant_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")
    activity.legal_basis = principal
    activity.legal_bases = bases
    activity.complementary_legal_bases = body.complementary_legal_bases
    activity.personal_data_types = body.personal_data_types
    activity.data_subjects = body.data_subjects
    db.commit()
    db.refresh(activity)
    return activity


@router.patch("/wizard/{activity_id}/transfers", response_model=TreatmentActivityRead)
def wizard_transfers(
    activity_id: int,
    body: WizardTransfersBody,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "u"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Step 3: Set cross-border transfer details."""
    activity = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.id == activity_id, TreatmentActivity.tenant_id == tenant_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")
    activity.is_cross_border = body.is_cross_border
    activity.destination_countries = body.destination_countries
    activity.processor_name = body.processor_name
    activity.processor_country = body.processor_country
    db.commit()
    db.refresh(activity)
    return activity


@router.post("/wizard/{activity_id}/finalize", response_model=TreatmentActivityRead)
def wizard_finalize(
    activity_id: int,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Step 4: Validate and activate the treatment activity."""
    activity = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.id == activity_id, TreatmentActivity.tenant_id == tenant_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")
    if not activity.name or not activity.purpose:
        raise HTTPException(status_code=422, detail="name and purpose are required.")
    if not activity.legal_basis:
        raise HTTPException(
            status_code=422, detail="legal_basis is required. Complete Step 2 first."
        )
    activity.status = "ACTIVE"
    db.commit()
    db.refresh(activity)
    AuditLog.create_log(
        db,
        action="treatment_activity_wizard_finalized",
        resource="treatment_activities",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={activity_id}",
    )
    return activity


def _apply_dept_filter(q, user: User):
    """US-RF01-2: DEPT_HEAD sees only their department's activities."""
    if user.role == "DEPT_HEAD" and user.department_id is not None:
        return q.filter(TreatmentActivity.department_id == user.department_id)
    return q


@router.get("", response_model=list[TreatmentActivityRead])
def list_activities(
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    department_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List activities."""
    q = db.query(TreatmentActivity).filter(TreatmentActivity.tenant_id == tenant_id)
    q = _apply_dept_filter(q, current_user)
    if status_filter:
        q = q.filter(TreatmentActivity.status == status_filter)
    if department_id is not None and current_user.role != "DEPT_HEAD":
        q = q.filter(TreatmentActivity.department_id == department_id)
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=TreatmentActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    body: TreatmentActivityCreate,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    # US-RF01-2: DEPT_HEAD can only create for their own department
    """Create activity."""
    dept_id = body.department_id
    if current_user.role == "DEPT_HEAD":
        dept_id = current_user.department_id

    activity = TreatmentActivity(
        tenant_id=tenant_id,
        rat_code=generate_rat_code(db, tenant_id, body.area),
        owner_id=current_user.id,
        department_id=dept_id,
        name=body.name,
        purpose=body.purpose,
        legal_basis=body.legal_basis,
        legal_bases=body.legal_bases,
        personal_data_types=body.personal_data_types,
        data_subjects=body.data_subjects,
        retention_period_days=body.retention_period_days,
        is_cross_border=body.is_cross_border,
        destination_countries=body.destination_countries,
        processor_name=body.processor_name,
        processor_country=body.processor_country,
        status=body.status,
    )
    # Variables adicionales del RAT
    for field in _RAT_EXTRA_FIELDS:
        setattr(activity, field, getattr(body, field))
    db.add(activity)
    db.commit()
    db.refresh(activity)
    AuditLog.create_log(
        db,
        action="treatment_activity_created",
        resource="treatment_activities",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={activity.id} name={activity.name}",
    )
    return activity


@router.get("/{activity_id}", response_model=TreatmentActivityRead)
def get_activity(
    activity_id: int,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return activity."""
    activity = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.id == activity_id, TreatmentActivity.tenant_id == tenant_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")
    # US-RF01-2: dept isolation
    if current_user.role == "DEPT_HEAD" and activity.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access restricted to your department.")
    return activity


@router.patch("/{activity_id}", response_model=TreatmentActivityRead)
def update_activity(
    activity_id: int,
    body: TreatmentActivityUpdate,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update activity."""
    activity = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.id == activity_id, TreatmentActivity.tenant_id == tenant_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")
    if current_user.role == "DEPT_HEAD" and activity.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access restricted to your department.")

    data = body.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(activity, field, value)

    # Sincronizar base principal <-> bases múltiples
    if "legal_bases" in data and activity.legal_bases:
        activity.legal_basis = activity.legal_bases[0]
    elif "legal_basis" in data and not activity.legal_bases:
        activity.legal_bases = [activity.legal_basis]

    # Generar identificador estructurado si se define el área y aún no existe
    if not activity.rat_code and activity.area:
        activity.rat_code = generate_rat_code(db, tenant_id, activity.area)

    db.commit()
    db.refresh(activity)
    AuditLog.create_log(
        db,
        action="treatment_activity_updated",
        resource="treatment_activities",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={activity_id}",
    )
    return activity


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    current_user: Annotated[User, Depends(require_permission("treatment_activities", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete activity."""
    activity = (
        db.query(TreatmentActivity)
        .filter(TreatmentActivity.id == activity_id, TreatmentActivity.tenant_id == tenant_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")
    activity.status = "ARCHIVED"
    db.commit()
    AuditLog.create_log(
        db,
        action="treatment_activity_archived",
        resource="treatment_activities",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={activity_id}",
    )
