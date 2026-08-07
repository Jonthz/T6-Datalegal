"""RF-04 / US-RF35-1: Data processing activity registration via guided questionnaire.

RAT (Registro de Actividades de Tratamiento) — modelo enriquecido para alinear con la
plantilla de cumplimiento LOPDP/RGLOPDP (ver RAT_IMPORPARIS). Incorpora:
  - Identificador estructurado por área (rat_code, p.ej. CRE001, TES001).
  - Selección múltiple en bases de licitud (principal + complementarias/condicionadas).
  - Variables adicionales del Art. 38 RGLOPDP y Res. SPDP-SPD-2026-0009-R.
"""

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase

# Prefijos de identificador estructurado por área responsable.
# El código del RAT se compone de PREFIJO + secuencial de 3 dígitos por tenant/área.
AREA_CODE_PREFIXES: dict[str, str] = {
    "CREDITO": "CRE",
    "CRÉDITO": "CRE",
    "COMERCIAL": "COME",
    "TESORERIA": "TES",
    "TESORERÍA": "TES",
    "IMPORTACIONES": "IMP",
    "IMPORTACIONES / COMPRAS": "IMP",
    "IMPORTACIONES/COMPRAS": "IMP",
    "COMPRAS": "IMP",
    "TALENTO HUMANO": "TTH",
    "TALENTO HUMANO / SALUD": "TTH",
    "SALUD OCUPACIONAL": "TTH",
    "SEGURIDAD": "SEG",
    "TI": "TIC",
    "TECNOLOGIA": "TIC",
    "JURIDICO": "JUR",
    "JURÍDICO": "JUR",
}


def area_prefix(area: str | None) -> str:
    """Return the 3-letter RAT prefix for a business area."""
    if not area:
        return "GEN"
    key = area.strip().upper()
    if key in AREA_CODE_PREFIXES:
        return AREA_CODE_PREFIXES[key]
    letters = "".join(ch for ch in key if ch.isalnum())
    return (letters[:3] or "GEN").upper()


class TreatmentActivity(TenantBase):
    """TreatmentActivity schema/model definition."""
    __tablename__ = "treatment_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Identificador estructurado del RAT (área + secuencial), único por tenant.
    rat_code: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Bases de licitud (selección múltiple) ────────────────────────────────
    # legal_basis se conserva como "base principal" para compatibilidad e informes ROPA.
    legal_basis: Mapped[str] = mapped_column(String(100), nullable=False)
    legal_bases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    complementary_legal_bases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    personal_data_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    data_subjects: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    retention_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=365)
    is_cross_border: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    destination_countries: Mapped[list] = mapped_column(JSON, nullable=True, default=list)
    processor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    processor_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, index=True
    )
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)
    # DRAFT, ACTIVE, ARCHIVED

    # ── Variables adicionales del RAT (Art. 38 RGLOPDP) ──────────────────────
    area: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    operational_owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data_categories: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    data_origin: Mapped[str | None] = mapped_column(Text, nullable=True)
    treatment_operations: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    uses_profiling: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    uses_ai: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    automated_decision: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_dpia: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_special_data: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    involves_minors: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recipients: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    processors: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    system_platform: Mapped[str | None] = mapped_column(String(255), nullable=True)
    technical_measures: Mapped[str | None] = mapped_column(Text, nullable=True)
    organizational_measures: Mapped[str | None] = mapped_column(Text, nullable=True)
    physical_measures: Mapped[str | None] = mapped_column(Text, nullable=True)
    legal_measures: Mapped[str | None] = mapped_column(Text, nullable=True)
    mtge_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    mtge_result: Mapped[str | None] = mapped_column(String(60), nullable=True)

    information_assets: Mapped[list] = relationship(
        "InformationAsset", back_populates="treatment_activity", lazy="noload"
    )
    risk_assessments: Mapped[list] = relationship(
        "RiskAssessment", back_populates="treatment_activity", lazy="noload"
    )
