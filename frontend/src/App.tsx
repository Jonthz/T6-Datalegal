import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoadingState } from './components/ui'
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from './routes/routes'
import { getStoredAccountScope } from './routes/permissions'

function ShellFallback() {
  return (
    <div className="min-h-screen w-full bg-white text-ink-100 flex items-center justify-center">
      <LoadingState />
    </div>
  )
}

function AuthFallback() {
  return (
    <div className="min-h-screen w-full bg-white text-ink-100 flex items-center justify-center">
      <LoadingState />
    </div>
  )
}

export default function App() {
  const defaultPath = getStoredAccountScope() === 'PLATFORM' ? '/platform' : '/dashboard'

  return (
    <BrowserRouter>
      <Routes>
        {PUBLIC_ROUTES.map(({ path, Component }) => (
          <Route
            key={path}
            path={path}
            element={
              <Suspense fallback={<AuthFallback />}>
                <Component />
              </Suspense>
            }
          />
        ))}

        {PROTECTED_ROUTES.map(({ path, Component, roles, accountScopes, platformPermissions }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute
                roles={roles}
                accountScopes={accountScopes}
                platformPermissions={platformPermissions}
              >
                <AppShell>
                  <Suspense fallback={<LoadingState />}>
                    <Component />
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
