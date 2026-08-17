import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  getStoredAccountScope,
  getStoredRole,
  hasAccountScope,
  hasPlatformPermissions,
  hasRole,
} from '../routes/permissions'
import type { AccountScope, PlatformPermission, Role } from '../types'
import { AppShell } from './layout/AppShell'
import { Button, ForbiddenState } from './ui'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Role[]
  accountScopes?: AccountScope[]
  platformPermissions?: PlatformPermission[]
}

export default function ProtectedRoute({
  children,
  roles,
  accountScopes,
  platformPermissions,
}: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token')
  const location = useLocation()
  const navigate = useNavigate()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const role = getStoredRole()
  const accountScope = getStoredAccountScope()
  const defaultPath = accountScope === 'PLATFORM' ? '/platform' : '/dashboard'
  const accountScopeAllowed = hasAccountScope(accountScopes)
  if (!accountScopeAllowed) {
    return <Navigate to={defaultPath} replace />
  }

  if (
    (roles && !hasRole(roles, role)) ||
    !hasPlatformPermissions(platformPermissions)
  ) {
    return (
      <AppShell>
        <ForbiddenState
          title="Access restricted"
          description="Your current role does not have permission to view this module. Contact a DPO or administrator if you need access."
          action={
            <Button onClick={() => navigate(defaultPath)} variant="secondary">
              Back to {accountScope === 'PLATFORM' ? 'platform console' : 'dashboard'}
            </Button>
          }
        />
      </AppShell>
    )
  }

  return <>{children}</>
}
