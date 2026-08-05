export type Role = 'SUPER_ADMIN' | 'DPO' | 'ADMIN' | 'DEPT_HEAD' | 'AUDITOR'
export type AccountScope = 'TENANT' | 'PLATFORM'
export type PlatformPermission = 'tenants:read' | 'tenants:provision'

export interface AuthState {
  token: string | null
  role: Role | null
  tenantId: number | null
  userId: number | null
  accountScope: AccountScope | null
  platformPermissions: PlatformPermission[]
}

export interface TokenResponse {
  access_token: string
  token_type: string
  role: Role
  tenant_id: number
  account_scope: AccountScope
  platform_permissions: PlatformPermission[]
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
