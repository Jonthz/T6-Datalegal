from datetime import datetime

from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    head_user_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    head_user_id: int | None = None


class DepartmentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    name: str
    head_user_id: int | None
    created_at: datetime
