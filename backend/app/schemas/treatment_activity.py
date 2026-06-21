from pydantic import BaseModel


class TreatmentActivityCreate(BaseModel):
    """TreatmentActivityCreate schema/model definition."""
    name: str
    purpose: str
    legal_basis: str
    personal_data_types: list[str] = []
    data_subjects: list[str] = []
    retention_period_days: int = 365
    is_cross_border: bool = False
    destination_countries: list[str] = []
    processor_name: str | None = None
    processor_country: str | None = None
    department_id: int | None = None
    status: str = "DRAFT"


class TreatmentActivityUpdate(BaseModel):
    """TreatmentActivityUpdate schema/model definition."""
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


class TreatmentActivityRead(BaseModel):
    """TreatmentActivityRead schema/model definition."""
    id: int
    tenant_id: int
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
