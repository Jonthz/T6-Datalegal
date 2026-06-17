from datetime import datetime

from pydantic import BaseModel


class CatalogEntryCreate(BaseModel):
    type: str
    code: str
    label: str
    description: str = ""


class CatalogEntryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    type: str
    code: str
    label: str
    description: str
    is_active: bool
    # US-RF05-1: classification fields
    sensitivity: str | None
    criticality: str | None
    # US-RF20-1: versioning
    version: int
    created_at: datetime


class BulkLoadRequest(BaseModel):
    entries: list[CatalogEntryCreate]
