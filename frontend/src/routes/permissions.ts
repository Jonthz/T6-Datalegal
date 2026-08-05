import type { AccountScope, PlatformPermission, Role } from '../types'

export const ROLES: Role[] = ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD', 'AUDITOR']

export const ALL_AUTH_ROLES: Role[] = [...ROLES]
export const ACCOUNT_SCOPES: AccountScope[] = ['TENANT', 'PLATFORM']

export function hasRole(allowed: Role[] | undefined, role: Role | null): boolean {
  if (!allowed || allowed.length === 0) return true
  if (!role) return false
  return allowed.includes(role)
}

export function getStoredRole(): Role | null {
  const raw = localStorage.getItem('role')
  if (!raw) return null
  return ROLES.includes(raw as Role) ? (raw as Role) : null
}

export function getStoredTenantId(): number | null {
  const raw = localStorage.getItem('tenant_id')
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function getStoredAccountScope(): AccountScope {
  const raw = localStorage.getItem('account_scope')
  return ACCOUNT_SCOPES.includes(raw as AccountScope) ? (raw as AccountScope) : 'TENANT'
}

export function getStoredPlatformPermissions(): PlatformPermission[] {
  try {
    const raw = localStorage.getItem('platform_permissions')
    return raw ? (JSON.parse(raw) as PlatformPermission[]) : []
  } catch {
    return []
  }
}

export function hasAccountScope(allowed: AccountScope[] | undefined): boolean {
  if (!allowed || allowed.length === 0) return true
  return allowed.includes(getStoredAccountScope())
}

export function hasPlatformPermission(permission: PlatformPermission): boolean {
  return getStoredPlatformPermissions().includes(permission)
}

export function hasPlatformPermissions(permissions: PlatformPermission[] | undefined): boolean {
  if (!permissions || permissions.length === 0) return true
  return permissions.every(hasPlatformPermission)
}
