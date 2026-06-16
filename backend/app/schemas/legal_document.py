"""Pydantic schemas for legal document generation — US-RF14-1, US-RF33-1."""

from datetime import date, datetime

from pydantic import BaseModel


class LegalDocumentCreate(BaseModel):
    doc_type: str
    title: str
    version: str
    effective_date: date
    parameters: dict = {}
    content: str = ""


class LegalDocumentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    tenant_id: int
    doc_type: str
    title: str
    version: str
    effective_date: date
    parameters: dict
    content: str
    is_current: bool
    created_by_id: int | None
    created_at: datetime


class TemplateTypeInfo(BaseModel):
    """Metadata about a supported template type."""

    doc_type: str
    category: str  # CORE | EXPANDED
    description: str
