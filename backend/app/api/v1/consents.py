"""US-RF32-1: Explicit and immutable consent revocation.
US-RF25-1: Cookie banner versioning and consent acceptance.
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.consent import ConsentRecord, CookieBanner, CookieConsent
from app.models.user import User
from app.schemas.consent import (
    ConsentRecordCreate,
    ConsentRecordRead,
    ConsentRevoke,
    CookieBannerCreate,
    CookieBannerRead,
    CookieBannerUpdate,
    CookieConsentCreate,
    CookieConsentRead,
)

router = APIRouter(tags=["consents"])


# ── Consent Statistics (US-RF06-1) ───────────────────────────────────────────

@router.get("/consents/stats")
def get_consent_stats(
    _: Annotated[User, Depends(require_permission("consents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
) -> dict:
    """Consent registration statistics per tenant (US-RF06-1)."""
    records = db.query(ConsentRecord).filter(ConsentRecord.tenant_id == tenant_id).all()
    total = len(records)
    active = sum(1 for r in records if not r.is_revoked)
    revoked = sum(1 for r in records if r.is_revoked)
    sensitive = sum(1 for r in records if r.is_sensitive)

    by_legal_basis: dict[str, int] = {}
    for r in records:
        by_legal_basis[r.legal_basis] = by_legal_basis.get(r.legal_basis, 0) + 1

    by_treatment_activity: dict[int | None, int] = {}
    for r in records:
        key = r.treatment_activity_id
        by_treatment_activity[key] = by_treatment_activity.get(key, 0) + 1

    return {
        "total": total,
        "active": active,
        "revoked": revoked,
        "sensitive": sensitive,
        "revocation_rate": round(revoked / total * 100, 1) if total else 0.0,
        "by_legal_basis": by_legal_basis,
        "by_treatment_activity": {str(k): v for k, v in by_treatment_activity.items()},
    }


# ── Consent Records (US-RF32-1) ──────────────────────────────────────────────

@router.post("/consents", response_model=ConsentRecordRead, status_code=status.HTTP_201_CREATED)
def create_consent(
    body: ConsentRecordCreate,
    current_user: Annotated[User, Depends(require_permission("consents", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Register a new explicit consent record."""
    record = ConsentRecord(
        tenant_id=tenant_id,
        treatment_activity_id=body.treatment_activity_id,
        data_subject_token=body.data_subject_token,
        legal_basis=body.legal_basis,
        purpose=body.purpose,
        is_sensitive=body.is_sensitive,
        created_by_id=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    AuditLog.create_log(
        db, action="consent_created", resource="consents",
        tenant_id=tenant_id, user_id=current_user.id,
        detail=f"id={record.id} token={body.data_subject_token[:8]}***",
    )
    return record


@router.get("/consents", response_model=list[ConsentRecordRead])
def list_consents(
    _: Annotated[User, Depends(require_permission("consents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    is_revoked: bool | None = Query(None),
    is_sensitive: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List consent records with optional filters."""
    q = db.query(ConsentRecord).filter(ConsentRecord.tenant_id == tenant_id)
    if is_revoked is not None:
        q = q.filter(ConsentRecord.is_revoked == is_revoked)
    if is_sensitive is not None:
        q = q.filter(ConsentRecord.is_sensitive == is_sensitive)
    return q.order_by(ConsentRecord.granted_at.desc()).offset(skip).limit(limit).all()


@router.get("/consents/{record_id}", response_model=ConsentRecordRead)
def get_consent(
    record_id: int,
    _: Annotated[User, Depends(require_permission("consents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve a consent record by ID."""
    record = db.query(ConsentRecord).filter(
        ConsentRecord.id == record_id, ConsentRecord.tenant_id == tenant_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Consent record not found.")
    return record


@router.post("/consents/{record_id}/revoke", response_model=ConsentRecordRead)
def revoke_consent(
    record_id: int,
    body: ConsentRevoke,
    current_user: Annotated[User, Depends(require_permission("consents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Explicitly and immutably revoke a consent. Once revoked, cannot be un-revoked."""
    record = db.query(ConsentRecord).filter(
        ConsentRecord.id == record_id, ConsentRecord.tenant_id == tenant_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Consent record not found.")
    if record.is_revoked:
        raise HTTPException(status_code=400, detail="Consent already revoked (immutable).")
    record.is_revoked = True
    record.revoked_at = datetime.now(timezone.utc)
    record.revocation_reason = body.revocation_reason
    db.commit()
    db.refresh(record)
    AuditLog.create_log(
        db, action="consent_revoked", resource="consents",
        tenant_id=tenant_id, user_id=current_user.id,
        detail=f"id={record_id} reason={body.revocation_reason[:50]}",
    )
    return record


# ── Cookie Banners (US-RF25-1) ───────────────────────────────────────────────

@router.post(
    "/cookie-banners",
    response_model=CookieBannerRead,
    status_code=status.HTTP_201_CREATED,
)
def create_banner(
    body: CookieBannerCreate,
    current_user: Annotated[User, Depends(require_permission("consents", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a new versioned cookie consent banner."""
    banner = CookieBanner(
        tenant_id=tenant_id,
        version=body.version,
        content=body.content,
        effective_date=body.effective_date,
        created_by_id=current_user.id,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    AuditLog.create_log(
        db, action="cookie_banner_created", resource="cookie_banners",
        tenant_id=tenant_id, user_id=current_user.id, detail=f"version={body.version}",
    )
    return banner


@router.get("/cookie-banners", response_model=list[CookieBannerRead])
def list_banners(
    _: Annotated[User, Depends(require_permission("consents", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    active_only: bool = Query(False),
):
    """List cookie banners, optionally filtering to active-only."""
    q = db.query(CookieBanner).filter(CookieBanner.tenant_id == tenant_id)
    if active_only:
        q = q.filter(CookieBanner.is_active.is_(True))
    return q.order_by(CookieBanner.id.desc()).all()


@router.patch("/cookie-banners/{banner_id}", response_model=CookieBannerRead)
def update_banner(
    banner_id: int,
    body: CookieBannerUpdate,
    _: Annotated[User, Depends(require_permission("consents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update a cookie banner's content or active status."""
    banner = db.query(CookieBanner).filter(
        CookieBanner.id == banner_id, CookieBanner.tenant_id == tenant_id
    ).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Cookie banner not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(banner, field, value)
    db.commit()
    db.refresh(banner)
    return banner


@router.post(
    "/cookie-consents",
    response_model=CookieConsentRead,
    status_code=status.HTTP_201_CREATED,
)
def record_cookie_consent(
    body: CookieConsentCreate,
    _: Annotated[User, Depends(require_permission("consents", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Record a data subject's acceptance of a cookie banner version."""
    banner = db.query(CookieBanner).filter(
        CookieBanner.id == body.banner_id, CookieBanner.tenant_id == tenant_id
    ).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Cookie banner not found.")
    consent = CookieConsent(
        tenant_id=tenant_id,
        banner_id=body.banner_id,
        data_subject_token=body.data_subject_token,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return consent


@router.post("/cookie-consents/{consent_id}/revoke", response_model=CookieConsentRead)
def revoke_cookie_consent(
    consent_id: int,
    _: Annotated[User, Depends(require_permission("consents", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Revoke a previously recorded cookie consent."""
    consent = db.query(CookieConsent).filter(
        CookieConsent.id == consent_id, CookieConsent.tenant_id == tenant_id
    ).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Cookie consent not found.")
    if consent.is_revoked:
        raise HTTPException(status_code=400, detail="Already revoked.")
    consent.is_revoked = True
    consent.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(consent)
    return consent
