import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '../api/auth'
import { Alert, Button, GlassCard, Input } from '../components/ui'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)

      if ('mfa_required' in result && result.mfa_required) {
        sessionStorage.setItem('mfa_token', result.mfa_token)
        navigate('/mfa-verify')
        return
      }

      const token = result as { access_token: string; role: string; tenant_id: number }
      localStorage.setItem('access_token', token.access_token)
      localStorage.setItem('role', token.role)
      localStorage.setItem('tenant_id', String(token.tenant_id))
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } }
      if (axiosErr.response?.status === 423) setError(t('auth.accountLocked'))
      else if (axiosErr.response?.status === 401) setError(t('auth.loginFailed'))
      else setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <header className="text-center mb-6">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-brand-400 to-sky-400 flex items-center justify-center font-bold text-ink-950 text-lg shadow-glass">
            DL
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">{t('app.title')}</h1>
          <p className="text-sm text-ink-200 mt-1">{t('auth.tagline')}</p>
        </header>
        <GlassCard className="shadow-glass-lg">
          <h2 className="text-lg font-semibold text-ink-50">{t('auth.login')}</h2>
          <p className="text-sm text-ink-300 mt-1 mb-5">{t('auth.tenantPrompt')}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('auth.email')}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
            />
            <Input
              label={t('auth.password')}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" fullWidth loading={loading}>
              {loading ? t('auth.loggingIn') : t('auth.signIn')}
            </Button>
          </form>
        </GlassCard>
        <p className="text-center text-xs text-ink-400 mt-6">{t('app.subtitle')}</p>
      </div>
    </div>
  )
}
