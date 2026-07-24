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
  VULNERABILITY_TYPES,
  closeIncident,
  createIncident,
  downloadIncidentReport,
  listIncidents,
  notifyIncident,
  updateIncident,
} from '../api/incidents'
import { listDepartments } from '../api/departments'
import { getUsers } from '../api/users'
import { getCompanyProfile } from '../api/companyProfile'
import type { Department, Incident, Tenant, User } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDate, formatDateTime } from '../lib/format'

const INCIDENT_TYPES = [
  'DATA_BREACH',
  'UNAUTHORIZED_ACCESS',
  'SYSTEM_FAILURE',
  'POLICY_VIOLATION',
  'OTHER',
] as const
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const
// CLOSED is reached only through the closure flow (which generates the PDF report),
// so it is not offered as a directly-selectable status in the edit form.
const EDIT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED'] as const

// LOPDP timeline: regulator notification within 5 calendar days of detection.
const REGULATOR_DEADLINE_DAYS = 5

interface CreateForm {
  title: string
  description: string
  incident_type: string
  severity: string
  vulnerability_types: string[]
  regulatory_notification_required: boolean
  affected_data_types: string
  department_id: string
  assigned_to_id: string
  delegate_name: string
  delegate_email: string
  delegate_phone: string
  controller_name: string
  controller_email: string
  controller_phone: string
}

const EMPTY_CREATE: CreateForm = {
  title: '',
  description: '',
  incident_type: 'DATA_BREACH',
  severity: 'MEDIUM',
  vulnerability_types: [],
  regulatory_notification_required: false,
  affected_data_types: '',
  department_id: '',
  assigned_to_id: '',
  delegate_name: '',
  delegate_email: '',
  delegate_phone: '',
  controller_name: '',
  controller_email: '',
  controller_phone: '',
}

function toggleVuln(list: string[], value: string): string[] {
  const next = list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value]
  // Keep canonical CIA order to match the backend.
  return VULNERABILITY_TYPES.filter((v) => next.includes(v))
}

function daysBetween(from: string, to: Date): number {
  const fromDate = new Date(from)
  if (Number.isNaN(fromDate.getTime())) return 0
  const ms = to.getTime() - fromDate.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function regulatorDeadlineStatus(incident: Incident, now: Date): {
  tone: 'success' | 'warning' | 'danger' | 'info'
  label: string
} {
  const elapsed = daysBetween(incident.created_at, now)
  const remaining = REGULATOR_DEADLINE_DAYS - elapsed
  if (incident.regulatory_notified_at) {
    return {
      tone: 'success',
      label: `Notified ${formatDateTime(incident.regulatory_notified_at)}`,
    }
  }
  if (remaining < 0) {
    return { tone: 'danger', label: `Overdue by ${Math.abs(remaining)} day(s)` }
  }
  if (remaining === 0) return { tone: 'warning', label: 'Due today' }
  return { tone: 'warning', label: `${remaining} day(s) remaining` }
}

export default function IncidentsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Incident[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [companyProfile, setCompanyProfile] = useState<Tenant | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [createError, setCreateError] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editing, setEditing] = useState<Incident | null>(null)
  const [editForm, setEditForm] = useState<CreateForm & { status: string }>({
    ...EMPTY_CREATE,
    status: 'OPEN',
  })
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [closingIncident, setClosingIncident] = useState<Incident | null>(null)
  const [closeSummary, setCloseSummary] = useState('')
  const [closeError, setCloseError] = useState('')
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: { status?: string; severity?: string; limit?: number } = {
        limit: 200,
      }
      if (statusFilter) params.status = statusFilter
      if (severityFilter) params.severity = severityFilter
      const [list, deptList, userList, profile] = await Promise.all([
        listIncidents(params),
        listDepartments({ limit: 200 }).catch(() => [] as Department[]),
        getUsers({ limit: 200 }).catch(() => [] as User[]),
        getCompanyProfile().catch(() => null),
      ])
      setItems(list)
      setDepartments(deptList)
      setUsers(userList)
      setCompanyProfile(profile)
    } catch (err) {
      setError(extractErrorMessage(err, t('incidents.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, severityFilter, t])

  useEffect(() => {
    load()
  }, [load])

  const deptById = useMemo(() => {
    const map = new Map<number, Department>()
    departments.forEach((d) => map.set(d.id, d))
    return map
  }, [departments])

  const userById = useMemo(() => {
    const map = new Map<number, User>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  function openCreate() {
    // RF-03: pre-fill delegado/responsable from the company profile as editable
    // defaults; the values are stored as a per-incident snapshot on save.
    setCreateForm({
      ...EMPTY_CREATE,
      delegate_name: companyProfile?.dpo_name ?? '',
      delegate_email: companyProfile?.dpo_email ?? '',
      delegate_phone: companyProfile?.dpo_phone ?? '',
      controller_name: companyProfile?.name ?? '',
    })
    setCreateError('')
    setCreating(true)
  }

  function openEdit(incident: Incident) {
    setEditing(incident)
    setEditForm({
      title: incident.title,
      description: incident.description,
      incident_type: incident.incident_type,
      severity: incident.severity,
      vulnerability_types: incident.vulnerability_types ?? [],
      regulatory_notification_required: incident.regulatory_notification_required,
      affected_data_types: incident.affected_data_types,
      department_id: incident.department_id ? String(incident.department_id) : '',
      assigned_to_id: incident.assigned_to_id ? String(incident.assigned_to_id) : '',
      delegate_name: incident.delegate_name ?? '',
      delegate_email: incident.delegate_email ?? '',
      delegate_phone: incident.delegate_phone ?? '',
      controller_name: incident.controller_name ?? '',
      controller_email: incident.controller_email ?? '',
      controller_phone: incident.controller_phone ?? '',
      status: incident.status,
    })
    setEditError('')
  }

  function openClose(incident: Incident) {
    setClosingIncident(incident)
    setCloseSummary('')
    setCloseError('')
  }

  async function handleCloseSubmit(e: FormEvent) {
    e.preventDefault()
    if (!closingIncident) return
    if (!closeSummary.trim()) {
      setCloseError(t('incidents.validation.summaryRequired'))
      return
    }
    setCloseError('')
    setCloseSubmitting(true)
    try {
      await closeIncident(closingIncident.id, closeSummary)
      setSuccess(t('incidents.closure.success'))
      setClosingIncident(null)
      await load()
    } catch (err) {
      setCloseError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCloseSubmitting(false)
    }
  }

  async function handleDownloadReport(incident: Incident) {
    setBusyId(incident.id)
    try {
      await downloadIncidentReport(incident.id)
    } catch (err) {
      setError(extractErrorMessage(err, t('incidents.downloadReportFailed')))
    } finally {
      setBusyId(null)
    }
  }

  // Required-field validation shared by create and edit. The footer Save button
  // lives outside the <form>, so HTML `required` is not enforced — validate here.
  function validateIncidentForm(f: CreateForm): string | null {
    if (!f.title.trim()) return t('incidents.validation.titleRequired')
    if (!f.description.trim()) return t('incidents.validation.descriptionRequired')
    if (f.vulnerability_types.length === 0) return t('incidents.validation.breachRequired')
    if (!f.delegate_name.trim()) return t('incidents.validation.delegateRequired')
    if (!f.controller_name.trim()) return t('incidents.validation.controllerRequired')
    return null
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const validationError = validateIncidentForm(createForm)
    if (validationError) {
      setCreateError(validationError)
      return
    }
    setCreateError('')
    setCreateSubmitting(true)
    try {
      await createIncident({
        title: createForm.title,
        description: createForm.description,
        incident_type: createForm.incident_type,
        severity: createForm.severity,
        vulnerability_types: createForm.vulnerability_types,
        regulatory_notification_required: createForm.regulatory_notification_required,
        affected_data_types: createForm.affected_data_types,
        department_id: createForm.department_id ? Number(createForm.department_id) : null,
        assigned_to_id: createForm.assigned_to_id ? Number(createForm.assigned_to_id) : null,
        delegate_name: createForm.delegate_name || null,
        delegate_email: createForm.delegate_email || null,
        delegate_phone: createForm.delegate_phone || null,
        controller_name: createForm.controller_name || null,
        controller_email: createForm.controller_email || null,
        controller_phone: createForm.controller_phone || null,
      })
      setSuccess(t('incidents.createSuccess'))
      setCreating(false)
      await load()
    } catch (err) {
      setCreateError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    const validationError = validateIncidentForm(editForm)
    if (validationError) {
      setEditError(validationError)
      return
    }
    setEditError('')
    setEditSubmitting(true)
    try {
      await updateIncident(editing.id, {
        title: editForm.title,
        description: editForm.description,
        incident_type: editForm.incident_type,
        severity: editForm.severity,
        status: editForm.status,
        vulnerability_types: editForm.vulnerability_types,
        regulatory_notification_required: editForm.regulatory_notification_required,
        affected_data_types: editForm.affected_data_types,
        assigned_to_id: editForm.assigned_to_id ? Number(editForm.assigned_to_id) : null,
        delegate_name: editForm.delegate_name || null,
        delegate_email: editForm.delegate_email || null,
        delegate_phone: editForm.delegate_phone || null,
        controller_name: editForm.controller_name || null,
        controller_email: editForm.controller_email || null,
        controller_phone: editForm.controller_phone || null,
      })
      setSuccess(t('incidents.updateSuccess'))
      setEditing(null)
      await load()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleNotify(incident: Incident) {
    setBusyId(incident.id)
    try {
      await notifyIncident(incident.id)
      setSuccess(t('incidents.notifySuccess'))
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  const now = new Date()

  const columns = useMemo<DataTableColumn<Incident>[]>(
    () => [
      {
        key: 'title',
        header: t('incidents.fields.title'),
        render: (i) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{i.title}</p>
            <p className="text-xs text-ink-400 line-clamp-2">{i.description}</p>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('incidents.fields.type'),
        render: (i) => (
          <Badge tone="brand">
            {t(`incidents.types.${i.incident_type}`, i.incident_type)}
          </Badge>
        ),
      },
      {
        key: 'severity',
        header: t('incidents.fields.severity'),
        render: (i) => (
          <Badge
            tone={
              i.severity === 'CRITICAL' || i.severity === 'HIGH'
                ? 'danger'
                : i.severity === 'MEDIUM'
                  ? 'warning'
                  : 'success'
            }
          >
            {t(`incidents.severities.${i.severity}`, i.severity)}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: t('incidents.fields.status'),
        render: (i) => <StatusBadge status={i.status} />,
      },
      {
        key: 'deadline',
        header: t('incidents.deadlines.title'),
        render: (i) => {
          const ds = regulatorDeadlineStatus(i, now)
          return (
            <div className="flex flex-col gap-1">
              <Badge tone={ds.tone}>{ds.label}</Badge>
              {i.regulatory_notification_required && !i.regulatory_notified_at && (
                <Badge tone="warning">SPDP</Badge>
              )}
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (i) => (
          <div className="flex justify-end gap-1 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => openEdit(i)}>
              {t('common.edit')}
            </Button>
            {!i.regulatory_notified_at && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleNotify(i)}
                loading={busyId === i.id}
              >
                {t('incidents.notifyAction')}
              </Button>
            )}
            {i.status !== 'CLOSED' && (
              <Button size="sm" variant="secondary" onClick={() => openClose(i)}>
                {t('incidents.closeAction')}
              </Button>
            )}
            {i.has_closure_report && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownloadReport(i)}
                loading={busyId === i.id}
              >
                {t('incidents.closure.download')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyId, now.getDate()]
  )

  const filterOptions = (values: readonly string[], translateKey: string) => [
    { value: '', label: t('incidents.filters.all') },
    ...values.map((v) => ({ value: v, label: t(`${translateKey}.${v}`, v) })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('incidents.title')}
        description={t('incidents.description')}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => load()}>
              {t('common.refresh')}
            </Button>
            <Button onClick={openCreate}>{t('incidents.create')}</Button>
          </>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label={t('incidents.filters.status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={filterOptions(STATUSES, 'incidents.statuses')}
          />
          <Select
            label={t('incidents.filters.severity')}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            options={filterOptions(SEVERITIES, 'incidents.severities')}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<Incident>
          columns={columns}
          rows={items}
          rowKey={(i) => i.id}
          loading={loading}
          emptyTitle={t('incidents.empty')}
          emptyDescription={t('incidents.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('incidents.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('incidents.create')}
        size="xl"
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
            label={t('incidents.fields.title')}
            required
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
          />
          <Textarea
            label={t('incidents.fields.description')}
            required
            value={createForm.description}
            onChange={(e) =>
              setCreateForm({ ...createForm, description: e.target.value })
            }
            rows={4}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t('incidents.fields.type')}
              value={createForm.incident_type}
              onChange={(e) =>
                setCreateForm({ ...createForm, incident_type: e.target.value })
              }
              options={INCIDENT_TYPES.map((v) => ({
                value: v,
                label: t(`incidents.types.${v}`),
              }))}
            />
            <Select
              label={t('incidents.fields.severity')}
              value={createForm.severity}
              onChange={(e) =>
                setCreateForm({ ...createForm, severity: e.target.value })
              }
              options={SEVERITIES.map((v) => ({
                value: v,
                label: t(`incidents.severities.${v}`),
              }))}
            />
          </div>
          <Textarea
            label={t('incidents.fields.affectedData')}
            value={createForm.affected_data_types}
            onChange={(e) =>
              setCreateForm({ ...createForm, affected_data_types: e.target.value })
            }
            hint={t('incidents.csvHelp')}
            rows={2}
          />
          <div>
            <p className="text-sm font-medium text-ink-50">
              {t('incidents.fields.vulnerability')} <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-ink-300 mb-2">
              {t('incidents.fields.vulnerabilityHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              {VULNERABILITY_TYPES.map((v) => (
                <label
                  key={v}
                  className="flex items-center gap-2 text-sm text-ink-100 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={createForm.vulnerability_types.includes(v)}
                    onChange={() =>
                      setCreateForm({
                        ...createForm,
                        vulnerability_types: toggleVuln(createForm.vulnerability_types, v),
                      })
                    }
                  />
                  {t(`incidents.vulnerabilities.${v}`)}
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-300">{t('incidents.fields.partiesHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-50">
                {t('incidents.fields.delegate')}
              </p>
              <Input
                label={t('incidents.fields.name')}
                required
                value={createForm.delegate_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, delegate_name: e.target.value })
                }
              />
              <Input
                label={t('incidents.fields.email')}
                value={createForm.delegate_email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, delegate_email: e.target.value })
                }
              />
              <Input
                label={t('incidents.fields.phone')}
                value={createForm.delegate_phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, delegate_phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-50">
                {t('incidents.fields.controller')}
              </p>
              <Input
                label={t('incidents.fields.name')}
                required
                value={createForm.controller_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, controller_name: e.target.value })
                }
              />
              <Input
                label={t('incidents.fields.email')}
                value={createForm.controller_email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, controller_email: e.target.value })
                }
              />
              <Input
                label={t('incidents.fields.phone')}
                value={createForm.controller_phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, controller_phone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t('incidents.fields.department')}
              value={createForm.department_id}
              onChange={(e) =>
                setCreateForm({ ...createForm, department_id: e.target.value })
              }
              options={[
                { value: '', label: t('common.optional') },
                ...departments.map((d) => ({ value: String(d.id), label: d.name })),
              ]}
            />
            <Select
              label={t('incidents.fields.assigned')}
              value={createForm.assigned_to_id}
              onChange={(e) =>
                setCreateForm({ ...createForm, assigned_to_id: e.target.value })
              }
              options={[
                { value: '', label: t('common.optional') },
                ...users.map((u) => ({
                  value: String(u.id),
                  label: u.full_name || u.email,
                })),
              ]}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-ink-200 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={createForm.regulatory_notification_required}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  regulatory_notification_required: e.target.checked,
                })
              }
            />
            <span className="min-w-0">
              <span className="block font-medium text-ink-50">
                {t('incidents.fields.spdp')}
              </span>
              <span className="block text-xs text-ink-300">
                {t('incidents.fields.spdpHint')}
              </span>
            </span>
          </label>
          {createError && <AlertBox tone="danger">{createError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? editing.title : ''}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditSubmit} loading={editSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editing && (
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <GlassCard>
              <h4 className="text-xs uppercase text-ink-400 mb-2">
                {t('incidents.deadlines.title')}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={regulatorDeadlineStatus(editing, now).tone}>
                  {t('incidents.deadlines.regulator')}:{' '}
                  {regulatorDeadlineStatus(editing, now).label}
                </Badge>
                <Badge tone={editing.resolved_at ? 'success' : 'warning'}>
                  {t('incidents.deadlines.subjects')}:{' '}
                  {editing.resolved_at
                    ? `${formatDate(editing.resolved_at)} ✓`
                    : t('incidents.deadlines.subjectsPending')}
                </Badge>
              </div>
              <p className="text-xs text-ink-400 mt-2">
                Reporter:{' '}
                {editing.reporter_id
                  ? userById.get(editing.reporter_id)?.full_name ??
                    `#${editing.reporter_id}`
                  : '—'}{' '}
                · {t('common.created')}: {formatDateTime(editing.created_at)}
                {editing.department_id && (
                  <>
                    {' '}
                    · {t('incidents.fields.department')}:{' '}
                    {deptById.get(editing.department_id)?.name ??
                      `#${editing.department_id}`}
                  </>
                )}
              </p>
            </GlassCard>

            <Input
              label={t('incidents.fields.title')}
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
            <Textarea
              label={t('incidents.fields.description')}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              rows={4}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label={t('incidents.fields.type')}
                value={editForm.incident_type}
                onChange={(e) =>
                  setEditForm({ ...editForm, incident_type: e.target.value })
                }
                options={INCIDENT_TYPES.map((v) => ({
                  value: v,
                  label: t(`incidents.types.${v}`),
                }))}
              />
              <Select
                label={t('incidents.fields.severity')}
                value={editForm.severity}
                onChange={(e) =>
                  setEditForm({ ...editForm, severity: e.target.value })
                }
                options={SEVERITIES.map((v) => ({
                  value: v,
                  label: t(`incidents.severities.${v}`),
                }))}
              />
              <Select
                label={t('incidents.fields.status')}
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                options={(editing?.status === 'CLOSED'
                  ? STATUSES
                  : EDIT_STATUSES
                ).map((v) => ({
                  value: v,
                  label: t(`incidents.statuses.${v}`),
                }))}
              />
            </div>
            <Textarea
              label={t('incidents.fields.affectedData')}
              value={editForm.affected_data_types}
              onChange={(e) =>
                setEditForm({ ...editForm, affected_data_types: e.target.value })
              }
              hint={t('incidents.csvHelp')}
              rows={2}
            />
            <div>
              <p className="text-sm font-medium text-ink-50">
                {t('incidents.fields.vulnerability')} <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-ink-300 mb-2">
                {t('incidents.fields.vulnerabilityHint')}
              </p>
              <div className="flex flex-wrap gap-2">
                {VULNERABILITY_TYPES.map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 text-sm text-ink-100 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.vulnerability_types.includes(v)}
                      onChange={() =>
                        setEditForm({
                          ...editForm,
                          vulnerability_types: toggleVuln(editForm.vulnerability_types, v),
                        })
                      }
                    />
                    {t(`incidents.vulnerabilities.${v}`)}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-50">
                  {t('incidents.fields.delegate')}
                </p>
                <Input
                  label={t('incidents.fields.name')}
                  required
                  value={editForm.delegate_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, delegate_name: e.target.value })
                  }
                />
                <Input
                  label={t('incidents.fields.email')}
                  value={editForm.delegate_email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, delegate_email: e.target.value })
                  }
                />
                <Input
                  label={t('incidents.fields.phone')}
                  value={editForm.delegate_phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, delegate_phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-50">
                  {t('incidents.fields.controller')}
                </p>
                <Input
                  label={t('incidents.fields.name')}
                  required
                  value={editForm.controller_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, controller_name: e.target.value })
                  }
                />
                <Input
                  label={t('incidents.fields.email')}
                  value={editForm.controller_email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, controller_email: e.target.value })
                  }
                />
                <Input
                  label={t('incidents.fields.phone')}
                  value={editForm.controller_phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, controller_phone: e.target.value })
                  }
                />
              </div>
            </div>
            <Select
              label={t('incidents.fields.assigned')}
              value={editForm.assigned_to_id}
              onChange={(e) =>
                setEditForm({ ...editForm, assigned_to_id: e.target.value })
              }
              options={[
                { value: '', label: t('common.optional') },
                ...users.map((u) => ({
                  value: String(u.id),
                  label: u.full_name || u.email,
                })),
              ]}
            />
            <label className="flex items-start gap-2 text-sm text-ink-200 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={editForm.regulatory_notification_required}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    regulatory_notification_required: e.target.checked,
                  })
                }
              />
              <span className="min-w-0">
                <span className="block font-medium text-ink-50">
                  {t('incidents.fields.spdp')}
                </span>
                <span className="block text-xs text-ink-300">
                  {t('incidents.fields.spdpHint')}
                </span>
              </span>
            </label>

            {editError && <AlertBox tone="danger">{editError}</AlertBox>}
          </form>
        )}
      </Modal>

      <Modal
        open={!!closingIncident}
        onClose={() => setClosingIncident(null)}
        title={t('incidents.closure.action')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosingIncident(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCloseSubmit} loading={closeSubmitting}>
              {t('incidents.closure.action')}
            </Button>
          </>
        }
      >
        {closingIncident && (
          <form onSubmit={handleCloseSubmit} className="space-y-3">
            <AlertBox tone="info">{t('incidents.closure.requirements')}</AlertBox>
            <Textarea
              label={t('incidents.closure.summary')}
              required
              value={closeSummary}
              onChange={(e) => setCloseSummary(e.target.value)}
              hint={t('incidents.closure.summaryHint')}
              rows={5}
            />
            {closeError && <AlertBox tone="danger">{closeError}</AlertBox>}
          </form>
        )}
      </Modal>
    </div>
  )
}
