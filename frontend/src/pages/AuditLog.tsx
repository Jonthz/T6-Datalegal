import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  Input,
  PageHeader,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import { exportAuditLogCsv, listAuditLog } from '../api/audit'
import type { AuditLog } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { downloadBlob, formatDateTime } from '../lib/format'

interface Filters {
  action: string
  user_id: string
  from_date: string
  to_date: string
}

const EMPTY_FILTERS: Filters = {
  action: '',
  user_id: '',
  from_date: '',
  to_date: '',
}

function toApiParams(filters: Filters): {
  action?: string
  user_id?: number
  from_date?: string
  to_date?: string
  limit?: number
} {
  const params: {
    action?: string
    user_id?: number
    from_date?: string
    to_date?: string
    limit?: number
  } = { limit: 300 }
  if (filters.action.trim()) params.action = filters.action.trim()
  if (filters.user_id.trim()) params.user_id = Number(filters.user_id)
  if (filters.from_date) params.from_date = new Date(filters.from_date).toISOString()
  if (filters.to_date) params.to_date = new Date(filters.to_date + 'T23:59:59').toISOString()
  return params
}

function actionTone(action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const upper = action.toUpperCase()
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REVOKE')) {
    return 'danger'
  }
  if (upper.includes('CREATE') || upper.includes('ADD') || upper.includes('INSERT')) {
    return 'success'
  }
  if (upper.includes('UPDATE') || upper.includes('PATCH') || upper.includes('EDIT')) {
    return 'warning'
  }
  if (upper.includes('LOGIN') || upper.includes('VIEW') || upper.includes('READ')) {
    return 'info'
  }
  return 'neutral'
}

export default function AuditLogPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listAuditLog(toApiParams(applied))
      setLogs(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('auditLog.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [applied, t])

  useEffect(() => {
    load()
  }, [load])

  function apply() {
    setApplied({ ...filters })
  }

  function reset() {
    setFilters(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const params: { action?: string; from_date?: string; to_date?: string } = {}
      const api = toApiParams(applied)
      if (api.action) params.action = api.action
      if (api.from_date) params.from_date = api.from_date
      if (api.to_date) params.to_date = api.to_date
      const blob = await exportAuditLogCsv(params)
      downloadBlob(blob, `audit_log_${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      const status = getStatus(err)
      if (status === 403) {
        setError(t('auditLog.exportForbidden'))
      } else {
        setError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        key: 'time',
        header: t('auditLog.columns.time'),
        render: (l) => (
          <span className="text-xs text-ink-300 whitespace-nowrap">
            {formatDateTime(l.created_at)}
          </span>
        ),
      },
      {
        key: 'user',
        header: t('auditLog.columns.user'),
        render: (l) => (
          <span className="text-xs text-ink-200">
            {l.user_id !== null ? `#${l.user_id}` : t('auditLog.system')}
          </span>
        ),
      },
      {
        key: 'action',
        header: t('auditLog.columns.action'),
        render: (l) => <Badge tone={actionTone(l.action)}>{l.action}</Badge>,
      },
      {
        key: 'resource',
        header: t('auditLog.columns.resource'),
        render: (l) => <span className="text-xs text-ink-200">{l.resource || '—'}</span>,
      },
      {
        key: 'detail',
        header: t('auditLog.columns.detail'),
        render: (l) => (
          <p className="text-xs text-ink-300 line-clamp-2" title={l.detail}>
            {l.detail || '—'}
          </p>
        ),
      },
      {
        key: 'ip',
        header: t('auditLog.columns.ip'),
        render: (l) => (
          <span className="text-xs text-ink-300">{l.ip_address ?? '—'}</span>
        ),
      },
    ],
    [t]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('auditLog.title')}
        description={t('auditLog.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              {t('common.refresh')}
            </Button>
            <Button onClick={handleExport} loading={exporting}>
              {t('common.exportCsv')}
            </Button>
          </div>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}

      <GlassCard padded={false} className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label={t('auditLog.filters.action')}
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder={t('auditLog.filters.actionPlaceholder')}
          />
          <Input
            label={t('auditLog.filters.user')}
            type="number"
            value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
          />
          <Input
            label={t('auditLog.filters.from')}
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
          />
          <Input
            label={t('auditLog.filters.to')}
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={apply}>
            {t('common.filter')}
          </Button>
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<AuditLog>
          columns={columns}
          rows={logs}
          rowKey={(l) => l.id}
          loading={loading}
          emptyTitle={t('auditLog.empty')}
          emptyDescription={t('auditLog.emptyHint')}
        />
      </GlassPanel>
    </div>
  )
}
