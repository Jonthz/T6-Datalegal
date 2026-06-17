import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { getStoredRole, hasRole } from '../routes/permissions'
import type { Role } from '../types'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Role[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token')
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const role = getStoredRole()
  if (roles && !hasRole(roles, role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
