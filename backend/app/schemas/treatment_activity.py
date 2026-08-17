"""Schemas del RAT (Registro de Actividades de Tratamiento).

Soportan las variables enriquecidas y la selección múltiple de bases de licitud.
`legal_basis` (base principal) se mantiene por compatibilidad y para la agrupación ROPA;
`legal_bases` permite registrar varias bases y se sincroniza con la principal.
"""

from pydantic import BaseModel, model_validator


class _RATBase(BaseModel):
    """Campos compartidos del RAT."""

    # Bases de licitud (selección múltiple)
    legal_bases: list[str] = []
    complementary_legal_bases: list[str] = []
    # Variables adicionales
    area: str | None = None
    operational_owner: str | None = None
    data_categories: list[str] = []
    data_origin: str | None = None
    treatment_operations: list[str] = []
    uses_profiling: bool = False
    uses_ai: bool = False
    automated_decision: bool = False
    requires_dpia: bool = False
    has_special_data: bool = False
    involves_minors: bool = False
    recipients: list[str] = []
    processors: list[str] = []
    system_platform: str | None = None
    technical_measures: str | None = None
    organizational_measures: str | None = None
    physical_measures: str | None = None
    legal_measures: str | None = None
    mtge_score: float | None = None
    mtge_result: str | None = None


class TreatmentActivityCreate(_RATBase):
    """TreatmentActivityCreate schema/model definition."""

    name: str
    purpose: str
    legal_basis: str = ""
    personal_data_types: list[str] = []
    data_subjects: list[str] = []
    retention_period_days: int = 365
    is_cross_border: bool = False
    destination_countries: list[str] = []
    processor_name: str | None = None
    processor_country: str | None = None
    department_id: int | None = None
    status: str = "DRAFT"

    @model_validator(mode="after")
    def _sync_legal_bases(self) -> "TreatmentActivityCreate":
        """Keep legal_basis (principal) and legal_bases consistent."""
        if self.legal_bases and not self.legal_basis:
            self.legal_basis = self.legal_bases[0]
        elif self.legal_basis and not self.legal_bases:
            self.legal_bases = [self.legal_basis]
        return self


class TreatmentActivityUpdate(_RATBase):
    """TreatmentActivityUpdate schema/model definition."""

    # Override list defaults with None so PATCH can distinguish "not sent".
    legal_bases: list[str] | None = None
    complementary_legal_bases: list[str] | None = None
    data_categories: list[str] | None = None
    treatment_operations: list[str] | None = None
    recipients: list[str] | None = None
    processors: list[str] | None = None
    uses_profiling: bool | None = None
    uses_ai: bool | None = None
    automated_decision: bool | None = None
    requires_dpia: bool | None = None
    has_special_data: bool | None = None
    involves_minors: bool | None = None

    name: str | None = None
    purpose: str | None = None
    legal_basis: str | None = None
    personal_data_types: list[str] | None = None
    data_subjects: list[str] | None = None
    retention_period_days: int | None = None
    is_cross_border: bool | None = None
    destination_countries: list[str] | None = None
    processor_name: str | None = None
    processor_country: str | None = None
    department_id: int | None = None
    status: str | None = None


class TreatmentActivityRead(_RATBase):
    """TreatmentActivityRead schema/model definition."""

    id: int
    tenant_id: int
    rat_code: str | None
    name: str
    purpose: str
    legal_basis: str
    personal_data_types: list[str]
    data_subjects: list[str]
    retention_period_days: int
    is_cross_border: bool
    destination_countries: list[str]
    processor_name: str | None
    processor_country: str | None
    department_id: int | None
    owner_id: int | None
    status: str

    model_config = {"from_attributes": True}
