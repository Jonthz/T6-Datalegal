import { useTranslation } from 'react-i18next'
import { GlassCard, GlassPanel, Badge, Button, PageHeader } from '../../components/ui'

interface PlaceholderEndpoint {
  method: string
  path: string
  description?: string
}

interface ModulePlaceholderProps {
  /** i18n key path used to derive title/description, e.g. 'placeholder.modules.departments' */
  i18nKey: string
  endpoints?: PlaceholderEndpoint[]
  /** e.g. 'Sprint 7', 'Sprint 8' */
  scheduledFor?: string
  /** Optional secondary documentation note */
  notes?: string
}

export default function ModulePlaceholder({
  i18nKey,
  endpoints = [],
  scheduledFor,
  notes,
}: ModulePlaceholderProps) {
  const { t } = useTranslation()
  const title = t(`${i18nKey}.title`)
  const description = t(`${i18nKey}.description`)

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        meta={
          <Badge tone="brand">{t('placeholder.comingSoonTitle')}</Badge>
        }
      />

      <GlassCard>
        <p className="text-sm text-ink-200">{t('placeholder.comingSoonBody')}</p>
        {scheduledFor && (
          <p className="mt-3 text-xs text-ink-300">
            {t('placeholder.scheduledFor')}: <span className="text-ink-100 font-medium">{scheduledFor}</span>
          </p>
        )}
        {notes && <p className="mt-3 text-xs text-ink-300">{notes}</p>}
      </GlassCard>

      {endpoints.length > 0 && (
        <GlassPanel>
          <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-50">
              {t('placeholder.explore')}
            </h2>
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-200 hover:text-brand-100"
            >
              /api/docs ↗
            </a>
          </div>
          <ul className="divide-y divide-white/5">
            {endpoints.map((ep) => (
              <li key={`${ep.method}-${ep.path}`} className="px-5 py-3 flex items-start gap-3">
                <Badge tone="info" className="font-mono">
                  {ep.method}
                </Badge>
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink-50 break-all">{ep.path}</p>
                  {ep.description && (
                    <p className="text-xs text-ink-300 mt-0.5">{ep.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <div className="flex items-center gap-2 text-xs text-ink-400">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          ← {t('common.back')}
        </Button>
      </div>
    </div>
  )
}
