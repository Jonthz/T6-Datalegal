export type Role = 'SUPER_ADMIN' | 'DPO' | 'ADMIN' | 'DEPT_HEAD' | 'AUDITOR'

export interface AuthState {
  token: string | null
  role: Role | null
  tenantId: number | null
  userId: number | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
  role: Role
  tenant_id: number
}

export interface MFAPendingResponse {
  mfa_required: true
  mfa_token: string
}

export interface MFASetupResponse {
  secret: string
  uri: string
  message: string
}
