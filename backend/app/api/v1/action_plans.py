"""US-RF43-1: Action plan management with automated generation from risk assessments."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.action_plan import ActionPlan, ActionPlanTemplate
from app.models.audit_log import AuditLog
from app.models.risk_assessment import RiskAssessment
from app.models.user import User
from app.schemas.action_plan import (
    ActionPlanCreate,
    ActionPlanRead,
    ActionPlanTemplateCreate,
    ActionPlanTemplateRead,
    ActionPlanUpdate,
)

router = APIRouter(prefix="/action-plans", tags=["action-plans"])


@router.post("/templates", response_model=ActionPlanTemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(
    body: ActionPlanTemplateCreate,
    current_user: Annotated[User, Depends(require_permission("action_plans", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    template = ActionPlanTemplate(
        tenant_id=tenant_id,
        name=body.name,
        description=body.description,
        applies_to_level=body.applies_to_level,
        default_tasks=body.default_tasks,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/templates", response_model=list[ActionPlanTemplateRead])
def list_templates(
    current_user: Annotated[User, Depends(require_permission("action_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(ActionPlanTemplate)
        .filter(ActionPlanTemplate.tenant_id == tenant_id, ActionPlanTemplate.is_active == True)  # noqa: E712
        .all()
    )


@router.post("/auto-generate", response_model=list[ActionPlanRead], status_code=status.HTTP_201_CREATED)
def auto_generate_plans(
    current_user: Annotated[User, Depends(require_permission("action_plans", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Auto-generate action plans for all HIGH/MEDIUM risk assessments without a plan."""
    # Get all HIGH/MEDIUM risk assessments for this tenant
    assessments = (
        db.query(RiskAssessment)
        .filter(
            RiskAssessment.tenant_id == tenant_id,
            RiskAssessment.risk_level.in_(["HIGH", "MEDIUM"]),
        )
        .all()
    )

    # Find assessments that already have a plan
    existing_ra_ids = {
        plan.risk_assessment_id
        for plan in db.query(ActionPlan)
        .filter(ActionPlan.tenant_id == tenant_id, ActionPlan.risk_assessment_id.isnot(None))
        .all()
    }

    created = []
    for ra in assessments:
        if ra.id in existing_ra_ids:
            continue
        # Find a matching template
        template = (
            db.query(ActionPlanTemplate)
            .filter(
                ActionPlanTemplate.tenant_id == tenant_id,
                ActionPlanTemplate.is_active == True,  # noqa: E712
                ActionPlanTemplate.applies_to_level.in_([ra.risk_level, "ANY"]),
            )
            .first()
        )
        plan = ActionPlan(
            tenant_id=tenant_id,
            risk_assessment_id=ra.id,
            template_id=template.id if template else None,
            title=f"Auto: {ra.risk_level} Risk - Activity {ra.treatment_activity_id}",
            tasks=list(template.default_tasks) if template else [],
            auto_generated=True,
            created_by_id=current_user.id,
        )
        db.add(plan)
        created.append(plan)

    db.commit()
    for p in created:
        db.refresh(p)

    AuditLog.create_log(
        db, action="action_plans_auto_generated", resource="action_plans",
        tenant_id=tenant_id, user_id=current_user.id, detail=f"created={len(created)}",
    )
    return created


@router.post("", response_model=ActionPlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(
    body: ActionPlanCreate,
    current_user: Annotated[User, Depends(require_permission("action_plans", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    plan = ActionPlan(
        tenant_id=tenant_id,
        risk_assessment_id=body.risk_assessment_id,
        template_id=body.template_id,
        title=body.title,
        description=body.description,
        tasks=body.tasks,
        target_date=body.target_date,
        created_by_id=current_user.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=list[ActionPlanRead])
def list_plans(
    current_user: Annotated[User, Depends(require_permission("action_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    plan_status: str | None = Query(None),
    risk_assessment_id: int | None = Query(None),
):
    q = db.query(ActionPlan).filter(ActionPlan.tenant_id == tenant_id)
    if plan_status:
        q = q.filter(ActionPlan.status == plan_status)
    if risk_assessment_id:
        q = q.filter(ActionPlan.risk_assessment_id == risk_assessment_id)
    return q.order_by(ActionPlan.id.desc()).all()


@router.get("/{plan_id}", response_model=ActionPlanRead)
def get_plan(
    plan_id: int,
    current_user: Annotated[User, Depends(require_permission("action_plans", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    plan = db.query(ActionPlan).filter(
        ActionPlan.id == plan_id, ActionPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found.")
    return plan


@router.patch("/{plan_id}", response_model=ActionPlanRead)
def update_plan(
    plan_id: int,
    body: ActionPlanUpdate,
    current_user: Annotated[User, Depends(require_permission("action_plans", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    plan = db.query(ActionPlan).filter(
        ActionPlan.id == plan_id, ActionPlan.tenant_id == tenant_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan