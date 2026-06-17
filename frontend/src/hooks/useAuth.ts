import { useState, useCallback } from 'react'
import type { Role } from '../types'

export interface AuthState {
  token: string | null
  role: Role | null
  tenantId: number | null
}

function getInitialState(): AuthState {
  return {
    token: localStorage.getItem('access_token'),
    role: (localStorage.getItem('role') as Role | null),
    tenantId: localStorage.getItem('tenant_id')
      ? Number(localStorage.getItem('tenant_id'))
      : null,
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(getInitialState)

  const setToken = useCallback((token: string, role: Role, tenantId: number) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('tenant_id', String(tenantId))
    setAuth({ token, role, tenantId })
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('role')
    localStorage.removeItem('tenant_id')
    setAuth({ token: null, role: null, tenantId: null })
  }, [])

  const isAuthenticated = Boolean(auth.token)

  return { auth, setToken, clearAuth, isAuthenticated }
}
