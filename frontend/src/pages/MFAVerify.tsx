import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { verifyMFA } from '../api/auth'
import { Alert, Button, GlassCard } from '../components/ui'

export default function MFAVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const mfaToken = sessionStorage.getItem('mfa_token')
    if (!mfaToken) {
      navigate('/login')
      return
    }

    try {
      const result = await verifyMFA(mfaToken, code)
      sessionStorage.removeItem('mfa_token')
      localStorage.setItem('access_token', result.access_token)
      localStorage.setItem('role', result.role)
      localStorage.setItem('tenant_id', String(result.tenant_id))
      navigate('/dashboard')
    } catch {
      setError(t('auth.mfaFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <GlassCard className="shadow-glass-lg">
          <h1 className="text-xl font-semibold text-ink-50">{t('auth.mfaTitle')}</h1>
          <p className="text-sm text-ink-300 mt-1 mb-5">{t('auth.mfaDescription')}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-200 mb-1.5">
                {t('auth.mfaCode')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full h-14 bg-white border border-slate-300 rounded-lg px-4 text-center text-2xl tracking-[0.5em] text-ink-50 focus:bg-white focus:border-brand-500/70"
                placeholder="000000"
                autoFocus
              />
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={code.length !== 6}
            >
              {t('auth.mfaVerify')}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  )
}
