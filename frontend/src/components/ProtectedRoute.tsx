import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { getStoredRole, hasRole } from '../routes/permissions'
import type { Role } from '../types'
import { AppShell } from './layout/AppShell'
import { Button, ForbiddenState } from './ui'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Role[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token')
  const location = useLocation()
  const navigate = useNavigate()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const role = getStoredRole()
  if (roles && !hasRole(roles, role)) {
    return (
      <AppShell>
        <ForbiddenState
          title="Access restricted"
          description="Your current role does not have permission to view this module. Contact a DPO or administrator if you need access."
          action={
            <Button onClick={() => navigate('/dashboard')} variant="secondary">
              Back to dashboard
            </Button>
          }
        />
      </AppShell>
    )
  }

  return <>{children}</>
}
