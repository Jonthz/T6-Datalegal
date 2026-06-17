import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, GlassCard, PageHeader } from '../components/ui'
import { useAuth } from '../hooks/useAuth'

const BUILD_LABEL = 'Sprint 10 — Final polish'

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { auth, clearAuth } = useAuth()

  const tokenPreview = useMemo(() => {
    if (!auth.token) return null
    const tail = auth.token.slice(-6)
    return `••••${tail}`
  }, [auth.token])

  const handleSignOut = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-base font-semibold text-ink-50">
            {t('settings.sections.identity')}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.identity.role')}</dt>
              <dd>
                {auth.role ? (
                  <Badge tone="brand">{auth.role}</Badge>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.identity.tenant')}</dt>
              <dd className="text-ink-100">
                {auth.tenantId != null ? `#${auth.tenantId}` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.identity.session')}</dt>
              <dd className="text-ink-100 font-mono text-xs">
                {tokenPreview ?? t('settings.identity.tokenNone')}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-400">{t('settings.identity.sessionHint')}</p>
        </GlassCard>

        <GlassCard>
          <h2 className="text-base font-semibold text-ink-50">
            {t('settings.sections.security')}
          </h2>
          <div className="mt-4 space-y-5">
            <div>
              <p className="text-sm font-medium text-ink-100">
                {t('settings.security.mfaTitle')}
              </p>
              <p className="text-xs text-ink-300 mt-1">{t('settings.security.mfaBody')}</p>
              <div className="mt-3">
                <Link to="/mfa-setup">
                  <Button variant="secondary" size="sm">
                    {t('settings.security.mfaManage')}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-medium text-ink-100">
                {t('settings.security.signOutTitle')}
              </p>
              <p className="text-xs text-ink-300 mt-1">{t('settings.security.signOutBody')}</p>
              <div className="mt-3">
                <Button variant="danger" size="sm" onClick={handleSignOut}>
                  {t('settings.security.signOutAction')}
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-base font-semibold text-ink-50">
            {t('settings.sections.preferences')}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.preferences.language')}</dt>
              <dd>
                <Badge tone="info">{t('settings.preferences.current')}</Badge>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-400">{t('settings.preferences.languageHint')}</p>
        </GlassCard>

        <GlassCard>
          <h2 className="text-base font-semibold text-ink-50">
            {t('settings.sections.about')}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.about.platform')}</dt>
              <dd className="text-ink-100">{t('app.title')}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.about.version')}</dt>
              <dd className="text-ink-100">
                {t('settings.about.buildLabel', { label: BUILD_LABEL })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">{t('settings.about.docs')}</dt>
              <dd>
                <a
                  className="text-xs text-brand-200 hover:text-brand-100"
                  href="/api/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('settings.about.docsLink')}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-ink-300">{t('settings.about.support')}</dt>
              <dd className="text-xs text-ink-400 mt-1">{t('settings.about.supportHint')}</dd>
            </div>
          </dl>
        </GlassCard>
      </div>
    </div>
  )
}
