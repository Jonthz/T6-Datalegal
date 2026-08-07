import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import {
  Alert as AlertBox,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  GlassCard,
  GlassPanel,
  IconButton,
  KPICard,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { downloadROPAPdf, downloadROPAXlsx, getROPAReport } from '../api/ropa'
import type { ROPAActivity, ROPAReport } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { downloadBlob, formatDateTime } from '../lib/format'

export default function ROPAPage() {
  const { t } = useTranslation()
  const [report, setReport] = useState<ROPAReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadingXlsx, setDownloadingXlsx] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getROPAReport()
      setReport(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('ropa.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleDownload() {
    setDownloading(true)
    setDownloadError('')
    try {
      const blob = await downloadROPAPdf()
      downloadBlob(blob, 'ropa_report.pdf')
    } catch (err) {
      setDownloadError(extractErrorMessage(err, t('common.error')))
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadXlsx() {
    setDownloadingXlsx(true)
    setDownloadError('')
    try {
      const blob = await downloadROPAXlsx()
      downloadBlob(blob, 'RAT.xlsx')
    } catch (err) {
      setDownloadError(extractErrorMessage(err, t('common.error')))
    } finally {
      setDownloadingXlsx(false)
    }
  }

  const groups = useMemo(() => {
    if (!report) return [] as Array<{ basis: string; activities: ROPAActivity[] }>
    return Object.entries(report.activities_by_legal_basis)
      .map(([basis, activities]) => ({ basis, activities }))
      .sort((a, b) => b.activities.length - a.activities.length)
  }, [report])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ropa.title')}
        description={t('ropa.description')}
        actions={
          <div className="flex items-center gap-2">
            <IconButton
              label={t('common.refresh')}
              icon={<RefreshCw className="h-4 w-4" />}
              variant="secondary"
              size="md"
              onClick={load}
            />
            <IconButton
              label={t('ropa.downloadPdf')}
              icon={<FileText className="h-5 w-5" />}
              variant="primary"
              size="md"
              onClick={handleDownload}
              loading={downloading}
              disabled={!report || report.total_activities === 0}
            />
            <IconButton
              label={t('ropa.downloadXlsx')}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              variant="primary"
              size="md"
              onClick={handleDownloadXlsx}
              loading={downloadingXlsx}
              disabled={!report || report.total_activities === 0}
            />
          </div>
        }
      />

      {downloadError && <AlertBox tone="danger">{downloadError}</AlertBox>}

      {loading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState
          title={t('ropa.loadFailed')}
          description={error}
          action={
            <Button onClick={load} size="sm" variant="secondary">
              {t('common.retry')}
            </Button>
          }
        />
      ) : !report ? (
        <EmptyState
          title={t('ropa.empty')}
          description={t('ropa.emptyHint')}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard
              label={t('ropa.kpis.total')}
              value={report.total_activities}
              hint={t('ropa.kpis.totalHint')}
            />
            <KPICard
              label={t('ropa.kpis.legalBases')}
              value={Object.keys(report.activities_by_legal_basis).length}
              hint={t('ropa.kpis.legalBasesHint')}
            />
            <KPICard
              label={t('ropa.kpis.generated')}
              value={formatDateTime(report.generated_at)}
              hint={t('ropa.kpis.generatedHint')}
            />
          </div>

          {report.total_activities === 0 ? (
            <EmptyState title={t('ropa.empty')} description={t('ropa.emptyHint')} />
          ) : (
            <div className="space-y-4">
              {groups.map(({ basis, activities }) => (
                <GlassPanel key={basis}>
                  <header className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-50">
                        {t('ropa.section.legalBasis')}: {basis}
                      </h3>
                      <p className="text-xs text-ink-300">
                        {activities.length} {t('ropa.section.activities')}
                      </p>
                    </div>
                    <Badge tone="brand">{activities.length}</Badge>
                  </header>
                  <ul className="divide-y divide-white/5">
                    {activities.map((act) => (
                      <li key={act.id} className="p-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink-50">{act.name}</span>
                          <Badge tone="neutral">#{act.id}</Badge>
                          <Badge tone={act.status === 'ACTIVE' ? 'success' : 'info'}>
                            {act.status}
                          </Badge>
                          {act.is_cross_border && (
                            <Badge tone="warning">{t('ropa.section.crossBorder')}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-ink-200">{act.purpose}</p>
                        <div className="grid gap-x-6 gap-y-1 md:grid-cols-2 text-xs text-ink-300">
                          <p>
                            <span className="text-ink-400">{t('ropa.section.dataTypes')}:</span>{' '}
                            {act.personal_data_types?.join(', ') || '—'}
                          </p>
                          <p>
                            <span className="text-ink-400">{t('ropa.section.subjects')}:</span>{' '}
                            {act.data_subjects?.join(', ') || '—'}
                          </p>
                          <p>
                            <span className="text-ink-400">{t('ropa.section.retention')}:</span>{' '}
                            {act.retention_period_days} {t('ropa.section.days')}
                          </p>
                          {act.is_cross_border && (
                            <p>
                              <span className="text-ink-400">
                                {t('ropa.section.destinations')}:
                              </span>{' '}
                              {act.destination_countries?.join(', ') || '—'}
                            </p>
                          )}
                          {act.processor_name && (
                            <p className="md:col-span-2">
                              <span className="text-ink-400">{t('ropa.section.processor')}:</span>{' '}
                              {act.processor_name}
                              {act.processor_country ? ` (${act.processor_country})` : ''}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </GlassPanel>
              ))}
            </div>
          )}

          <GlassCard className="text-sm text-ink-300">
            <p>
              {t('ropa.footer.note')}
            </p>
          </GlassCard>
        </>
      )}
    </div>
  )
}
