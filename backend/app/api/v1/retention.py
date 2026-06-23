"""RF-11 / US-RF29-1: Data retention policies and expired-data alerts."""

from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.retention import RetentionExecutionLog, RetentionPolicy, RetentionRecord
from app.models.user import User
from app.schemas.retention import (
    ExpiredUnderReviewReport,
    RetentionExecutionLogRead,
    RetentionPolicyCreate,
    RetentionPolicyRead,
    RetentionPolicyUpdate,
    RetentionRecordCreate,
    RetentionRecordRead,
    RetentionRecordUpdate,
)

router = APIRouter(prefix="/retention", tags=["retention"])


# ── Policies ─────────────────────────────────────────────────────────────────


@router.get("/policies", response_model=list[RetentionPolicyRead])
def list_policies(
    _: Annotated[User, Depends(require_permission("retention", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List policies."""
    return (
        db.query(RetentionPolicy)
        .filter(RetentionPolicy.tenant_id == tenant_id, RetentionPolicy.is_active.is_(True))
        .all()
    )


@router.post("/policies", response_model=RetentionPolicyRead, status_code=status.HTTP_201_CREATED)
def create_policy(
    body: RetentionPolicyCreate,
    current_user: Annotated[User, Depends(require_permission("retention", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create policy."""
    policy = RetentionPolicy(
        tenant_id=tenant_id,
        name=body.name,
        data_category=body.data_category,
        retention_days=body.retention_days,
        action_on_expiry=body.action_on_expiry,
        legal_basis=body.legal_basis,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    AuditLog.create_log(
        db,
        action="retention_policy_created",
        resource="retention",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={policy.id} category={policy.data_category}",
    )
    return policy


@router.patch("/policies/{policy_id}", response_model=RetentionPolicyRead)
def update_policy(
    policy_id: int,
    body: RetentionPolicyUpdate,
    current_user: Annotated[User, Depends(require_permission("retention", "u"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update policy."""
    policy = (
        db.query(RetentionPolicy)
        .filter(RetentionPolicy.id == policy_id, RetentionPolicy.tenant_id == tenant_id)
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail="Retention policy not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(policy, field, value)
    db.commit()
    db.refresh(policy)
    return policy


# ── Records ───────────────────────────────────────────────────────────────────


@router.get("/records", response_model=list[RetentionRecordRead])
def list_records(
    _: Annotated[User, Depends(require_permission("retention", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    record_status: str | None = None,
    legal_hold: bool | None = None,
):
    """List records."""
    q = db.query(RetentionRecord).filter(RetentionRecord.tenant_id == tenant_id)
    if record_status:
        q = q.filter(RetentionRecord.status == record_status)
    if legal_hold is not None:
        q = q.filter(RetentionRecord.legal_hold == legal_hold)
    return q.all()


@router.post("/records", response_model=RetentionRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(
    body: RetentionRecordCreate,
    current_user: Annotated[User, Depends(require_permission("retention", "c"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create record."""
    record = RetentionRecord(
        tenant_id=tenant_id,
        information_asset_id=body.information_asset_id,
        policy_id=body.policy_id,
        expiry_date=body.expiry_date,
        legal_hold=body.legal_hold,
        hold_justification=body.hold_justification,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/records/{record_id}", response_model=RetentionRecordRead)
def update_record(
    record_id: int,
    body: RetentionRecordUpdate,
    current_user: Annotated[User, Depends(require_permission("retention", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update record."""
    record = (
        db.query(RetentionRecord)
        .filter(RetentionRecord.id == record_id, RetentionRecord.tenant_id == tenant_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Retention record not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(record, field, value)

    if body.review_decision is not None:
        record.reviewed_by_id = current_user.id
        record.status = "CLOSED"

    db.commit()
    db.refresh(record)
    AuditLog.create_log(
        db,
        action="retention_record_updated",
        resource="retention",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={record_id} decision={record.review_decision}",
    )
    return record


# ── US-RF29-1: Expired-under-review report ───────────────────────────────────


@router.get("/expired-under-review", response_model=ExpiredUnderReviewReport)
def expired_under_review_report(
    _: Annotated[User, Depends(require_permission("retention", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return all records where expiry_date has passed AND legal_hold=True, requiring DPO decision."""  # pylint: disable=line-too-long
    today = date.today()
    records = (
        db.query(RetentionRecord)
        .filter(
            RetentionRecord.tenant_id == tenant_id,
            RetentionRecord.expiry_date < today,
            RetentionRecord.legal_hold.is_(True),
            RetentionRecord.status.in_(["ACTIVE", "UNDER_REVIEW"]),
        )
        .all()
    )
    # Mark newly expired ones as UNDER_REVIEW
    for r in records:
        if r.status == "ACTIVE":
            r.status = "UNDER_REVIEW"
    db.commit()

    return ExpiredUnderReviewReport(
        total=len(records),
        records=records,
        as_of=datetime.now(timezone.utc),
    )


# ── US-RF11-1: Retention execution and audit log ───────────────────────────────


class RetentionExecuteBody(BaseModel):
    """RetentionExecuteBody schema/model definition."""
    policy_id: int | None = None
    run_type: str = "MANUAL"


@router.post(
    "/execute", response_model=RetentionExecutionLogRead, status_code=status.HTTP_201_CREATED
)
def execute_retention(
    body: RetentionExecuteBody,
    current_user: Annotated[User, Depends(require_permission("retention", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Run retention policies: mark expired ACTIVE records as UNDER_REVIEW."""
    today = date.today()

    policies_q = db.query(RetentionPolicy).filter(
        RetentionPolicy.tenant_id == tenant_id,
        RetentionPolicy.is_active.is_(True),  # noqa: E712
    )
    if body.policy_id:
        policies_q = policies_q.filter(RetentionPolicy.id == body.policy_id)
    policies = policies_q.all()

    processed = 0
    exceptions = 0
    log_details: dict = {"processed_ids": [], "exception_ids": []}

    for policy in policies:
        expired = (
            db.query(RetentionRecord)
            .filter(
                RetentionRecord.tenant_id == tenant_id,
                RetentionRecord.policy_id == policy.id,
                RetentionRecord.status == "ACTIVE",
                RetentionRecord.expiry_date <= today,
            )
            .all()
        )
        for record in expired:
            try:
                record.status = "UNDER_REVIEW"
                processed += 1
                log_details["processed_ids"].append(record.id)
            except Exception:  # pylint: disable=broad-exception-caught
                exceptions += 1
                log_details["exception_ids"].append(record.id)

    db.flush()

    run_status = "SUCCESS" if exceptions == 0 else ("PARTIAL" if processed > 0 else "FAILED")
    execution_log = RetentionExecutionLog(
        tenant_id=tenant_id,
        policy_id=body.policy_id,
        executed_by_id=current_user.id,
        records_processed=processed,
        records_exceptions=exceptions,
        status=run_status,
        log_details=log_details,
        run_type=body.run_type,
    )
    db.add(execution_log)
    db.commit()
    db.refresh(execution_log)
    return execution_log


@router.get("/execution-logs", response_model=list[RetentionExecutionLogRead])
def list_execution_logs(
    current_user: Annotated[User, Depends(require_permission("retention", "r"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List retention execution logs for this tenant."""
    return (
        db.query(RetentionExecutionLog)
        .filter(RetentionExecutionLog.tenant_id == tenant_id)
        .order_by(RetentionExecutionLog.id.desc())
        .all()
    )
