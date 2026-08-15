from pydantic import BaseModel

# US-RF38-1: standardized confidentiality levels
CLASSIFICATION_LEVELS = [
    "PUBLICA_USO_INTERNO",
    "PUBLICA_CLASIFICADA",
    "PUBLICA_RESERVADA",
]


class InformationAssetCreate(BaseModel):
    """InformationAssetCreate schema/model definition."""

    name: str
    description: str = ""
    asset_type_code: str
    format_code: str
    storage_medium_code: str
    classification_level_code: str
    treatment_activity_id: int | None = None
    department_id: int | None = None


class InformationAssetUpdate(BaseModel):
    """InformationAssetUpdate schema/model definition."""

    name: str | None = None
    description: str | None = None
    asset_type_code: str | None = None
    format_code: str | None = None
    storage_medium_code: str | None = None
    classification_level_code: str | None = None
    treatment_activity_id: int | None = None
    department_id: int | None = None


class InformationAssetRead(BaseModel):
    """InformationAssetRead schema/model definition."""

    id: int
    tenant_id: int
    name: str
    description: str
    asset_type_code: str
    format_code: str
    storage_medium_code: str
    classification_level_code: str
    treatment_activity_id: int | None
    department_id: int | None
    owner_id: int | None

    model_config = {"from_attributes": True}
