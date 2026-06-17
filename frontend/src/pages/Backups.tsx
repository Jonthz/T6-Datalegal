import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  KPICard,
  PageHeader,
  StatusBadge,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { createBackup, listBackups, verifyBackup } from '../api/backups'
import type { BackupRecord, BackupVerifyResult } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { formatDateTime } from '../lib/format'

const RPO_HOURS = 24
const RTO_HOURS = 4

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function rpoTone(hours: number): 'success' | 'warning' | 'danger' {
  if (hours <= RPO_HOURS) return 'success'
  if (hours <= RPO_HOURS * 2) return 'warning'
  return 'danger'
}

function bytesHuman(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function BackupsPage() {
  const { t } = useTranslation()
  const { auth } = useAuth()
  const isSuperAdmin = auth.role === 'SUPER_ADMIN'

  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [verifyResult, setVerifyResult] = useState<BackupVerifyResult | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listBackups({ limit: 100 })
      setBackups(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('backups.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const created = await createBackup()
      if (created.status === 'PENDING') {
        setSuccess(t('backups.createPending'))
      } else {
        setSuccess(t('backups.createSuccess'))
      }
      await load()
    } catch (err) {
      const status = getStatus(err)
      if (status === 403) {
        setError(t('backups.forbidden'))
      } else {
        setError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleVerify(backup: BackupRecord) {
    setVerifyingId(backup.id)
    setError('')
    setVerifyResult(null)
    try {
      const result = await verifyBackup(backup.id)
      setVerifyResult(result)
      if (result.is_valid) {
        setSuccess(t('backups.verifySuccess'))
      } else {
        setError(t('backups.verifyMismatch'))
      }
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setVerifyingId(null)
    }
  }

  const stats = useMemo(() => {
    if (backups.length === 0) {
      return { latest: null as BackupRecord | null, total: 0, verified: 0 }
    }
    const sorted = [...backups].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const verified = backups.filter((b) => b.status === 'VERIFIED' || b.status === 'COMPLETED').length
    return { latest: sorted[0], total: backups.length, verified }
  }, [backups])

  const latestHours = stats.latest ? hoursSince(stats.latest.created_at) : Infinity
  const rpoLabel =
    stats.latest === null
      ? t('backups.kpis.rpoNever')
      : `${latestHours.toFixed(1)} h`

  const columns = useMemo<DataTableColumn<BackupRecord>[]>(
    () => [
      {
        key: 'filename',
        header: t('backups.columns.filename'),
        render: (b) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate" title={b.filename}>
              {b.filename}
            </p>
            <p className="text-xs text-ink-400 truncate" title={b.checksum_sha256}>
              {b.checksum_sha256.slice(0, 16)}…
            </p>
          </div>
        ),
      },
      {
        key: 'size',
        header: t('backups.columns.size'),
        render: (b) => <span className="text-xs text-ink-300">{bytesHuman(b.size_bytes)}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (b) => <StatusBadge status={b.status} />,
      },
      {
        key: 'created',
        header: t('backups.columns.created'),
        render: (b) => (
          <span className="text-xs text-ink-300">{formatDateTime(b.created_at)}</span>
        ),
      },
      {
        key: 'verified',
        header: t('backups.columns.verified'),
        render: (b) => (
          <span className="text-xs text-ink-300">
            {b.verified_at ? formatDateTime(b.verified_at) : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (b) => (
          <Button
            size="sm"
            variant="ghost"
            loading={verifyingId === b.id}
            onClick={() => handleVerify(b)}
          >
            {t('backups.verify')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, verifyingId]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('backups.title')}
        description={t('backups.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              {t('common.refresh')}
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!isSuperAdmin}>
              {t('backups.create')}
            </Button>
          </div>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      {!isSuperAdmin && (
        <AlertBox tone="warning" title={t('backups.gate.title')}>
          {t('backups.gate.body')}
        </AlertBox>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label={t('backups.kpis.total')}
          value={stats.total}
          hint={t('backups.kpis.totalHint')}
          loading={loading}
        />
        <KPICard
          label={t('backups.kpis.verified')}
          value={stats.verified}
          hint={t('backups.kpis.verifiedHint')}
          loading={loading}
        />
        <KPICard
          label={t('backups.kpis.rpo')}
          value={rpoLabel}
          hint={t('backups.kpis.rpoHint', { rpo: RPO_HOURS })}
          loading={loading}
        />
        <KPICard
          label={t('backups.kpis.rto')}
          value={`${RTO_HOURS}h`}
          hint={t('backups.kpis.rtoHint')}
          loading={loading}
        />
      </div>

      <GlassCard>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-50">{t('backups.posture.title')}</h3>
            <p className="text-xs text-ink-300 mt-1">{t('backups.posture.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={rpoTone(latestHours)}>
              {t('backups.posture.rpoBadge', {
                ok: latestHours <= RPO_HOURS ? t('backups.posture.green') : t('backups.posture.red'),
              })}
            </Badge>
            <Badge tone={stats.verified > 0 ? 'success' : 'warning'}>
              {stats.verified > 0
                ? t('backups.posture.checksumOk')
                : t('backups.posture.checksumWarn')}
            </Badge>
          </div>
        </header>
      </GlassCard>

      {verifyResult && (
        <AlertBox
          tone={verifyResult.is_valid ? 'success' : 'danger'}
          title={
            verifyResult.is_valid
              ? t('backups.verifyResult.ok')
              : t('backups.verifyResult.fail')
          }
        >
          <p className="text-xs text-current/90">
            {t('backups.verifyResult.expected')}: {verifyResult.expected_checksum}
          </p>
          <p className="text-xs text-current/90">
            {t('backups.verifyResult.actual')}: {verifyResult.actual_checksum}
          </p>
          <p className="text-xs text-current/90">
            {t('backups.verifyResult.verifiedAt')}: {formatDateTime(verifyResult.verified_at)}
          </p>
        </AlertBox>
      )}

      <GlassPanel>
        <DataTable<BackupRecord>
          columns={columns}
          rows={backups}
          rowKey={(b) => b.id}
          loading={loading}
          emptyTitle={t('backups.empty')}
          emptyDescription={t('backups.emptyHint')}
          emptyAction={
            isSuperAdmin ? (
              <Button onClick={handleCreate} loading={creating}>
                {t('backups.create')}
              </Button>
            ) : undefined
          }
        />
      </GlassPanel>
    </div>
  )
}
