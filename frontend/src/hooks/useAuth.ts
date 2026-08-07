import { useState, useCallback } from 'react'
import type { AccountScope, PlatformPermission, Role } from '../types'

export interface AuthState {
  token: string | null
  role: Role | null
  tenantId: number | null
  accountScope: AccountScope | null
  platformPermissions: PlatformPermission[]
}

function getStoredPlatformPermissions(): PlatformPermission[] {
  try {
    const raw = localStorage.getItem('platform_permissions')
    return raw ? (JSON.parse(raw) as PlatformPermission[]) : []
  } catch {
    return []
  }
}

function getInitialState(): AuthState {
  return {
    token: localStorage.getItem('access_token'),
    role: (localStorage.getItem('role') as Role | null),
    tenantId: localStorage.getItem('tenant_id')
      ? Number(localStorage.getItem('tenant_id'))
      : null,
    accountScope: (localStorage.getItem('account_scope') as AccountScope | null) ?? 'TENANT',
    platformPermissions: getStoredPlatformPermissions(),
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(getInitialState)

  const setToken = useCallback((
    token: string,
    role: Role,
    tenantId: number,
    accountScope: AccountScope = 'TENANT',
    platformPermissions: PlatformPermission[] = []
  ) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('tenant_id', String(tenantId))
    localStorage.setItem('account_scope', accountScope)
    localStorage.setItem('platform_permissions', JSON.stringify(platformPermissions))
    setAuth({ token, role, tenantId, accountScope, platformPermissions })
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('role')
    localStorage.removeItem('tenant_id')
    localStorage.removeItem('account_scope')
    localStorage.removeItem('platform_permissions')
    setAuth({
      token: null,
      role: null,
      tenantId: null,
      accountScope: null,
      platformPermissions: [],
    })
  }, [])

  const isAuthenticated = Boolean(auth.token)

  return { auth, setToken, clearAuth, isAuthenticated }
}
