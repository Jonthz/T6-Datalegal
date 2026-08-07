from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.catalog import (
    DATA_CRITICALITIES,
    DATA_SENSITIVITIES,
    CatalogEntry,
    CatalogEntryVersion,
)
from app.models.user import User
from app.schemas.catalog import (
    BulkLoadRequest,
    CatalogEntryCreate,
    CatalogEntryRead,
    CatalogEntryVersionRead,
)

# US-RF05-1: Auto-classification lookup for LOPDP data categories
_LOPDP_AUTO_CLASSIFY: dict[str, tuple[str, str]] = {
    # code -> (sensitivity, criticality)
    "NATIONAL_ID": ("ORDINARY", "HIGH"),
    "PASSPORT": ("ORDINARY", "HIGH"),
    "EMAIL": ("ORDINARY", "MEDIUM"),
    "PHONE": ("ORDINARY", "MEDIUM"),
    "ADDRESS": ("ORDINARY", "MEDIUM"),
    "BIRTH_DATE": ("ORDINARY", "MEDIUM"),
    "CREDIT_CARD": ("ORDINARY", "HIGH"),
    "BANK_ACCOUNT": ("ORDINARY", "HIGH"),
    "HEALTH_DATA": ("SENSITIVE", "HIGH"),
    "BIOMETRIC": ("SENSITIVE", "HIGH"),
    "POLITICAL_OPINION": ("SENSITIVE", "HIGH"),
    "RELIGIOUS_BELIEF": ("SENSITIVE", "HIGH"),
    "SEXUAL_ORIENTATION": ("SENSITIVE", "HIGH"),
    "ETHNIC_ORIGIN": ("SENSITIVE", "HIGH"),
    "CRIMINAL_RECORD": ("SENSITIVE", "HIGH"),
    "INCOME_DATA": ("ORDINARY", "HIGH"),
    "LOCATION_DATA": ("ORDINARY", "MEDIUM"),
    "COOKIE_ID": ("ORDINARY", "LOW"),
    "IP_ADDRESS": ("ORDINARY", "LOW"),
    "PURCHASE_HISTORY": ("ORDINARY", "MEDIUM"),
    "BEHAVIORAL_DATA": ("ORDINARY", "MEDIUM"),
}


def auto_classify(code: str) -> tuple[str | None, str | None]:
    """US-RF05-1: derive (sensitivity, criticality) from a catalog code, if known."""
    return _LOPDP_AUTO_CLASSIFY.get(code.upper(), (None, None))


def _snapshot(db: Session, entry: CatalogEntry, user_id: int | None) -> None:
    """US-RF20-1: append an immutable version snapshot of a catalog entry."""
    db.add(
        CatalogEntryVersion(
            tenant_id=entry.tenant_id,
            catalog_entry_id=entry.id,
            version=entry.version,
            label=entry.label,
            description=entry.description,
            sensitivity=entry.sensitivity,
            criticality=entry.criticality,
            is_active=entry.is_active,
            changed_by_id=user_id,
        )
    )


class CatalogEntryUpdate(BaseModel):
    """CatalogEntryUpdate schema/model definition."""
    label: str | None = None
    description: str | None = None
    sensitivity: str | None = None
    criticality: str | None = None
    is_active: bool | None = None


def _check_catalog_referential_integrity(db: Session, entry: CatalogEntry) -> None:
    """RF-40 / US-RF39-1: Prevent deletion if entry is referenced by information assets."""
    # Import here to avoid circular imports at module load
    from app.models.information_asset import InformationAsset

    code = entry.code
    cat_type = entry.type
    referenced = False

    if cat_type == "ASSET_TYPE":
        referenced = (
            db.query(InformationAsset)
            .filter(
                InformationAsset.tenant_id == entry.tenant_id,
                InformationAsset.asset_type_code == code,
            )
            .first()
            is not None
        )
    elif cat_type == "ASSET_FORMAT":
        referenced = (
            db.query(InformationAsset)
            .filter(
                InformationAsset.tenant_id == entry.tenant_id,
                InformationAsset.format_code == code,
            )
            .first()
            is not None
        )
    elif cat_type == "STORAGE_MEDIUM":
        referenced = (
            db.query(InformationAsset)
            .filter(
                InformationAsset.tenant_id == entry.tenant_id,
                InformationAsset.storage_medium_code == code,
            )
            .first()
            is not None
        )
    elif cat_type == "CLASSIFICATION_LEVEL":
        referenced = (
            db.query(InformationAsset)
            .filter(
                InformationAsset.tenant_id == entry.tenant_id,
                InformationAsset.classification_level_code == code,
            )
            .first()
            is not None
        )

    if referenced:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete catalog entry '{code}' ({cat_type}): it is referenced by one or more information assets.",  # pylint: disable=line-too-long
        )


router = APIRouter(prefix="/catalogs", tags=["catalogs"])


@router.get("", response_model=list[CatalogEntryRead])
def list_catalogs(
    _: Annotated[User, Depends(require_permission("catalogs", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    type_filter: str | None = Query(
        None, alias="type", description="Filter by catalog type"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """List catalogs."""
    q = db.query(CatalogEntry).filter(
        CatalogEntry.tenant_id == tenant_id, CatalogEntry.is_active.is_(True)
    )
    if type_filter:
        q = q.filter(CatalogEntry.type == type_filter)
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=CatalogEntryRead, status_code=status.HTTP_201_CREATED)
def create_catalog_entry(
    body: CatalogEntryCreate,
    current_user: Annotated[User, Depends(require_permission("catalogs", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """US-RF20-1: Create a single editable catalog entry with auto-classification (US-RF05-1)."""
    if body.sensitivity and body.sensitivity not in DATA_SENSITIVITIES:
        raise HTTPException(
            status_code=400, detail=f"sensitivity must be one of {DATA_SENSITIVITIES}"
        )
    if body.criticality and body.criticality not in DATA_CRITICALITIES:
        raise HTTPException(
            status_code=400, detail=f"criticality must be one of {DATA_CRITICALITIES}"
        )
    auto = auto_classify(body.code)
    entry = CatalogEntry(
        tenant_id=tenant_id,
        type=body.type,
        code=body.code,
        label=body.label,
        description=body.description,
        sensitivity=body.sensitivity or auto[0],
        criticality=body.criticality or auto[1],
        version=1,
        updated_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    _snapshot(db, entry, current_user.id)
    db.commit()
    AuditLog.create_log(
        db,
        action="catalog_entry_created",
        resource="catalogs",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={entry.id} type={entry.type} code={entry.code}",
    )
    return entry


@router.get("/{catalog_type}", response_model=list[CatalogEntryRead])
def list_catalogs_by_type(
    catalog_type: str,
    _: Annotated[User, Depends(require_permission("catalogs", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List catalogs by type."""
    return (
        db.query(CatalogEntry)
        .filter(
            CatalogEntry.tenant_id == tenant_id,
            CatalogEntry.type == catalog_type,
            CatalogEntry.is_active.is_(True),
        )
        .all()
    )


@router.post(
    "/bulk-load", response_model=list[CatalogEntryRead], status_code=status.HTTP_201_CREATED
)
def bulk_load_catalogs(
    body: BulkLoadRequest,
    current_user: Annotated[User, Depends(require_permission("catalogs", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """POST /catalogs/bulk-load — accepts list of entries [{type, code, label, description}]."""
    entries = []
    for item in body.entries:
        auto = auto_classify(item.code)
        entry = CatalogEntry(
            tenant_id=tenant_id,
            type=item.type,
            code=item.code,
            label=item.label,
            description=item.description,
            # US-RF05-1: auto-classify if code matches LOPDP lookup
            sensitivity=item.sensitivity or auto[0],
            criticality=item.criticality or auto[1],
            updated_by_id=current_user.id,
        )
        db.add(entry)
        entries.append(entry)
    db.commit()
    for e in entries:
        db.refresh(e)
        _snapshot(db, e, current_user.id)
    db.commit()
    return entries


@router.get("/{entry_id}/versions", response_model=list[CatalogEntryVersionRead])
def list_catalog_versions(
    entry_id: int,
    _: Annotated[User, Depends(require_permission("catalogs", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """US-RF20-1: Return the version history of a catalog entry (newest first)."""
    entry = (
        db.query(CatalogEntry)
        .filter(CatalogEntry.id == entry_id, CatalogEntry.tenant_id == tenant_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Catalog entry not found.")
    return (
        db.query(CatalogEntryVersion)
        .filter(
            CatalogEntryVersion.catalog_entry_id == entry_id,
            CatalogEntryVersion.tenant_id == tenant_id,
        )
        .order_by(CatalogEntryVersion.version.desc())
        .all()
    )


@router.post("/{entry_id}/reclassify", response_model=CatalogEntryRead)
def reclassify_catalog_entry(
    entry_id: int,
    current_user: Annotated[User, Depends(require_permission("catalogs", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """US-RF05-1: Re-run automatic classification from the entry code, versioning the change."""
    entry = (
        db.query(CatalogEntry)
        .filter(CatalogEntry.id == entry_id, CatalogEntry.tenant_id == tenant_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Catalog entry not found.")
    sensitivity, criticality = auto_classify(entry.code)
    if sensitivity is None and criticality is None:
        raise HTTPException(
            status_code=422,
            detail=f"No automatic classification available for code '{entry.code}'.",
        )
    entry.sensitivity = sensitivity
    entry.criticality = criticality
    entry.version = (entry.version or 1) + 1
    entry.updated_by_id = current_user.id
    db.commit()
    db.refresh(entry)
    _snapshot(db, entry, current_user.id)
    db.commit()
    AuditLog.create_log(
        db,
        action="catalog_entry_reclassified",
        resource="catalogs",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={entry_id} code={entry.code} -> {sensitivity}/{criticality}",
    )
    return entry


@router.patch("/{entry_id}", response_model=CatalogEntryRead)
def update_catalog_entry(
    entry_id: int,
    body: CatalogEntryUpdate,
    current_user: Annotated[User, Depends(require_permission("catalogs", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """US-RF20-1: Edit catalog entry with version increment and history snapshot."""
    entry = (
        db.query(CatalogEntry)
        .filter(CatalogEntry.id == entry_id, CatalogEntry.tenant_id == tenant_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Catalog entry not found.")
    if body.sensitivity and body.sensitivity not in DATA_SENSITIVITIES:
        raise HTTPException(
            status_code=400, detail=f"sensitivity must be one of {DATA_SENSITIVITIES}"
        )
    if body.criticality and body.criticality not in DATA_CRITICALITIES:
        raise HTTPException(
            status_code=400, detail=f"criticality must be one of {DATA_CRITICALITIES}"
        )
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(entry, field, value)
    # US-RF20-1: increment version on every edit
    entry.version = (entry.version or 1) + 1
    entry.updated_by_id = current_user.id
    db.commit()
    db.refresh(entry)
    _snapshot(db, entry, current_user.id)
    db.commit()
    AuditLog.create_log(
        db,
        action="catalog_entry_updated",
        resource="catalogs",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"id={entry_id} code={entry.code} version={entry.version}",
    )
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catalog_entry(
    entry_id: int,
    _: Annotated[User, Depends(require_permission("catalogs", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete catalog entry."""
    entry = (
        db.query(CatalogEntry)
        .filter(CatalogEntry.id == entry_id, CatalogEntry.tenant_id == tenant_id)
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Catalog entry not found."
        )
    # RF-40 / US-RF39-1: referential integrity check
    _check_catalog_referential_integrity(db, entry)
    entry.is_active = False
    db.commit()
