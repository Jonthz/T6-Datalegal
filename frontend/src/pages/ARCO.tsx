import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  Input,
  KPICard,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createARCORequest,
  getARCODashboard,
  getARCOSLAStatus,
  listARCORequests,
  updateARCORequest,
} from '../api/arco'
import type { ARCODashboard, ARCORequest, ARCOSLAStatus } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDate, formatDateTime, formatNumber } from '../lib/format'
import { cn } from '../lib/cn'

const ARCO_TYPES = ['ACCESS', 'RECTIFICATION', 'CANCELLATION', 'OPPOSITION'] as const
const ARCO_STATUSES = [
  'RECEIVED',
  'VERIFYING',
  'IN_PROGRESS',
  'RESPONDED',
  'CLOSED',
  'REJECTED',
] as const

interface CreateForm {
  request_type: string
  requester_name: string
  requester_email: string
  requester_id_number: string
  description: string
}

const EMPTY_CREATE: CreateForm = {
  request_type: 'ACCESS',
  requester_name: '',
  requester_email: '',
  requester_id_number: '',
  description: '',
}

interface EditForm {
  status: string
  response_text: string
  rejection_reason: string
}

function SLABadge({ status }: { status: ARCOSLAStatus | null }) {
  const { t } = useTranslation()
  if (!status) return null
  const tone =
    status.stoplight === 'GREEN'
      ? 'success'
      : status.stoplight === 'YELLOW'
        ? 'warning'
        : status.stoplight === 'RED'
          ? 'danger'
          : 'neutral'
  let label: string
  if (status.stoplight === 'GREY') {
    label = status.on_time
      ? t('arco.sla.onTime')
      : status.on_time === false
        ? t('arco.sla.late')
        : t('arco.sla.closed')
  } else if (status.stoplight === 'RED') {
    const overdue = status.days_remaining !== null ? Math.abs(status.days_remaining) : 0
    label = t('arco.sla.overdue', { days: overdue })
  } else {
    label = t('arco.sla.daysRemaining', { days: status.days_remaining ?? 0 })
  }
  return <Badge tone={tone}>{label}</Badge>
}

function SLALight({ stoplight }: { stoplight: ARCOSLAStatus['stoplight'] }) {
  const colors = {
    GREEN: 'bg-emerald-400',
    YELLOW: 'bg-amber-400',
    RED: 'bg-rose-400',
    GREY: 'bg-ink-300',
  } as const
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        colors[stoplight] ?? colors.GREY
      )}
    />
  )
}

export default function ARCOPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<ARCORequest[]>([])
  const [dashboard, setDashboard] = useState<ARCODashboard | null>(null)
  const [slaByRequest, setSlaByRequest] = useState<Record<number, ARCOSLAStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [createError, setCreateError] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [detail, setDetail] = useState<ARCORequest | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    status: '',
    response_text: '',
    rejection_reason: '',
  })
  const [detailError, setDetailError] = useState('')
  const [detailSubmitting, setDetailSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: { request_type?: string; status?: string } = {}
      if (typeFilter) params.request_type = typeFilter
      if (statusFilter) params.status = statusFilter
      const [list, dash] = await Promise.all([
        listARCORequests(params),
        getARCODashboard().catch(() => null),
      ])
      setItems(list)
      setDashboard(dash)
      const slaResults = await Promise.all(
        list.map((r) =>
          getARCOSLAStatus(r.id)
            .then((s) => [r.id, s] as const)
            .catch(() => null)
        )
      )
      const next: Record<number, ARCOSLAStatus> = {}
      slaResults.forEach((res) => {
        if (res) next[res[0]] = res[1]
      })
      setSlaByRequest(next)
    } catch (err) {
      setError(extractErrorMessage(err, t('arco.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setCreateForm(EMPTY_CREATE)
    setCreateError('')
    setCreating(true)
  }

  function openDetail(request: ARCORequest) {
    setDetail(request)
    setEditForm({
      status: request.status,
      response_text: request.response_text ?? '',
      rejection_reason: request.rejection_reason ?? '',
    })
    setDetailError('')
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreateSubmitting(true)
    try {
      await createARCORequest(createForm)
      setSuccess(t('arco.createSuccess'))
      setCreating(false)
      await load()
    } catch (err) {
      setCreateError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!detail) return
    setDetailError('')
    setDetailSubmitting(true)
    try {
      await updateARCORequest(detail.id, {
        status: editForm.status,
        response_text: editForm.response_text,
        rejection_reason: editForm.rejection_reason,
      })
      setSuccess(t('arco.updateSuccess'))
      setDetail(null)
      await load()
    } catch (err) {
      setDetailError(extractErrorMessage(err, t('common.error')))
    } finally {
      setDetailSubmitting(false)
    }
  }

  const typeOptions = [
    { value: '', label: t('arco.filters.all') },
    ...ARCO_TYPES.map((tp) => ({ value: tp, label: t(`arco.types.${tp}`) })),
  ]

  const statusOptions = [
    { value: '', label: t('arco.filters.all') },
    ...ARCO_STATUSES.map((st) => ({ value: st, label: t(`arco.statuses.${st}`) })),
  ]

  const detailSla = detail ? slaByRequest[detail.id] ?? null : null

  const columns = useMemo<DataTableColumn<ARCORequest>[]>(
    () => [
      {
        key: 'ticket',
        header: t('arco.fields.ticket'),
        render: (r) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{r.ticket_number}</p>
            <p className="text-xs text-ink-400">{formatDate(r.received_date)}</p>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('arco.fields.type'),
        render: (r) => <Badge tone="brand">{t(`arco.types.${r.request_type}`, r.request_type)}</Badge>,
      },
      {
        key: 'requester',
        header: t('arco.fields.requester'),
        render: (r) => (
          <div className="min-w-0">
            <p className="text-sm text-ink-100 truncate">{r.requester_name}</p>
            <p className="text-xs text-ink-400 truncate">{r.requester_email}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('arco.fields.status'),
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: 'sla',
        header: t('arco.sla.label'),
        render: (r) => {
          const sla = slaByRequest[r.id]
          if (!sla)
            return (
              <span className="text-xs text-ink-400">—</span>
            )
          return (
            <div className="flex items-center gap-2">
              <SLALight stoplight={sla.stoplight} />
              <SLABadge status={sla} />
            </div>
          )
        },
      },
      {
        key: 'deadline',
        header: t('arco.fields.deadline'),
        render: (r) => (
          <span className="text-xs text-ink-200">{formatDate(r.deadline_date)}</span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (r) => (
          <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>
            {t('common.viewDetails')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, slaByRequest]
  )

  const listPanel = (
    <div className="space-y-4">
      <GlassCard>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label={t('arco.filters.type')}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={typeOptions}
          />
          <Select
            label={t('arco.filters.status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
          />
          <div className="sm:flex sm:items-end sm:justify-end">
            <Button onClick={openCreate}>{t('arco.create')}</Button>
          </div>
        </div>
      </GlassCard>
      <GlassPanel>
        <DataTable<ARCORequest>
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          emptyTitle={t('arco.empty')}
          emptyDescription={t('arco.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('arco.create')}</Button>}
          onRowClick={openDetail}
        />
      </GlassPanel>
    </div>
  )

  const dashboardPanel = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          loading={loading}
          label={t('arco.dashboard.total')}
          value={dashboard ? formatNumber(dashboard.total) : '—'}
          hint={t('arco.dashboard.totalHint')}
        />
        <KPICard
          loading={loading}
          label={t('arco.dashboard.overdue')}
          value={dashboard ? formatNumber(dashboard.overdue_count) : '—'}
          hint={t('arco.dashboard.overdueHint')}
        />
        <KPICard
          loading={loading}
          label={t('arco.types.ACCESS')}
          value={
            dashboard
              ? formatNumber(dashboard.by_type?.ACCESS ?? 0)
              : '—'
          }
        />
        <KPICard
          loading={loading}
          label={t('arco.types.RECTIFICATION')}
          value={
            dashboard
              ? formatNumber(dashboard.by_type?.RECTIFICATION ?? 0)
              : '—'
          }
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownCard
          title={t('arco.dashboard.byType')}
          entries={Object.entries(dashboard?.by_type ?? {})}
          emptyLabel={t('arco.dashboard.empty')}
          translateKey="arco.types"
        />
        <BreakdownCard
          title={t('arco.dashboard.byStatus')}
          entries={Object.entries(dashboard?.by_status ?? {})}
          emptyLabel={t('arco.dashboard.empty')}
          translateKey="arco.statuses"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('arco.title')}
        description={t('arco.description')}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => load()}>
              {t('common.refresh')}
            </Button>
            <Button onClick={openCreate}>{t('arco.create')}</Button>
          </>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <Tabs
        tabs={[
          { id: 'list', label: t('arco.tabs.list'), content: listPanel },
          { id: 'dashboard', label: t('arco.tabs.dashboard'), content: dashboardPanel },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('arco.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={createSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <Select
            label={t('arco.fields.type')}
            required
            value={createForm.request_type}
            onChange={(e) =>
              setCreateForm({ ...createForm, request_type: e.target.value })
            }
            options={ARCO_TYPES.map((tp) => ({
              value: tp,
              label: t(`arco.types.${tp}`),
            }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('arco.fields.requester')}
              required
              value={createForm.requester_name}
              onChange={(e) =>
                setCreateForm({ ...createForm, requester_name: e.target.value })
              }
            />
            <Input
              label={t('arco.fields.email')}
              type="email"
              required
              value={createForm.requester_email}
              onChange={(e) =>
                setCreateForm({ ...createForm, requester_email: e.target.value })
              }
            />
          </div>
          <Input
            label={t('arco.fields.idNumber')}
            required
            value={createForm.requester_id_number}
            onChange={(e) =>
              setCreateForm({ ...createForm, requester_id_number: e.target.value })
            }
          />
          <Textarea
            label={t('arco.fields.description')}
            value={createForm.description}
            onChange={(e) =>
              setCreateForm({ ...createForm, description: e.target.value })
            }
            rows={4}
          />
          {createError && <AlertBox tone="danger">{createError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? t('arco.detail.title', { ticket: detail.ticket_number }) : ''}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdate} loading={detailSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {detail && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{t(`arco.types.${detail.request_type}`, detail.request_type)}</Badge>
              <StatusBadge status={detail.status} />
              {detailSla && (
                <span className="flex items-center gap-2">
                  <SLALight stoplight={detailSla.stoplight} />
                  <SLABadge status={detailSla} />
                </span>
              )}
            </div>

            <GlassCard>
              <h4 className="text-xs uppercase text-ink-400 mb-2">
                {t('arco.detail.sectionRequester')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <Field label={t('arco.fields.requester')} value={detail.requester_name} />
                <Field label={t('arco.fields.email')} value={detail.requester_email} />
                <Field label={t('arco.fields.idNumber')} value={detail.requester_id_number} />
                <Field label={t('arco.fields.received')} value={formatDate(detail.received_date)} />
              </div>
            </GlassCard>

            <GlassCard>
              <h4 className="text-xs uppercase text-ink-400 mb-2">
                {t('arco.detail.sectionRequest')}
              </h4>
              <p className="text-sm text-ink-100 whitespace-pre-wrap mb-3">
                {detail.description || '—'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <Field label={t('arco.fields.deadline')} value={formatDate(detail.deadline_date)} />
                <Field
                  label="Responded"
                  value={detail.responded_at ? formatDateTime(detail.responded_at) : '—'}
                />
              </div>
            </GlassCard>

            <GlassCard>
              <h4 className="text-xs uppercase text-ink-400 mb-2">
                {t('arco.detail.sectionResolution')}
              </h4>
              <div className="space-y-3">
                <Select
                  label={t('arco.fields.status')}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  options={ARCO_STATUSES.map((st) => ({
                    value: st,
                    label: t(`arco.statuses.${st}`),
                  }))}
                />
                <Textarea
                  label={t('arco.fields.responseText')}
                  value={editForm.response_text}
                  onChange={(e) =>
                    setEditForm({ ...editForm, response_text: e.target.value })
                  }
                  rows={4}
                />
                <Textarea
                  label={t('arco.fields.rejectionReason')}
                  value={editForm.rejection_reason}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rejection_reason: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </GlassCard>

            {detailError && <AlertBox tone="danger">{detailError}</AlertBox>}
          </form>
        )}
      </Modal>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-ink-400">{label}</p>
      <p className="text-sm text-ink-100 break-words">{value}</p>
    </div>
  )
}

function BreakdownCard({
  title,
  entries,
  emptyLabel,
  translateKey,
}: {
  title: string
  entries: [string, number][]
  emptyLabel: string
  translateKey: string
}) {
  const { t } = useTranslation()
  const total = entries.reduce((s, [, v]) => s + v, 0)
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-ink-50 mb-3">{title}</h3>
      {entries.length === 0 || total === 0 ? (
        <p className="text-xs text-ink-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([key, value]) => {
            const pct = total > 0 ? (value / total) * 100 : 0
            return (
              <li key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge tone="info">
                    {t(`${translateKey}.${key}`, key)}
                  </Badge>
                  <span className="text-ink-200 font-medium">
                    {value} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
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
