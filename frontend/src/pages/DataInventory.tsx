import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  GlassCard,
  KPICard,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { getDataInventoryProgress } from '../api/dataInventory'
import type { DataInventoryProgress } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDateTime, formatPercent, formatNumber } from '../lib/format'

export default function DataInventoryPage() {
  const { t } = useTranslation()
  const [progress, setProgress] = useState<DataInventoryProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getDataInventoryProgress()
      setProgress(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('dataInventory.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const ta = progress?.treatment_activities

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dataInventory.title')}
        description={t('dataInventory.description')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {t('common.refresh')}
          </Button>
        }
        meta={
          progress && (
            <p className="text-xs text-ink-300">
              {t('dataInventory.asOf', { date: formatDateTime(progress.as_of) })}
            </p>
          )
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          loading={loading}
          label={t('dataInventory.kpis.completion')}
          value={ta ? formatPercent(ta.completion_pct, 0) : '—'}
          hint={t('dataInventory.kpis.completionHint')}
        />
        <KPICard
          loading={loading}
          label={t('dataInventory.kpis.activities')}
          value={ta ? formatNumber(ta.total) : '—'}
          hint={t('dataInventory.kpis.activitiesHint')}
        />
        <KPICard
          loading={loading}
          label={t('dataInventory.kpis.assets')}
          value={progress ? formatNumber(progress.information_assets_total) : '—'}
          hint={t('dataInventory.kpis.assetsHint')}
        />
        <KPICard
          loading={loading}
          label={t('dataInventory.kpis.assessments')}
          value={progress ? formatNumber(progress.risk_assessments_total) : '—'}
          hint={t('dataInventory.kpis.assessmentsHint')}
        />
      </div>

      {loading && !progress ? (
        <LoadingState rows={4} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <BreakdownCard
            title={t('dataInventory.statusBreakdown')}
            entries={ta
              ? [
                  { label: 'DRAFT', value: ta.draft, tone: 'info' as const },
                  { label: 'ACTIVE', value: ta.active, tone: 'success' as const },
                  { label: 'ARCHIVED', value: ta.archived, tone: 'neutral' as const },
                ]
              : []}
            empty={t('dataInventory.noRiskScores')}
          />
          <BreakdownCard
            title={t('dataInventory.riskBreakdown')}
            entries={progress
              ? Object.entries(progress.risk_distribution).map(([level, count]) => ({
                  label: level,
                  value: count,
                  tone:
                    level === 'HIGH'
                      ? ('danger' as const)
                      : level === 'MEDIUM'
                        ? ('warning' as const)
                        : ('success' as const),
                }))
              : []}
            empty={t('dataInventory.noRiskScores')}
          />
          <BreakdownCard
            title={t('dataInventory.classBreakdown')}
            entries={progress
              ? Object.entries(progress.classification_distribution).map(([code, count]) => ({
                  label: code,
                  value: count,
                  tone: 'brand' as const,
                }))
              : []}
            empty={t('dataInventory.noClassifications')}
          />
        </div>
      )}
    </div>
  )
}

interface BreakdownEntry {
  label: string
  value: number
  tone: 'info' | 'success' | 'neutral' | 'warning' | 'danger' | 'brand'
}

function BreakdownCard({
  title,
  entries,
  empty,
}: {
  title: string
  entries: BreakdownEntry[]
  empty: string
}) {
  const total = entries.reduce((sum, e) => sum + e.value, 0)
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-ink-50 mb-3">{title}</h3>
      {entries.length === 0 || total === 0 ? (
        <p className="text-xs text-ink-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0
            return (
              <li key={entry.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge tone={entry.tone}>{entry.label}</Badge>
                  <span className="text-ink-200 font-medium">
                    {entry.value} · {formatPercent(pct, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-400/70"
                    style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}
