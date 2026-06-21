import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  GlassCard,
  GlassPanel,
  KPICard,
  LoadingState,
  PageHeader,
  Select,
  Tabs,
} from '../components/ui'
import {
  downloadSummaryCsv,
  downloadSummaryPdf,
  getConsolidatedSummary,
  getKPIs,
  getTrends,
} from '../api/reports'
import type {
  ConsolidatedSummaryReport,
  ReportKPIs,
  ReportTrendPoint,
  ReportTrends,
} from '../types'
import { extractErrorMessage } from '../lib/errors'
import { downloadBlob, formatNumber, formatPercent } from '../lib/format'

const TREND_RANGES = [3, 6, 12, 24] as const

export default function ReportsPage() {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<ReportKPIs | null>(null)
  const [trends, setTrends] = useState<ReportTrends | null>(null)
  const [summary, setSummary] = useState<ConsolidatedSummaryReport | null>(null)
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingCsv, setDownloadingCsv] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [kpiData, trendData, summaryData] = await Promise.all([
        getKPIs().catch(() => null),
        getTrends(months).catch(() => null),
        getConsolidatedSummary().catch(() => null),
      ])
      setKpis(kpiData)
      setTrends(trendData)
      setSummary(summaryData)
      if (!kpiData && !trendData && !summaryData) {
        setError(t('reports.loadFailed'))
      }
    } catch (err) {
      setError(extractErrorMessage(err, t('reports.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [months, t])

  useEffect(() => {
    load()
  }, [load])

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    setError('')
    try {
      const blob = await downloadSummaryPdf()
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      downloadBlob(blob, `compliance_report_${ts}.pdf`)
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleDownloadCsv() {
    setDownloadingCsv(true)
    setError('')
    try {
      const blob = await downloadSummaryCsv()
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      downloadBlob(blob, `compliance_report_${ts}.csv`)
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setDownloadingCsv(false)
    }
  }

  const overviewTab = (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label={t('reports.kpis.activitiesActive')}
          value={kpis ? formatPercent(kpis.pct_activities_active, 1) : '—'}
          hint={t('reports.kpis.activitiesActiveHint')}
          loading={loading}
        />
        <KPICard
          label={t('reports.kpis.avgRisk')}
          value={kpis ? kpis.avg_risk_score.toFixed(2) : '—'}
          hint={t('reports.kpis.avgRiskHint')}
          loading={loading}
        />
        <KPICard
          label={t('reports.kpis.arcoOnTime')}
          value={kpis ? formatPercent(kpis.pct_arco_on_time, 1) : '—'}
          hint={t('reports.kpis.arcoOnTimeHint')}
          loading={loading}
        />
        <KPICard
          label={t('reports.kpis.breaches')}
          value={kpis ? kpis.reported_breaches : '—'}
          hint={t('reports.kpis.breachesHint')}
          loading={loading}
        />
      </div>

      {kpis && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-ink-50">{t('reports.alerts.title')}</h3>
          <p className="text-xs text-ink-300 mt-1">{t('reports.alerts.description')}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <AlertRow
              tone={kpis.alerts.overdue_arco_requests > 0 ? 'danger' : 'neutral'}
              label={t('reports.alerts.overdueArco')}
              value={kpis.alerts.overdue_arco_requests}
            />
            <AlertRow
              tone={kpis.alerts.open_critical_findings > 0 ? 'danger' : 'neutral'}
              label={t('reports.alerts.criticalFindings')}
              value={kpis.alerts.open_critical_findings}
            />
            <AlertRow
              tone={kpis.alerts.open_high_risk_assessments > 0 ? 'warning' : 'neutral'}
              label={t('reports.alerts.highRisk')}
              value={kpis.alerts.open_high_risk_assessments}
            />
          </div>
        </GlassCard>
      )}
    </div>
  )

  const trendsTab = (
    <div className="space-y-4">
      <GlassCard padded={false} className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow min-w-[12rem]">
            <Select
              label={t('reports.trends.range')}
              value={months.toString()}
              onChange={(e) => setMonths(Number(e.target.value))}
              options={TREND_RANGES.map((m) => ({
                value: m.toString(),
                label: t('reports.trends.months', { count: m }),
              }))}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={load}>
            {t('common.refresh')}
          </Button>
        </div>
      </GlassCard>
      <GlassPanel>
        <div className="p-4">
          {loading ? (
            <LoadingState rows={4} />
          ) : !trends || trends.trends.length === 0 ? (
            <p className="text-sm text-ink-300">{t('reports.trends.empty')}</p>
          ) : (
            <TrendsTable points={trends.trends} t={t} />
          )}
        </div>
      </GlassPanel>
    </div>
  )

  const summaryTab = summary ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        title={t('reports.summary.activities')}
        rows={[{ label: t('reports.summary.total'), value: summary.total_treatment_activities }]}
      />
      <SummaryCard
        title={t('reports.summary.risks')}
        rows={[
          { label: t('reports.summary.total'), value: summary.risks.total },
          { label: t('reports.summary.high'), value: summary.risks.high, tone: 'danger' },
          { label: t('reports.summary.medium'), value: summary.risks.medium, tone: 'warning' },
          { label: t('reports.summary.low'), value: summary.risks.low, tone: 'success' },
        ]}
      />
      <SummaryCard
        title={t('reports.summary.arco')}
        rows={[
          { label: t('reports.summary.total'), value: summary.arco.total },
          { label: t('reports.summary.open'), value: summary.arco.open, tone: 'warning' },
          { label: t('reports.summary.completed'), value: summary.arco.completed, tone: 'success' },
        ]}
      />
      <SummaryCard
        title={t('reports.summary.incidents')}
        rows={[
          { label: t('reports.summary.total'), value: summary.incidents.total },
          { label: t('reports.summary.open'), value: summary.incidents.open, tone: 'warning' },
          {
            label: t('reports.summary.regulator'),
            value: summary.incidents.regulatory_notification_required,
            tone: 'danger',
          },
        ]}
      />
      <SummaryCard
        title={t('reports.summary.actionPlans')}
        rows={[
          { label: t('reports.summary.total'), value: summary.action_plans.total },
          { label: t('reports.summary.draft'), value: summary.action_plans.draft },
          { label: t('reports.summary.active'), value: summary.action_plans.active, tone: 'info' },
          {
            label: t('reports.summary.completed'),
            value: summary.action_plans.completed,
            tone: 'success',
          },
        ]}
      />
      <SummaryCard
        title={t('reports.summary.audits')}
        rows={[
          { label: t('reports.summary.totalPlans'), value: summary.audits.total_plans },
          {
            label: t('reports.summary.openFindings'),
            value: summary.audits.open_findings,
            tone: 'warning',
          },
          {
            label: t('reports.summary.criticalFindings'),
            value: summary.audits.critical_findings,
            tone: 'danger',
          },
        ]}
      />
      <SummaryCard
        title={t('reports.summary.consents')}
        rows={[
          { label: t('reports.summary.total'), value: summary.consents.total },
          { label: t('reports.summary.active'), value: summary.consents.active, tone: 'success' },
          { label: t('reports.summary.revoked'), value: summary.consents.revoked, tone: 'danger' },
          {
            label: t('reports.summary.sensitive'),
            value: summary.consents.sensitive,
            tone: 'warning',
          },
        ]}
      />
      <SummaryCard
        title={t('reports.summary.documents')}
        rows={[
          { label: t('reports.summary.legalDocs'), value: summary.total_legal_documents },
          { label: t('reports.summary.dpias'), value: summary.total_dpias },
          {
            label: t('reports.summary.openRemediations'),
            value: summary.open_remediations,
            tone: 'warning',
          },
        ]}
      />
    </div>
  ) : (
    <p className="text-sm text-ink-300">{t('reports.summary.empty')}</p>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              {t('common.refresh')}
            </Button>
            <Button
              variant="secondary"
              loading={downloadingCsv}
              onClick={handleDownloadCsv}
            >
              {t('common.exportCsv')}
            </Button>
            <Button onClick={handleDownloadPdf} loading={downloadingPdf}>
              {t('common.exportPdf')}
            </Button>
          </div>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}

      <Tabs
        tabs={[
          { id: 'overview', label: t('reports.tabs.overview'), content: overviewTab },
          { id: 'trends', label: t('reports.tabs.trends'), content: trendsTab },
          { id: 'summary', label: t('reports.tabs.summary'), content: summaryTab },
        ]}
      />
    </div>
  )
}

interface AlertRowProps {
  tone: 'danger' | 'warning' | 'neutral'
  label: string
  value: number
}

function AlertRow({ tone, label, value }: AlertRowProps) {
  return (
    <div className="rounded-lg p-3 flex items-center justify-between bg-slate-50 border border-slate-200">
      <span className="text-sm text-ink-200">{label}</span>
      <Badge tone={tone === 'neutral' ? 'success' : tone}>{value}</Badge>
    </div>
  )
}

interface SummaryRow {
  label: string
  value: number
  tone?: 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'brand'
}

function SummaryCard({ title, rows }: { title: string; rows: SummaryRow[] }) {
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-ink-50">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-ink-300">{row.label}</span>
            <Badge tone={row.tone ?? 'neutral'}>{formatNumber(row.value)}</Badge>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

interface TrendsTableProps {
  points: ReportTrendPoint[]
  t: (k: string) => string
}

function TrendsTable({ points, t }: TrendsTableProps) {
  const max = useMemo(() => {
    const all = points.flatMap((p) => [
      p.new_treatment_activities,
      p.new_incidents,
      p.new_arco_requests,
      p.new_consents,
      p.new_risk_assessments,
    ])
    return Math.max(1, ...all)
  }, [points])

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-300 border-b border-slate-200">
            <th className="px-3 py-2 text-left">{t('reports.trends.month')}</th>
            <th className="px-3 py-2 text-right">{t('reports.trends.activities')}</th>
            <th className="px-3 py-2 text-right">{t('reports.trends.risks')}</th>
            <th className="px-3 py-2 text-right">{t('reports.trends.incidents')}</th>
            <th className="px-3 py-2 text-right">{t('reports.trends.arco')}</th>
            <th className="px-3 py-2 text-right">{t('reports.trends.consents')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {points.map((p) => (
            <tr key={p.month}>
              <td className="px-3 py-2 text-ink-100">{p.month}</td>
              <TrendCell value={p.new_treatment_activities} max={max} tone="bg-brand-500/40" />
              <TrendCell value={p.new_risk_assessments} max={max} tone="bg-amber-500/40" />
              <TrendCell value={p.new_incidents} max={max} tone="bg-rose-500/40" />
              <TrendCell value={p.new_arco_requests} max={max} tone="bg-sky-500/40" />
              <TrendCell value={p.new_consents} max={max} tone="bg-emerald-500/40" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TrendCell({ value, max, tone }: { value: number; max: number; tone: string }) {
  const pct = Math.max(2, Math.round((value / max) * 100))
  return (
    <td className="px-3 py-2">
      <div className="flex items-center gap-2 justify-end">
        <div className="relative w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
          <span
            aria-hidden
            className={`absolute inset-y-0 left-0 ${tone}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-ink-100 font-medium w-10 text-right">{formatNumber(value)}</span>
      </div>
    </td>
  )
}
