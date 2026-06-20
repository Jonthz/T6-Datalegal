from datetime import datetime

from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    """DepartmentCreate schema/model definition."""
    name: str
    head_user_id: int | None = None


class DepartmentUpdate(BaseModel):
    """DepartmentUpdate schema/model definition."""
    name: str | None = None
    head_user_id: int | None = None


class DepartmentRead(BaseModel):
    """DepartmentRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    name: str
    head_user_id: int | None
    created_at: datetime
