import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  GlassCard,
  GlassPanel,
  KPICard,
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Badge,
  Button,
} from '../components/ui'
import { getKPIs, getTrends } from '../api/reports'
import { listAlerts } from '../api/alerts'
import type { Alert, ReportKPIs, ReportTrends } from '../types'
import { formatNumber, formatPercent, formatRelative, downloadBlob } from '../lib/format'
import { downloadSummaryPdf, downloadSummaryCsv } from '../api/reports'
import { cn } from '../lib/cn'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface DashboardData {
  kpis: ReportKPIs | null
  trends: ReportTrends | null
  alerts: Alert[]
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<DashboardData>({ kpis: null, trends: null, alerts: [] })
  const [errors, setErrors] = useState<{ kpis?: boolean; trends?: boolean; alerts?: boolean }>({})
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      const next: DashboardData = { kpis: null, trends: null, alerts: [] }
      const errs: typeof errors = {}
      const results = await Promise.allSettled([getKPIs(), getTrends(6), listAlerts({ limit: 5 })])
      if (cancelled) return
      const [kpiResult, trendResult, alertResult] = results
      if (kpiResult.status === 'fulfilled') next.kpis = kpiResult.value
      else errs.kpis = true
      if (trendResult.status === 'fulfilled') next.trends = trendResult.value
      else errs.trends = true
      if (alertResult.status === 'fulfilled') next.alerts = alertResult.value
      else errs.alerts = true
      setData(next)
      setErrors(errs)
      setStatus(
        kpiResult.status === 'rejected' &&
          trendResult.status === 'rejected' &&
          alertResult.status === 'rejected'
          ? 'error'
          : 'ready'
      )
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExport(kind: 'pdf' | 'csv') {
    setExporting(kind)
    try {
      const blob =
        kind === 'pdf' ? await downloadSummaryPdf() : await downloadSummaryCsv()
      const filename = `datalegal-summary-${new Date().toISOString().slice(0, 10)}.${kind}`
      downloadBlob(blob, filename)
    } catch {
      // graceful failure: UI stays put
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting === 'pdf'}
              onClick={() => handleExport('pdf')}
            >
              {t('common.exportPdf')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting === 'csv'}
              onClick={() => handleExport('csv')}
            >
              {t('common.exportCsv')}
            </Button>
          </>
        }
      />

      {status === 'error' && (
        <ErrorState
          title={t('errors.loadDashboard')}
          description={t('errors.serverError')}
          action={
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
          }
        />
      )}

      <KPISection
        loading={status === 'loading'}
        kpis={data.kpis}
        hasError={errors.kpis === true}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <TrendsPanel
          className="xl:col-span-2"
          loading={status === 'loading'}
          trends={data.trends}
          hasError={errors.trends === true}
        />
        <AlertsPanel
          loading={status === 'loading'}
          alerts={data.alerts}
          hasError={errors.alerts === true}
        />
      </div>

      <QuickActions />
    </div>
  )
}

function KPISection({
  loading,
  kpis,
  hasError,
}: {
  loading: boolean
  kpis: ReportKPIs | null
  hasError: boolean
}) {
  const { t } = useTranslation()
  const activitiesPct = toNumber(kpis?.pct_activities_active)
  const avgRisk = toNumber(kpis?.avg_risk_score)
  const arcoPct = toNumber(kpis?.pct_arco_on_time)
  const breaches = toNumber(kpis?.reported_breaches)

  return (
    <section aria-label={t('dashboard.kpis.title')}>
      {hasError && !loading && (
        <p className="text-xs text-rose-200 mb-2" role="status">
          {t('errors.loadDashboard')}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          loading={loading}
          label={t('dashboard.kpis.activitiesRegistered')}
          value={activitiesPct !== null ? formatPercent(activitiesPct, 0) : '—'}
          hint={t('dashboard.kpis.activitiesHint')}
        />
        <KPICard
          loading={loading}
          label={t('dashboard.kpis.avgRisk')}
          value={avgRisk !== null ? avgRisk.toFixed(1) : '—'}
          hint={t('dashboard.kpis.avgRiskHint')}
        />
        <KPICard
          loading={loading}
          label={t('dashboard.kpis.arcoOnTime')}
          value={arcoPct !== null ? formatPercent(arcoPct, 0) : '—'}
          hint={t('dashboard.kpis.arcoHint')}
        />
        <KPICard
          loading={loading}
          label={t('dashboard.kpis.breaches')}
          value={breaches !== null ? formatNumber(breaches) : '—'}
          hint={t('dashboard.kpis.breachesHint')}
        />
      </div>
    </section>
  )
}

function TrendsPanel({
  loading,
  trends,
  hasError,
  className,
}: {
  loading: boolean
  trends: ReportTrends | null
  hasError: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const series = buildTrendSeries(trends)

  return (
    <GlassCard className={cn(className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-ink-50">{t('dashboard.trends.title')}</h2>
          <p className="text-xs text-ink-300 mt-0.5">{t('dashboard.trends.description')}</p>
        </div>
      </div>
      {loading ? (
        <LoadingState rows={4} />
      ) : hasError ? (
        <ErrorState description={t('errors.loadDashboard')} />
      ) : series.points.length === 0 ? (
        <EmptyState title={t('dashboard.trends.noData')} />
      ) : (
        <TrendChart series={series} />
      )}
    </GlassCard>
  )
}

interface TrendSeries {
  labels: string[]
  points: number[]
  max: number
}

function buildTrendSeries(trends: ReportTrends | null): TrendSeries {
  if (!trends || !Array.isArray(trends.trends)) {
    return { labels: [], points: [], max: 0 }
  }
  const labels = trends.trends.map((row) => row.month)
  const points = trends.trends.map((row) =>
    Number.isFinite(row.new_risk_assessments) ? row.new_risk_assessments : 0
  )
  const max = Math.max(1, ...points)
  return { labels, points, max }
}

function TrendChart({ series }: { series: TrendSeries }) {
  const width = 600
  const height = 180
  const padX = 24
  const padY = 16
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const stepX = series.points.length > 1 ? innerW / (series.points.length - 1) : innerW
  const points = series.points.map((value, i) => {
    const x = padX + stepX * i
    const y = padY + innerH - (value / series.max) * innerH
    return { x, y, value }
  })
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const areaD = `${pathD} L ${(padX + innerW).toFixed(1)} ${(padY + innerH).toFixed(1)} L ${padX} ${(padY + innerH).toFixed(1)} Z`

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto scrollbar-thin">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44"
          role="img"
          aria-label="Risk score trend"
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#trendFill)" />
          <path d={pathD} fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#e0e7ff" />
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] text-ink-400">
        {series.labels.map((label, i) => (
          <div key={label + i} className="text-center">
            <span className="block uppercase tracking-wider">{label}</span>
            <span className="text-ink-200 font-medium">{series.points[i]?.toFixed(1) ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertsPanel({
  loading,
  alerts,
  hasError,
}: {
  loading: boolean
  alerts: Alert[]
  hasError: boolean
}) {
  const { t } = useTranslation()
  return (
    <GlassCard padded={false} className="flex flex-col">
      <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink-50">{t('dashboard.alerts.title')}</h2>
        <Link to="/alerts" className="text-xs text-brand-200 hover:text-brand-100">
          {t('dashboard.alerts.viewAll')}
        </Link>
      </header>
      {loading ? (
        <div className="p-5">
          <LoadingState rows={3} />
        </div>
      ) : hasError ? (
        <div className="p-5">
          <ErrorState description={t('errors.loadDashboard')} />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState title={t('dashboard.alerts.empty')} />
      ) : (
        <ul className="divide-y divide-white/5">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-50 truncate">{alert.title}</p>
                  <p className="text-xs text-ink-300 line-clamp-2">{alert.message}</p>
                  <p className="text-[10px] text-ink-400 mt-1">{formatRelative(alert.created_at)}</p>
                </div>
                <Badge tone={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'danger' : alert.severity === 'WARNING' ? 'warning' : 'info'}>
                  {alert.severity}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}

function QuickActions() {
  const { t } = useTranslation()
  const actions = [
    {
      title: t('dashboard.quickActions.registerActivity'),
      hint: t('dashboard.quickActions.registerActivityHint'),
      to: '/treatment-activities',
    },
    {
      title: t('dashboard.quickActions.runRisk'),
      hint: t('dashboard.quickActions.runRiskHint'),
      to: '/risk-assessments',
    },
    {
      title: t('dashboard.quickActions.openARCO'),
      hint: t('dashboard.quickActions.openARCOHint'),
      to: '/arco',
    },
    {
      title: t('dashboard.quickActions.exportReport'),
      hint: t('dashboard.quickActions.exportReportHint'),
      to: '/reports',
    },
  ]

  return (
    <GlassPanel>
      <header className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-semibold text-ink-50">
          {t('dashboard.quickActions.title')}
        </h2>
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <li key={action.to} className="border-b sm:border-r last:border-r-0 xl:last:border-r border-slate-100">
            <Link
              to={action.to}
              className="block px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-semibold text-ink-50">{action.title}</p>
              <p className="text-xs text-ink-300 mt-0.5">{action.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
    </GlassPanel>
  )
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}
