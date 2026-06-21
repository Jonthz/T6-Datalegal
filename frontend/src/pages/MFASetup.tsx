import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCode } from 'react-qrcode-logo'
import { setupMFA, confirmMFA } from '../api/auth'
import { Alert, Button, GlassCard } from '../components/ui'

export default function MFASetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setupMFA()
      .then(({ secret: s, uri: u }) => {
        setSecret(s)
        setUri(u)
      })
      .catch(() => setError(t('common.error')))
  }, [t])

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmMFA(code)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1800)
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
          <h1 className="text-xl font-semibold text-ink-50">{t('auth.mfaSetupTitle')}</h1>
          <p className="text-sm text-ink-300 mt-1 mb-5">{t('auth.mfaSetupDescription')}</p>

          {uri && (
            <div className="flex justify-center mb-5">
              <div className="bg-white p-3 rounded-lg">
                <QRCode value={uri} size={184} />
              </div>
            </div>
          )}

          {secret && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-ink-400">
                {t('auth.mfaSetupManualKey')}
              </p>
              <code className="text-xs font-mono text-ink-100 break-all">{secret}</code>
            </div>
          )}

          {success ? (
            <Alert tone="success">{t('auth.mfaSetupSuccess')}</Alert>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
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
                />
              </div>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={code.length !== 6}
              >
                {t('auth.mfaConfirm')}
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
