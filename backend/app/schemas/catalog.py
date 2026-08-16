from datetime import datetime

from pydantic import BaseModel


class CatalogEntryCreate(BaseModel):
    """CatalogEntryCreate schema/model definition.

    `sensitivity`/`criticality` son opcionales: si no se envían, se intenta la
    clasificación automática según el `code` (US-RF05-1).
    """
    type: str
    code: str
    label: str
    description: str = ""
    sensitivity: str | None = None
    criticality: str | None = None


class CatalogEntryRead(BaseModel):
    """CatalogEntryRead schema/model definition."""
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


class CatalogEntryVersionRead(BaseModel):
    """US-RF20-1: A single historical version of a catalog entry."""
    model_config = {"from_attributes": True}

    id: int
    catalog_entry_id: int
    version: int
    label: str
    description: str
    sensitivity: str | None
    criticality: str | None
    is_active: bool
    changed_by_id: int | None
    created_at: datetime


class BulkLoadRequest(BaseModel):
    """BulkLoadRequest schema/model definition."""
    entries: list[CatalogEntryCreate]
