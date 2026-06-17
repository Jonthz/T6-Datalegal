from datetime import date, datetime

from pydantic import BaseModel

EXPIRY_ACTIONS = ["DELETE", "ANONYMIZE", "REVIEW"]
RETENTION_STATUSES = ["ACTIVE", "UNDER_REVIEW", "EXPIRED", "CLOSED"]
REVIEW_DECISIONS = ["RETAIN", "DELETE", "ANONYMIZE"]


class RetentionPolicyCreate(BaseModel):
    name: str
    data_category: str
    retention_days: int
    action_on_expiry: str = "REVIEW"
    legal_basis: str = ""


class RetentionPolicyUpdate(BaseModel):
    name: str | None = None
    data_category: str | None = None
    retention_days: int | None = None
    action_on_expiry: str | None = None
    legal_basis: str | None = None
    is_active: bool | None = None


class RetentionPolicyRead(BaseModel):
    id: int
    tenant_id: int
    name: str
    data_category: str
    retention_days: int
    action_on_expiry: str
    legal_basis: str
    is_active: bool

    model_config = {"from_attributes": True}


class RetentionRecordCreate(BaseModel):
    information_asset_id: int
    policy_id: int | None = None
    expiry_date: date
    legal_hold: bool = False
    hold_justification: str = ""


class RetentionRecordUpdate(BaseModel):
    status: str | None = None
    legal_hold: bool | None = None
    hold_justification: str | None = None
    review_decision: str | None = None
    decision_rationale: str | None = None


class RetentionRecordRead(BaseModel):
    id: int
    tenant_id: int
    information_asset_id: int
    policy_id: int | None
    expiry_date: date
    status: str
    legal_hold: bool
    hold_justification: str
    review_decision: str | None
    decision_rationale: str
    reviewed_by_id: int | None

    model_config = {"from_attributes": True}


class ExpiredUnderReviewReport(BaseModel):
    """US-RF29-1: Report of expired records that require DPO decision."""

    total: int
    records: list[RetentionRecordRead]
    as_of: datetime


class RetentionExecutionLogRead(BaseModel):
    """US-RF11-1: Audit record for a retention execution run."""

    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    policy_id: int | None
    executed_by_id: int | None
    records_processed: int
    records_exceptions: int
    status: str
    log_details: dict
    run_type: str
    created_at: datetime
