import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '../api/auth'
import { Alert, BrandMark, Button, GlassCard, Input } from '../components/ui'
import type { TokenResponse } from '../types'

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

      const token = result as TokenResponse
      localStorage.setItem('access_token', token.access_token)
      localStorage.setItem('role', token.role)
      localStorage.setItem('tenant_id', String(token.tenant_id))
      localStorage.setItem('account_scope', token.account_scope)
      localStorage.setItem('platform_permissions', JSON.stringify(token.platform_permissions))
      navigate(token.account_scope === 'PLATFORM' ? '/platform' : '/dashboard')
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
    <div className="min-h-screen bg-slate-50 text-ink-100 grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
      <section className="hidden lg:flex min-h-screen bg-brand-950 text-white px-12 py-10 flex-col justify-between">
        <div className="flex items-center gap-3">
          <BrandMark className="bg-white/10 ring-white/20" />
          <div>
            <p className="text-sm font-semibold leading-tight">{t('app.title')}</p>
            <p className="text-xs text-brand-100/80 leading-tight">{t('app.subtitle')}</p>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="text-xs uppercase tracking-wider text-brand-200 font-bold">
            LOPDP workspace
          </p>
          <h1 className="mt-4 text-6xl font-bold leading-none tracking-tight">
            {t('app.title')}
          </h1>
          <p className="mt-5 text-base leading-7 text-brand-100/80">
            {t('app.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs text-brand-100/80">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            LOPDP
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            DPO
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            ROPA
          </div>
        </div>
      </section>

      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <header className="text-center mb-6 lg:hidden">
            <BrandMark size="lg" className="mx-auto" />
            <h1 className="mt-4 text-2xl font-semibold text-ink-50">{t('app.title')}</h1>
            <p className="text-sm text-ink-300 mt-1">{t('auth.tagline')}</p>
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
    </div>
  )
}
