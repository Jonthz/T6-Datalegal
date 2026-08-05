import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ListPlus, Pencil, RefreshCw } from 'lucide-react'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createRemediation,
  listRemediations,
  updateRemediation,
} from '../api/remediations'
import { listRiskAssessments } from '../api/riskAssessments'
import type { Remediation, RiskAssessment } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

interface RemediationForm {
  risk_assessment_id: string
  title: string
  description: string
  due_date: string
}

const EMPTY_FORM: RemediationForm = {
  risk_assessment_id: '',
  title: '',
  description: '',
  due_date: '',
}

interface EditForm {
  title: string
  description: string
  status: string
  due_date: string
  completed_date: string
  risk_score_after: string
  risk_level_after: string
}

const RISK_LEVELS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

function isOverdue(r: Remediation) {
  if (!r.due_date) return false
  if (r.status === 'COMPLETED' || r.status === 'CANCELLED') return false
  return new Date(r.due_date) < new Date()
}

export default function RemediationsPage() {
  const { t } = useTranslation()

  const [items, setItems] = useState<Remediation[]>([])
  const [risks, setRisks] = useState<RiskAssessment[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<RemediationForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editing, setEditing] = useState<Remediation | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    title: '',
    description: '',
    status: 'OPEN',
    due_date: '',
    completed_date: '',
    risk_score_after: '',
    risk_level_after: '',
  })
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: {
        remediation_status?: string
        risk_assessment_id?: number
        limit: number
      } = { limit: 200 }
      if (statusFilter) params.remediation_status = statusFilter
      if (riskFilter) params.risk_assessment_id = Number(riskFilter)
      const data = await listRemediations(params)
      setItems(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('remediations.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, riskFilter, t])

  const loadRisks = useCallback(async () => {
    try {
      const data = await listRiskAssessments()
      setRisks(data)
    } catch {
      // optional
    }
  }, [])

  useEffect(() => {
    loadRisks()
  }, [loadRisks])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setCreateOpen(true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim() || !form.risk_assessment_id) {
      setFormError(t('remediations.validation'))
      return
    }
    setSubmitting(true)
    try {
      await createRemediation({
        risk_assessment_id: Number(form.risk_assessment_id),
        title: form.title.trim(),
        description: form.description,
        due_date: form.due_date || null,
      })
      setSuccess(t('remediations.createSuccess'))
      setCreateOpen(false)
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(r: Remediation) {
    setEditing(r)
    setEditForm({
      title: r.title,
      description: r.description,
      status: r.status,
      due_date: r.due_date ?? '',
      completed_date: r.completed_date ?? '',
      risk_score_after: r.risk_score_after?.toString() ?? '',
      risk_level_after: r.risk_level_after ?? '',
    })
    setEditError('')
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setEditError('')
    setEditSubmitting(true)
    try {
      const scoreNum = editForm.risk_score_after.trim()
        ? Number(editForm.risk_score_after)
        : null
      await updateRemediation(editing.id, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        due_date: editForm.due_date || null,
        completed_date: editForm.completed_date || null,
        risk_score_after: scoreNum ?? undefined,
        risk_level_after: editForm.risk_level_after || undefined,
      })
      setSuccess(t('remediations.updateSuccess'))
      setEditing(null)
      await load()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  const riskOptions = useMemo(
    () =>
      risks.map((r) => ({
        value: r.id.toString(),
        label: `#${r.id} · ${r.risk_level} · score ${r.risk_score}`,
      })),
    [risks]
  )

  const columns = useMemo<DataTableColumn<Remediation>[]>(
    () => [
      {
        key: 'title',
        header: t('remediations.columns.title'),
        render: (r) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{r.title}</p>
            <p className="text-xs text-ink-300">
              {t('remediations.linkedRisk')} #{r.risk_assessment_id}
            </p>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: 'before',
        header: t('remediations.columns.before'),
        render: (r) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <Badge tone="warning">{r.risk_level_before ?? '—'}</Badge>
            <span className="text-ink-400">
              {t('remediations.columns.score')}: {r.risk_score_before ?? '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'after',
        header: t('remediations.columns.after'),
        render: (r) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <Badge tone={r.risk_level_after ? 'success' : 'neutral'}>
              {r.risk_level_after ?? '—'}
            </Badge>
            <span className="text-ink-400">
              {t('remediations.columns.score')}: {r.risk_score_after ?? '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'due',
        header: t('remediations.columns.due'),
        render: (r) => (
          <div className="flex items-center gap-2 text-xs text-ink-300">
            <span>{r.due_date ? formatDate(r.due_date) : '—'}</span>
            {isOverdue(r) && <Badge tone="danger">{t('remediations.overdue')}</Badge>}
          </div>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (r) => (
          <IconButton
            label={t('common.edit')}
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openEdit(r)}
          />
        ),
      },
    ],
    [t]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('remediations.title')}
        description={t('remediations.description')}
        actions={
          <IconButton
            label={t('remediations.create')}
            icon={<ListPlus className="h-5 w-5" />}
            variant="primary"
            size="md"
            onClick={openCreate}
          />
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard padded={false} className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow min-w-[12rem]">
            <Select
              label={t('remediations.filter')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: t('common.all') },
                ...STATUSES.map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>
          <div className="grow min-w-[14rem]">
            <Select
              label={t('remediations.filterRisk')}
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              options={[{ value: '', label: t('common.all') }, ...riskOptions]}
            />
          </div>
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={load}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<Remediation>
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          emptyTitle={t('remediations.empty')}
          emptyDescription={t('remediations.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('remediations.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('remediations.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} loading={submitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Select
            label={t('remediations.fields.risk')}
            value={form.risk_assessment_id}
            onChange={(e) => setForm({ ...form, risk_assessment_id: e.target.value })}
            options={riskOptions}
            placeholder={t('remediations.fields.riskPlaceholder')}
            required
          />
          <Input
            label={t('remediations.fields.title')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label={t('remediations.fields.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <Input
            label={t('remediations.fields.due')}
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t('remediations.edit')}
        description={editing?.title}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitEdit} loading={editSubmitting}>
              {t('common.saveChanges')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitEdit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('remediations.fields.title')}
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
            <Select
              label={t('common.status')}
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <Textarea
            label={t('remediations.fields.description')}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('remediations.fields.due')}
              type="date"
              value={editForm.due_date}
              onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
            />
            <Input
              label={t('remediations.fields.completed')}
              type="date"
              value={editForm.completed_date}
              onChange={(e) => setEditForm({ ...editForm, completed_date: e.target.value })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('remediations.fields.scoreAfter')}
              type="number"
              min={1}
              max={25}
              value={editForm.risk_score_after}
              onChange={(e) =>
                setEditForm({ ...editForm, risk_score_after: e.target.value })
              }
            />
            <Select
              label={t('remediations.fields.levelAfter')}
              value={editForm.risk_level_after}
              onChange={(e) =>
                setEditForm({ ...editForm, risk_level_after: e.target.value })
              }
              options={RISK_LEVELS.map((l) => ({
                value: l,
                label: l || t('remediations.fields.levelUnchanged'),
              }))}
            />
          </div>
          {editError && <AlertBox tone="danger">{editError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
