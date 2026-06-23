"""US-RF28-1: Automatic progress tracking and reports for data inventory."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.information_asset import InformationAsset
from app.models.risk_assessment import RiskAssessment
from app.models.treatment_activity import TreatmentActivity
from app.models.user import User

router = APIRouter(prefix="/data-inventory", tags=["data-inventory"])


class TreatmentActivityProgress(BaseModel):
    """TreatmentActivityProgress schema/model definition."""
    total: int
    draft: int
    active: int
    archived: int
    with_risk_assessment: int
    completion_pct: float


class DataInventoryProgress(BaseModel):
    """US-RF28-1: Automatic progress report."""

    as_of: datetime
    treatment_activities: TreatmentActivityProgress
    information_assets_total: int
    risk_assessments_total: int
    risk_distribution: dict[str, int]
    classification_distribution: dict[str, int]


@router.get("/progress", response_model=DataInventoryProgress)
def get_inventory_progress(
    _: Annotated[User, Depends(require_permission("data_inventory", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """US-RF28-1: Returns automatic progress and reports for data inventory."""
    # Treatment activities breakdown
    activities = db.query(TreatmentActivity).filter(TreatmentActivity.tenant_id == tenant_id).all()
    total = len(activities)
    draft = sum(1 for a in activities if a.status == "DRAFT")
    active = sum(1 for a in activities if a.status == "ACTIVE")
    archived = sum(1 for a in activities if a.status == "ARCHIVED")

    # Count activities that have at least one risk assessment
    assessed_ids = set(
        row[0]
        for row in db.query(RiskAssessment.treatment_activity_id)
        .filter(RiskAssessment.tenant_id == tenant_id)
        .distinct()
        .all()
    )
    with_ra = sum(1 for a in activities if a.id in assessed_ids)
    completion_pct = round((with_ra / total * 100) if total > 0 else 0.0, 1)

    # Risk assessment breakdown by level
    assessments = db.query(RiskAssessment).filter(RiskAssessment.tenant_id == tenant_id).all()
    risk_dist: dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for ra in assessments:
        risk_dist[ra.risk_level] = risk_dist.get(ra.risk_level, 0) + 1

    # Information assets classification distribution
    assets = db.query(InformationAsset).filter(InformationAsset.tenant_id == tenant_id).all()
    class_dist: dict[str, int] = {}
    for asset in assets:
        code = asset.classification_level_code
        class_dist[code] = class_dist.get(code, 0) + 1

    return DataInventoryProgress(
        as_of=datetime.now(timezone.utc),
        treatment_activities=TreatmentActivityProgress(
            total=total,
            draft=draft,
            active=active,
            archived=archived,
            with_risk_assessment=with_ra,
            completion_pct=completion_pct,
        ),
        information_assets_total=len(assets),
        risk_assessments_total=len(assessments),
        risk_distribution=risk_dist,
        classification_distribution=class_dist,
    )
