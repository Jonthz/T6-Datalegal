from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class MFAVerifyRequest(BaseModel):
    mfa_token: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: int


class MFAPendingResponse(BaseModel):
    mfa_required: bool = True
    mfa_token: str


class MFASetupResponse(BaseModel):
    secret: str
    uri: str
    message: str = "Scan this QR code with your authenticator app."


class MFAConfirmRequest(BaseModel):
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str
