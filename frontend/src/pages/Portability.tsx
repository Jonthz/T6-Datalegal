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
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  completePortabilityRequest,
  createPortabilityRequest,
  exportPortability,
  listPortabilityRequests,
} from '../api/portability'
import type { PortabilityRequest } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { downloadBlob, formatDate, formatDateTime } from '../lib/format'

const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const

interface CreateForm {
  subject_name: string
  subject_email: string
  notes: string
}

const EMPTY_CREATE: CreateForm = {
  subject_name: '',
  subject_email: '',
  notes: '',
}

interface CompleteForm {
  status: string
  notes: string
  response_data: string
}

function sanitizeSubject(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'subject'
}

export default function PortabilityPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<PortabilityRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [createError, setCreateError] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [completing, setCompleting] = useState<PortabilityRequest | null>(null)
  const [completeForm, setCompleteForm] = useState<CompleteForm>({
    status: 'COMPLETED',
    notes: '',
    response_data: '{}',
  })
  const [completeError, setCompleteError] = useState('')
  const [completeSubmitting, setCompleteSubmitting] = useState(false)

  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listPortabilityRequests({
        status: statusFilter || undefined,
        limit: 200,
      })
      setItems(list)
    } catch (err) {
      setError(extractErrorMessage(err, t('portability.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setCreateForm(EMPTY_CREATE)
    setCreateError('')
    setCreating(true)
  }

  function openComplete(request: PortabilityRequest) {
    setCompleting(request)
    setCompleteForm({
      status: request.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED',
      notes: request.notes ?? '',
      response_data: '{}',
    })
    setCompleteError('')
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreateSubmitting(true)
    try {
      await createPortabilityRequest(createForm)
      setSuccess(t('portability.createSuccess'))
      setCreating(false)
      await load()
    } catch (err) {
      setCreateError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleComplete(e: FormEvent) {
    e.preventDefault()
    if (!completing) return
    setCompleteError('')
    let parsed: Record<string, unknown> | undefined
    if (completeForm.response_data.trim()) {
      try {
        parsed = JSON.parse(completeForm.response_data) as Record<string, unknown>
      } catch {
        setCompleteError(t('portability.invalidJson'))
        return
      }
    }
    setCompleteSubmitting(true)
    try {
      await completePortabilityRequest(completing.id, {
        status: completeForm.status,
        notes: completeForm.notes,
        response_data: parsed,
      })
      setSuccess(t('portability.completeSuccess'))
      setCompleting(null)
      await load()
    } catch (err) {
      setCompleteError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCompleteSubmitting(false)
    }
  }

  async function handleExport(request: PortabilityRequest) {
    setBusyId(request.id)
    setError('')
    try {
      const payload = await exportPortability(request.id)
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      downloadBlob(
        blob,
        t('portability.exportFilename', {
          id: request.id,
          subject: sanitizeSubject(request.subject_name),
        })
      )
      setSuccess(t('portability.exportSuccess'))
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo<DataTableColumn<PortabilityRequest>[]>(
    () => [
      {
        key: 'subject',
        header: t('portability.fields.subjectName'),
        render: (r) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{r.subject_name}</p>
            <p className="text-xs text-ink-400 truncate">{r.subject_email}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('portability.fields.status'),
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: 'requested',
        header: t('portability.fields.requestDate'),
        render: (r) => (
          <span className="text-xs text-ink-200">{formatDate(r.request_date)}</span>
        ),
      },
      {
        key: 'completed',
        header: t('portability.fields.completedAt'),
        render: (r) =>
          r.completed_at ? (
            <span className="text-xs text-ink-200">{formatDateTime(r.completed_at)}</span>
          ) : (
            <Badge tone="warning">Pending</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (r) => (
          <div className="flex justify-end gap-1 flex-wrap">
            {r.status !== 'COMPLETED' && r.status !== 'REJECTED' && (
              <Button size="sm" variant="secondary" onClick={() => openComplete(r)}>
                {t('portability.complete')}
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleExport(r)}
              loading={busyId === r.id}
            >
              {t('portability.exportLabel')}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyId]
  )

  const statusOptions = [
    { value: '', label: t('portability.filters.all') },
    ...STATUSES.map((s) => ({ value: s, label: t(`portability.statuses.${s}`) })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('portability.title')}
        description={t('portability.description')}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => load()}>
              {t('common.refresh')}
            </Button>
            <Button onClick={openCreate}>{t('portability.create')}</Button>
          </>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard>
        <Select
          label={t('portability.filters.status')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={statusOptions}
          className="sm:w-56"
        />
      </GlassCard>

      <GlassPanel>
        <DataTable<PortabilityRequest>
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          emptyTitle={t('portability.empty')}
          emptyDescription={t('portability.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('portability.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('portability.create')}
        size="md"
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
          <Input
            label={t('portability.fields.subjectName')}
            required
            value={createForm.subject_name}
            onChange={(e) =>
              setCreateForm({ ...createForm, subject_name: e.target.value })
            }
          />
          <Input
            label={t('portability.fields.subjectEmail')}
            type="email"
            required
            value={createForm.subject_email}
            onChange={(e) =>
              setCreateForm({ ...createForm, subject_email: e.target.value })
            }
          />
          <Textarea
            label={t('portability.fields.notes')}
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            rows={3}
          />
          {createError && <AlertBox tone="danger">{createError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!completing}
        onClose={() => setCompleting(null)}
        title={t('portability.complete')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCompleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleComplete} loading={completeSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {completing && (
          <form onSubmit={handleComplete} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="brand">{completing.subject_name}</Badge>
              <Badge tone="neutral">{completing.subject_email}</Badge>
            </div>
            <Select
              label={t('portability.fields.status')}
              value={completeForm.status}
              onChange={(e) =>
                setCompleteForm({ ...completeForm, status: e.target.value })
              }
              options={STATUSES.map((s) => ({
                value: s,
                label: t(`portability.statuses.${s}`),
              }))}
            />
            <Textarea
              label={t('portability.fields.notes')}
              value={completeForm.notes}
              onChange={(e) =>
                setCompleteForm({ ...completeForm, notes: e.target.value })
              }
              rows={2}
            />
            <Textarea
              label={t('portability.fields.responseData')}
              value={completeForm.response_data}
              onChange={(e) =>
                setCompleteForm({ ...completeForm, response_data: e.target.value })
              }
              hint={t('portability.responseHint')}
              rows={8}
              className="font-mono text-xs"
            />
            {completeError && <AlertBox tone="danger">{completeError}</AlertBox>}
          </form>
        )}
      </Modal>
    </div>
  )
}
