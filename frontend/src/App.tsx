import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoadingState } from './components/ui'
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from './routes/routes'

function ShellFallback() {
  return (
    <div className="min-h-screen w-full bg-shell-gradient flex items-center justify-center">
      <LoadingState />
    </div>
  )
}

function AuthFallback() {
  return (
    <div className="min-h-screen w-full bg-auth-gradient flex items-center justify-center">
      <LoadingState />
    </div>
  )
}

export default function App() {
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

        {PROTECTED_ROUTES.map(({ path, Component, roles }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute roles={roles}>
                <AppShell>
                  <Suspense fallback={<LoadingState />}>
                    <Component />
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
