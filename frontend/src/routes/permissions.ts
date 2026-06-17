import type { Role } from '../types'

export const ROLES: Role[] = ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD', 'AUDITOR']

export const ALL_AUTH_ROLES: Role[] = [...ROLES]

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
