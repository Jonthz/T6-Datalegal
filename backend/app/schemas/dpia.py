"""Pydantic schemas for DPIA (Data Protection Impact Assessment) — US-RF09-1."""

from datetime import datetime

from pydantic import BaseModel


class DPIACreate(BaseModel):
    treatment_activity_id: int
    step1_description: str = ""
    step2_risk_analysis: str = ""
    step3_mitigations: str = ""


class DPIAUpdate(BaseModel):
    step1_description: str | None = None
    step2_risk_analysis: str | None = None
    step3_mitigations: str | None = None
    status: str | None = None


class DPIARead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    treatment_activity_id: int
    step1_description: str
    step2_risk_analysis: str
    step3_mitigations: str
    status: str
    signed_at: datetime | None
    signed_by_id: int | None
    version: int
    created_at: datetime
    updated_at: datetime
