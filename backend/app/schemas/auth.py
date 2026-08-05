from pydantic import BaseModel


class LoginRequest(BaseModel):
    """LoginRequest schema/model definition."""
    email: str
    password: str


class MFAVerifyRequest(BaseModel):
    """MFAVerifyRequest schema/model definition."""
    mfa_token: str
    code: str


class TokenResponse(BaseModel):
    """TokenResponse schema/model definition."""
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: int
    account_scope: str = "TENANT"
    platform_permissions: list[str] = []


class MFAPendingResponse(BaseModel):
    """MFAPendingResponse schema/model definition."""
    mfa_required: bool = True
    mfa_token: str


class MFASetupResponse(BaseModel):
    """MFASetupResponse schema/model definition."""
    secret: str
    uri: str
    message: str = "Scan this QR code with your authenticator app."


class MFAConfirmRequest(BaseModel):
    """MFAConfirmRequest schema/model definition."""
    code: str


class RefreshRequest(BaseModel):
    """RefreshRequest schema/model definition."""
    refresh_token: str
