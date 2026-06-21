import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
  Tabs,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  autoGenerateActionPlans,
  createActionPlan,
  createActionPlanTemplate,
  listActionPlanTemplates,
  listActionPlans,
  updateActionPlan,
} from '../api/actionPlans'
import { listRiskAssessments } from '../api/riskAssessments'
import type {
  ActionPlan,
  ActionPlanTask,
  ActionPlanTemplate,
  RiskAssessment,
} from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'

const STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const
const LEVELS = ['ANY', 'HIGH', 'MEDIUM', 'LOW'] as const

interface PlanForm {
  title: string
  description: string
  target_date: string
  risk_assessment_id: string
  template_id: string
  tasks: ActionPlanTask[]
}

const EMPTY_PLAN_FORM: PlanForm = {
  title: '',
  description: '',
  target_date: '',
  risk_assessment_id: '',
  template_id: '',
  tasks: [],
}

interface EditForm {
  title: string
  description: string
  status: string
  target_date: string
  tasks: ActionPlanTask[]
}

interface TemplateForm {
  name: string
  description: string
  applies_to_level: string
  default_tasks: ActionPlanTask[]
}

const EMPTY_TEMPLATE_FORM: TemplateForm = {
  name: '',
  description: '',
  applies_to_level: 'ANY',
  default_tasks: [],
}

function isOverdue(plan: ActionPlan): boolean {
  if (!plan.target_date) return false
  if (plan.status === 'COMPLETED' || plan.status === 'CANCELLED') return false
  return new Date(plan.target_date) < new Date()
}

export default function ActionPlansPage() {
  const { t } = useTranslation()

  const [plans, setPlans] = useState<ActionPlan[]>([])
  const [templates, setTemplates] = useState<ActionPlanTemplate[]>([])
  const [risks, setRisks] = useState<RiskAssessment[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoGenerating, setAutoGenerating] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<PlanForm>(EMPTY_PLAN_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    title: '',
    description: '',
    status: 'DRAFT',
    target_date: '',
    tasks: [],
  })
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState<TemplateForm>(EMPTY_TEMPLATE_FORM)
  const [templateError, setTemplateError] = useState('')
  const [templateSubmitting, setTemplateSubmitting] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listActionPlans(statusFilter ? { plan_status: statusFilter } : undefined)
      setPlans(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('actionPlans.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const data = await listActionPlanTemplates()
      setTemplates(data)
    } catch {
      // non-blocking
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const loadRisks = useCallback(async () => {
    try {
      const data = await listRiskAssessments()
      setRisks(data)
    } catch {
      // non-blocking
    }
  }, [])

  useEffect(() => {
    loadTemplates()
    loadRisks()
  }, [loadTemplates, loadRisks])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  function openCreate() {
    setForm(EMPTY_PLAN_FORM)
    setFormError('')
    setCreateOpen(true)
  }

  function applyTemplate(templateId: string) {
    const tpl = templates.find((tp) => tp.id.toString() === templateId)
    setForm((prev) => ({
      ...prev,
      template_id: templateId,
      title: prev.title || tpl?.name || '',
      description: prev.description || tpl?.description || '',
      tasks: tpl?.default_tasks?.length ? [...tpl.default_tasks] : prev.tasks,
    }))
  }

  function setTask(index: number, patch: Partial<ActionPlanTask>) {
    setForm((prev) => {
      const tasks = prev.tasks.map((task, idx) => (idx === index ? { ...task, ...patch } : task))
      return { ...prev, tasks }
    })
  }

  function addTask() {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { title: '', description: '', status: 'PENDING' }],
    }))
  }

  function removeTask(index: number) {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, idx) => idx !== index),
    }))
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) {
      setFormError(t('actionPlans.validation'))
      return
    }
    setSubmitting(true)
    try {
      await createActionPlan({
        title: form.title.trim(),
        description: form.description,
        target_date: form.target_date || null,
        risk_assessment_id: form.risk_assessment_id ? Number(form.risk_assessment_id) : null,
        template_id: form.template_id ? Number(form.template_id) : null,
        tasks: form.tasks,
      })
      setSuccess(t('actionPlans.createSuccess'))
      setCreateOpen(false)
      await loadPlans()
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(plan: ActionPlan) {
    setEditingPlan(plan)
    setEditForm({
      title: plan.title,
      description: plan.description,
      status: plan.status,
      target_date: plan.target_date ?? '',
      tasks: plan.tasks ?? [],
    })
    setEditError('')
  }

  function setEditTask(index: number, patch: Partial<ActionPlanTask>) {
    setEditForm((prev) => {
      const tasks = prev.tasks.map((task, idx) => (idx === index ? { ...task, ...patch } : task))
      return { ...prev, tasks }
    })
  }

  function addEditTask() {
    setEditForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { title: '', description: '', status: 'PENDING' }],
    }))
  }

  function removeEditTask(index: number) {
    setEditForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, idx) => idx !== index),
    }))
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingPlan) return
    setEditError('')
    setEditSubmitting(true)
    try {
      await updateActionPlan(editingPlan.id, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        target_date: editForm.target_date || null,
        tasks: editForm.tasks,
      })
      setSuccess(t('actionPlans.updateSuccess'))
      setEditingPlan(null)
      await loadPlans()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleAutoGenerate() {
    setAutoGenerating(true)
    setError('')
    try {
      const created = await autoGenerateActionPlans()
      setSuccess(t('actionPlans.autoGenerateSuccess', { count: created.length }))
      await loadPlans()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setAutoGenerating(false)
    }
  }

  function openTemplate() {
    setTemplateForm(EMPTY_TEMPLATE_FORM)
    setTemplateError('')
    setTemplateOpen(true)
  }

  function setTemplateTask(index: number, patch: Partial<ActionPlanTask>) {
    setTemplateForm((prev) => {
      const tasks = prev.default_tasks.map((task, idx) =>
        idx === index ? { ...task, ...patch } : task
      )
      return { ...prev, default_tasks: tasks }
    })
  }

  function addTemplateTask() {
    setTemplateForm((prev) => ({
      ...prev,
      default_tasks: [...prev.default_tasks, { title: '', description: '', status: 'PENDING' }],
    }))
  }

  function removeTemplateTask(index: number) {
    setTemplateForm((prev) => ({
      ...prev,
      default_tasks: prev.default_tasks.filter((_, idx) => idx !== index),
    }))
  }

  async function submitTemplate(e: FormEvent) {
    e.preventDefault()
    setTemplateError('')
    if (!templateForm.name.trim()) {
      setTemplateError(t('actionPlans.templates.validation'))
      return
    }
    setTemplateSubmitting(true)
    try {
      await createActionPlanTemplate({
        name: templateForm.name.trim(),
        description: templateForm.description,
        applies_to_level: templateForm.applies_to_level,
        default_tasks: templateForm.default_tasks,
      })
      setSuccess(t('actionPlans.templates.createSuccess'))
      setTemplateOpen(false)
      await loadTemplates()
    } catch (err) {
      setTemplateError(extractErrorMessage(err, t('common.error')))
    } finally {
      setTemplateSubmitting(false)
    }
  }

  const templateOptions = useMemo(
    () => [
      { value: '', label: t('actionPlans.fields.templateNone') },
      ...templates.map((tp) => ({
        value: tp.id.toString(),
        label: `${tp.name} (${tp.applies_to_level})`,
      })),
    ],
    [templates, t]
  )

  const riskOptions = useMemo(
    () => [
      { value: '', label: t('actionPlans.fields.riskNone') },
      ...risks.map((r) => ({
        value: r.id.toString(),
        label: `#${r.id} · ${r.risk_level} · score ${r.risk_score}`,
      })),
    ],
    [risks, t]
  )

  const columns = useMemo<DataTableColumn<ActionPlan>[]>(
    () => [
      {
        key: 'title',
        header: t('actionPlans.columns.title'),
        render: (p) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-ink-50 truncate">{p.title}</p>
              {p.auto_generated && (
                <Badge tone="info">{t('actionPlans.autoGenerated')}</Badge>
              )}
            </div>
            {p.risk_assessment_id && (
              <p className="text-xs text-ink-300">
                {t('actionPlans.linkedRisk')} #{p.risk_assessment_id}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (p) => <StatusBadge status={p.status} />,
      },
      {
        key: 'tasks',
        header: t('actionPlans.columns.tasks'),
        render: (p) => (
          <span className="text-xs text-ink-300">
            {(p.tasks ?? []).length} {t('actionPlans.tasksUnit')}
          </span>
        ),
      },
      {
        key: 'target',
        header: t('actionPlans.columns.target'),
        render: (p) => (
          <div className="flex items-center gap-2 text-xs text-ink-300">
            <span>{p.target_date ? formatDate(p.target_date) : '—'}</span>
            {isOverdue(p) && <Badge tone="danger">{t('actionPlans.overdue')}</Badge>}
          </div>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (p) => (
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
            {t('common.edit')}
          </Button>
        ),
      },
    ],
    [t]
  )

  const plansTab = (
    <div className="space-y-4">
      <GlassCard padded={false} className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow min-w-[12rem]">
            <Select
              label={t('actionPlans.filter')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: t('common.all') },
                ...STATUSES.map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={autoGenerating}
              onClick={handleAutoGenerate}
            >
              {t('actionPlans.autoGenerate')}
            </Button>
            <Button onClick={openCreate}>{t('actionPlans.create')}</Button>
          </div>
        </div>
      </GlassCard>
      <GlassPanel>
        <DataTable<ActionPlan>
          columns={columns}
          rows={plans}
          rowKey={(p) => p.id}
          loading={loading}
          emptyTitle={t('actionPlans.empty')}
          emptyDescription={t('actionPlans.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('actionPlans.create')}</Button>}
        />
      </GlassPanel>
    </div>
  )

  const templatesTab = (
    <div className="space-y-4">
      <GlassCard padded={false} className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink-300">{t('actionPlans.templates.description')}</div>
        <Button onClick={openTemplate}>{t('actionPlans.templates.create')}</Button>
      </GlassCard>
      <GlassPanel>
        <div className="p-4">
          {templatesLoading ? (
            <p className="text-sm text-ink-300">{t('common.loading')}</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-ink-300">{t('actionPlans.templates.empty')}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {templates.map((tp) => (
                <li key={tp.id} className="rounded-lg p-3 space-y-2 bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink-50">{tp.name}</p>
                    <Badge tone="brand">{tp.applies_to_level}</Badge>
                  </div>
                  <p className="text-xs text-ink-300 line-clamp-3">{tp.description || '—'}</p>
                  <p className="text-xs text-ink-400">
                    {tp.default_tasks?.length ?? 0} {t('actionPlans.tasksUnit')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </GlassPanel>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('actionPlans.title')}
        description={t('actionPlans.description')}
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <Tabs
        tabs={[
          { id: 'plans', label: t('actionPlans.tabs.plans'), content: plansTab },
          { id: 'templates', label: t('actionPlans.tabs.templates'), content: templatesTab },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('actionPlans.create')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitCreate} loading={submitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitCreate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t('actionPlans.fields.template')}
              value={form.template_id}
              onChange={(e) => applyTemplate(e.target.value)}
              options={templateOptions}
            />
            <Select
              label={t('actionPlans.fields.risk')}
              value={form.risk_assessment_id}
              onChange={(e) => setForm({ ...form, risk_assessment_id: e.target.value })}
              options={riskOptions}
            />
          </div>
          <Input
            label={t('actionPlans.fields.title')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label={t('actionPlans.fields.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <Input
            label={t('actionPlans.fields.target')}
            type="date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
          />
          <TaskEditor
            tasks={form.tasks}
            onAdd={addTask}
            onRemove={removeTask}
            onChange={setTask}
            t={t}
          />
          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={editingPlan !== null}
        onClose={() => setEditingPlan(null)}
        title={t('actionPlans.edit')}
        description={editingPlan?.title}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingPlan(null)}>
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
            <Select
              label={t('common.status')}
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Input
              label={t('actionPlans.fields.target')}
              type="date"
              value={editForm.target_date}
              onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
            />
          </div>
          <Input
            label={t('actionPlans.fields.title')}
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />
          <Textarea
            label={t('actionPlans.fields.description')}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            rows={3}
          />
          <TaskEditor
            tasks={editForm.tasks}
            onAdd={addEditTask}
            onRemove={removeEditTask}
            onChange={setEditTask}
            t={t}
          />
          {editError && <AlertBox tone="danger">{editError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title={t('actionPlans.templates.create')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTemplateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitTemplate} loading={templateSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitTemplate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('actionPlans.fields.name')}
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              required
            />
            <Select
              label={t('actionPlans.fields.appliesTo')}
              value={templateForm.applies_to_level}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, applies_to_level: e.target.value })
              }
              options={LEVELS.map((l) => ({ value: l, label: l }))}
            />
          </div>
          <Textarea
            label={t('actionPlans.fields.description')}
            value={templateForm.description}
            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
            rows={3}
          />
          <TaskEditor
            tasks={templateForm.default_tasks}
            onAdd={addTemplateTask}
            onRemove={removeTemplateTask}
            onChange={setTemplateTask}
            t={t}
          />
          {templateError && <AlertBox tone="danger">{templateError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}

interface TaskEditorProps {
  tasks: ActionPlanTask[]
  onAdd: () => void
  onRemove: (i: number) => void
  onChange: (i: number, patch: Partial<ActionPlanTask>) => void
  t: (k: string) => string
}

function TaskEditor({ tasks, onAdd, onRemove, onChange, t }: TaskEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-200">{t('actionPlans.fields.tasks')}</p>
        <Button size="sm" variant="ghost" type="button" onClick={onAdd}>
          {t('actionPlans.fields.addTask')}
        </Button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-ink-400">{t('actionPlans.fields.noTasks')}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task, idx) => (
            <li key={idx} className="rounded-lg p-3 space-y-2 bg-slate-50 border border-slate-200">
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  label={t('actionPlans.fields.taskTitle')}
                  value={(task.title as string | undefined) ?? ''}
                  onChange={(e) => onChange(idx, { title: e.target.value })}
                />
                <Select
                  label={t('common.status')}
                  value={(task.status as string | undefined) ?? 'PENDING'}
                  onChange={(e) => onChange(idx, { status: e.target.value })}
                  options={['PENDING', 'IN_PROGRESS', 'DONE'].map((s) => ({ value: s, label: s }))}
                />
                <Input
                  label={t('actionPlans.fields.taskDue')}
                  type="date"
                  value={(task.due_date as string | undefined) ?? ''}
                  onChange={(e) => onChange(idx, { due_date: e.target.value })}
                />
              </div>
              <Textarea
                label={t('actionPlans.fields.taskDescription')}
                value={(task.description as string | undefined) ?? ''}
                onChange={(e) => onChange(idx, { description: e.target.value })}
                rows={2}
              />
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" type="button" onClick={() => onRemove(idx)}>
                  {t('common.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
