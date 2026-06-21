"""US-RF14-1: Parameterized and versioned legal document generation.
US-RF33-1: Expanded contractual document templates.
"""

from datetime import date

from sqlalchemy import JSON, Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBase

# US-RF14-1 template types
CORE_TEMPLATE_TYPES = {"PRIVACY_POLICY", "SECURITY_POLICY", "COOKIE_NOTICE"}

# US-RF33-1 expanded template types
EXPANDED_TEMPLATE_TYPES = {"CUSTOMER_NOTICE", "CONTRACTUAL_CLAUSE", "PROCESSOR_CONTRACT"}

ALL_TEMPLATE_TYPES = CORE_TEMPLATE_TYPES | EXPANDED_TEMPLATE_TYPES


class LegalDocument(TenantBase):
    """Versioned legal document generated from a parameterized template."""

    __tablename__ = "legal_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    # JSON parameters used to render the template (company name, DPO, sector…)
    parameters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Rendered text content (not the binary PDF — that is generated on demand)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
