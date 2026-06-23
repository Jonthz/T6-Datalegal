from datetime import datetime

from pydantic import BaseModel


class ProgramCreate(BaseModel):
    """ProgramCreate schema/model definition."""
    title: str
    description: str = ""


class ProgramUpdate(BaseModel):
    """ProgramUpdate schema/model definition."""
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ProgramRead(BaseModel):
    """ProgramRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    title: str
    description: str
    is_active: bool
    created_at: datetime


class ModuleCreate(BaseModel):
    """ModuleCreate schema/model definition."""
    title: str
    description: str = ""
    order: int = 0


class ModuleUpdate(BaseModel):
    """ModuleUpdate schema/model definition."""
    title: str | None = None
    description: str | None = None
    order: int | None = None


class ModuleRead(BaseModel):
    """ModuleRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    program_id: int
    title: str
    description: str
    order: int
    created_at: datetime


class MaterialCreate(BaseModel):
    """MaterialCreate schema/model definition."""
    title: str
    content_type: str = "text"
    url: str | None = None
    content: str = ""


class MaterialUpdate(BaseModel):
    """MaterialUpdate schema/model definition."""
    title: str | None = None
    content_type: str | None = None
    url: str | None = None
    content: str | None = None


class MaterialRead(BaseModel):
    """MaterialRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    module_id: int
    title: str
    content_type: str
    url: str | None
    content: str
    created_at: datetime


class EnrollmentCreate(BaseModel):
    """EnrollmentCreate schema/model definition."""
    user_id: int
    program_id: int


class EnrollmentUpdate(BaseModel):
    """EnrollmentUpdate schema/model definition."""
    progress_pct: int | None = None
    completed_at: datetime | None = None


class EnrollmentRead(BaseModel):
    """EnrollmentRead schema/model definition."""
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    user_id: int
    program_id: int
    enrolled_at: datetime | None
    completed_at: datetime | None
    progress_pct: int
    created_at: datetime
