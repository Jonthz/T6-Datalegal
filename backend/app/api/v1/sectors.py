"""US-RF34-1: Economic sector configuration with auto-suggestions."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(prefix="/sectors", tags=["sectors"])

# Sector catalog: code -> {label, data_types, activities, document_templates}
SECTOR_CATALOG: dict[str, dict] = {
    "HEALTH": {
        "label": "Healthcare / Clinic",
        "suggested_data_types": [
            "National ID",
            "Medical Record",
            "Health Data",
            "Insurance Number",
            "Emergency Contact",
            "Blood Type",
            "Prescription Data",
        ],
        "suggested_activities": [
            "Patient registration",
            "Medical history processing",
            "Insurance billing",
            "Appointment scheduling",
            "Clinical trial data",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "CUSTOMER_NOTICE", "PROCESSOR_CONTRACT"],
    },
    "EDUCATION": {
        "label": "Education",
        "suggested_data_types": [
            "National ID",
            "Student ID",
            "Academic Records",
            "Parent/Guardian Data",
            "Enrollment Data",
            "Financial Aid Data",
        ],
        "suggested_activities": [
            "Student enrollment",
            "Academic performance tracking",
            "Financial aid processing",
            "Alumni communications",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "CUSTOMER_NOTICE"],
    },
    "FINANCE": {
        "label": "Financial Services / Banking",
        "suggested_data_types": [
            "National ID",
            "Credit Card Number",
            "Bank Account",
            "Tax ID (RUC)",
            "Income Data",
            "Credit Score",
            "Transaction History",
        ],
        "suggested_activities": [
            "Credit assessment",
            "Transaction processing",
            "KYC/AML compliance",
            "Insurance underwriting",
            "Investment portfolio management",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "CONTRACTUAL_CLAUSE", "PROCESSOR_CONTRACT"],
    },
    "RETAIL": {
        "label": "Retail / E-commerce",
        "suggested_data_types": [
            "Name",
            "Email",
            "Phone",
            "Purchase History",
            "Shipping Address",
            "Payment Method",
            "Cookie Identifier",
        ],
        "suggested_activities": [
            "Order processing",
            "Loyalty program",
            "Marketing communications",
            "Customer support",
            "Fraud detection",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "COOKIE_NOTICE", "CUSTOMER_NOTICE"],
    },
    "MARKETING": {
        "label": "Marketing / Advertising",
        "suggested_data_types": [
            "Email",
            "Phone",
            "Behavioral Data",
            "Cookie Identifier",
            "Location Data",
            "Social Media Identifier",
        ],
        "suggested_activities": [
            "Email marketing",
            "Behavioral profiling",
            "Targeted advertising",
            "Campaign analytics",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "COOKIE_NOTICE"],
    },
    "LEGAL": {
        "label": "Legal / Law Firm",
        "suggested_data_types": [
            "National ID",
            "Legal Case Data",
            "Financial Data",
            "Judicial Records",
            "Contract Data",
        ],
        "suggested_activities": [
            "Client representation",
            "Contract management",
            "Litigation support",
            "Due diligence",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "CONTRACTUAL_CLAUSE", "PROCESSOR_CONTRACT"],
    },
    "GOVERNMENT": {
        "label": "Government / Public Sector",
        "suggested_data_types": [
            "National ID",
            "Tax Records",
            "Social Security",
            "Civil Registry",
            "Property Records",
            "Criminal Records",
        ],
        "suggested_activities": [
            "Public service delivery",
            "Tax administration",
            "Social benefits",
            "Regulatory enforcement",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "CUSTOMER_NOTICE"],
    },
    "TECHNOLOGY": {
        "label": "Technology / SaaS",
        "suggested_data_types": [
            "Email",
            "Usage Logs",
            "IP Address",
            "Device Identifier",
            "Cookie Identifier",
            "API Keys",
        ],
        "suggested_activities": [
            "User account management",
            "Product analytics",
            "Customer support",
            "Cloud data processing",
        ],
        "suggested_templates": ["PRIVACY_POLICY", "COOKIE_NOTICE", "PROCESSOR_CONTRACT"],
    },
}


class SectorSuggestions(BaseModel):
    """Sector catalog entry with auto-suggested data types, activities, and templates."""

    sector_code: str
    label: str
    suggested_data_types: list[str]
    suggested_activities: list[str]
    suggested_templates: list[str]


class SectorUpdate(BaseModel):
    """Request body for updating the company's economic sector."""

    sector: str


@router.get("", response_model=list[SectorSuggestions])
def list_sectors(
    _: Annotated[User, Depends(require_permission("sectors", "r"))],
):
    """List all economic sectors with suggestions (US-RF34-1)."""
    return [SectorSuggestions(sector_code=code, **data) for code, data in SECTOR_CATALOG.items()]


@router.get("/{sector_code}", response_model=SectorSuggestions)
def get_sector_suggestions(
    sector_code: str,
    _: Annotated[User, Depends(require_permission("sectors", "r"))],
):
    """Get auto-suggestions for a specific economic sector (US-RF34-1)."""
    sector_code = sector_code.upper()
    data = SECTOR_CATALOG.get(sector_code)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Sector '{sector_code}' not found. Valid: {list(SECTOR_CATALOG)}",
        )
    return SectorSuggestions(sector_code=sector_code, **data)


@router.patch("/company/sector", response_model=dict)
def update_company_sector(
    body: SectorUpdate,
    current_user: Annotated[User, Depends(require_permission("sectors", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update the company's economic sector and get pre-populated suggestions (US-RF34-1)."""
    sector_code = body.sector.upper()
    if sector_code not in SECTOR_CATALOG:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sector '{sector_code}'. Valid: {list(SECTOR_CATALOG)}",
        )

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    tenant.sector = sector_code
    db.commit()

    AuditLog.create_log(
        db,
        action="company_sector_updated",
        resource="sectors",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"sector={sector_code}",
    )
    suggestions = SECTOR_CATALOG[sector_code]
    return {
        "sector": sector_code,
        "label": suggestions["label"],
        "suggestions": suggestions,
        "message": f"Sector updated. {len(suggestions['suggested_data_types'])} data types, "
        f"{len(suggestions['suggested_activities'])} activities, and "
        f"{len(suggestions['suggested_templates'])} document templates pre-selected.",
    }
