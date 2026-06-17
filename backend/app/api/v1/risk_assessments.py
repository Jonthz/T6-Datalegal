"""US-RF37-1: Risk Assessment Questionnaire Integration.

Score = Probability × Impact (ISO/IEC 27005).
GREEN 1-8 | YELLOW 9-16 | RED 17-25.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.risk_assessment import RiskAssessment
from app.models.treatment_activity import TreatmentActivity
from app.models.user import User
from app.schemas.risk_assessment import (
    QUESTIONNAIRE_QUESTIONS,
    QuestionnaireSchema,
    RiskAssessmentCreate,
    RiskAssessmentRead,
    RiskAssessmentUpdate,
    compute_scores,
)

router = APIRouter(prefix="/risk-assessments", tags=["risk-assessments"])


@router.get("/questionnaire", response_model=QuestionnaireSchema)
def get_questionnaire(
    _: Annotated[User, Depends(require_permission("risk_assessments", "r"))],
):
    """Return the standard risk questionnaire structure."""
    return QuestionnaireSchema(questions=QUESTIONNAIRE_QUESTIONS)


@router.get("/dashboard")
def get_risk_dashboard(
    current_user: Annotated[User, Depends(require_permission("risk_assessments", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """US-RF10-1: Risk score summary with GREEN/YELLOW/RED counts."""
    assessments = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.tenant_id == tenant_id)
        .all()
    )
    green = sum(1 for a in assessments if a.risk_level == "LOW")
    yellow = sum(1 for a in assessments if a.risk_level == "MEDIUM")
    red = sum(1 for a in assessments if a.risk_level == "HIGH")
    total = len(assessments)
    avg_score = sum(a.risk_score for a in assessments) / total if total else 0.0
    high_risk = sorted(
        [a for a in assessments if a.risk_level == "HIGH"],
        key=lambda a: a.risk_score,
        reverse=True,
    )[:10]
    return {
        "total": total,
        "green": green,
        "yellow": yellow,
        "red": red,
        "by_level": {"LOW": green, "MEDIUM": yellow, "HIGH": red},
        "avg_score": round(avg_score, 2),
        "high_risk_activities": [
            {
                "assessment_id": a.id,
                "treatment_activity_id": a.treatment_activity_id,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
            }
            for a in high_risk
        ],
    }


@router.post("", response_model=RiskAssessmentRead, status_code=status.HTTP_201_CREATED)
def create_assessment(
    body: RiskAssessmentCreate,
    current_user: Annotated[User, Depends(require_permission("risk_assessments", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    # Verify the treatment activity belongs to this tenant
    activity = db.query(TreatmentActivity).filter(
        TreatmentActivity.id == body.treatment_activity_id,
        TreatmentActivity.tenant_id == tenant_id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Treatment activity not found.")

    # Gateway check: q1 must be True to proceed
    if not body.responses.get("q1", False):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gateway check failed: this activity does not involve personal data (q1=false). No risk assessment required.",
        )

    probability, impact, risk_score, risk_level = compute_scores(body.responses)

    assessment = RiskAssessment(
        tenant_id=tenant_id,
        treatment_activity_id=body.treatment_activity_id,
        analyst_id=current_user.id,
        responses=body.responses,
        probability=probability,
        impact=impact,
        risk_score=risk_score,
        risk_level=risk_level,
        status="COMPLETED",
        notes=body.notes,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    AuditLog.create_log(
        db,
        action="risk_assessment_created",
        resource="risk_assessments",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={assessment.id} activity={body.treatment_activity_id} score={risk_score} level={risk_level}",
    )
    return assessment


@router.get("", response_model=list[RiskAssessmentRead])
def list_assessments(
    current_user: Annotated[User, Depends(require_permission("risk_assessments", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    treatment_activity_id: int | None = None,
    risk_level: str | None = None,
):
    q = db.query(RiskAssessment).filter(RiskAssessment.tenant_id == tenant_id)
    if treatment_activity_id:
        q = q.filter(RiskAssessment.treatment_activity_id == treatment_activity_id)
    if risk_level:
        q = q.filter(RiskAssessment.risk_level == risk_level)
    return q.all()


@router.get("/{assessment_id}", response_model=RiskAssessmentRead)
def get_assessment(
    assessment_id: int,
    _: Annotated[User, Depends(require_permission("risk_assessments", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    assessment = db.query(RiskAssessment).filter(
        RiskAssessment.id == assessment_id, RiskAssessment.tenant_id == tenant_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found.")
    return assessment


@router.patch("/{assessment_id}", response_model=RiskAssessmentRead)
def update_assessment(
    assessment_id: int,
    body: RiskAssessmentUpdate,
    current_user: Annotated[User, Depends(require_permission("risk_assessments", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    assessment = db.query(RiskAssessment).filter(
        RiskAssessment.id == assessment_id, RiskAssessment.tenant_id == tenant_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found.")

    if body.responses is not None:
        if not body.responses.get("q1", False):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Gateway check failed: q1 must be true.",
            )
        probability, impact, risk_score, risk_level = compute_scores(body.responses)
        assessment.responses = body.responses
        assessment.probability = probability
        assessment.impact = impact
        assessment.risk_score = risk_score
        assessment.risk_level = risk_level

    if body.notes is not None:
        assessment.notes = body.notes
    if body.status is not None:
        assessment.status = body.status

    db.commit()
    db.refresh(assessment)
    AuditLog.create_log(
        db,
        action="risk_assessment_updated",
        resource="risk_assessments",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={assessment_id}",
    )
    return assessment
