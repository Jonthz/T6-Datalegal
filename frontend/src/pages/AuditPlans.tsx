import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, ListPlus, Pencil, RefreshCw, Search } from 'lucide-react'
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
  createAuditFinding,
  createAuditPlan,
  downloadAuditReportPdf,
  listAuditFindings,
  listAuditPlans,
  updateAuditFinding,
  updateAuditPlan,
} from '../api/auditPlans'
import type { AuditFinding, AuditPlan } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { downloadBlob, formatDate } from '../lib/format'

const PLAN_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
const FINDING_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED'] as const
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const

interface PlanForm {
  name: string
  scope: string
  period_start: string
  period_end: string
  notes: string
}

const EMPTY_PLAN_FORM: PlanForm = {
  name: '',
  scope: '',
  period_start: '',
  period_end: '',
  notes: '',
}

interface PlanEditForm extends PlanForm {
  status: string
}

interface FindingForm {
  audit_plan_id: number
  title: string
  description: string
  evidence: string
  severity: string
  remediation_notes: string
  remediation_date: string
}

interface FindingEditForm extends FindingForm {
  status: string
}

const severityTone: Record<string, 'danger' | 'warning' | 'info' | 'neutral' | 'success'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
  INFO: 'neutral',
}

export default function AuditPlansPage() {
  const { t } = useTranslation()

  const [plans, setPlans] = useState<AuditPlan[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN_FORM)
  const [planError, setPlanError] = useState('')
  const [planSubmitting, setPlanSubmitting] = useState(false)

  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null)
  const [editForm, setEditForm] = useState<PlanEditForm>({
    ...EMPTY_PLAN_FORM,
    status: 'PLANNED',
  })
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [findingsPlan, setFindingsPlan] = useState<AuditPlan | null>(null)
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [findingsLoading, setFindingsLoading] = useState(false)
  const [findingsError, setFindingsError] = useState('')

  const [findingOpen, setFindingOpen] = useState(false)
  const [findingForm, setFindingForm] = useState<FindingForm>({
    audit_plan_id: 0,
    title: '',
    description: '',
    evidence: '',
    severity: 'MEDIUM',
    remediation_notes: '',
    remediation_date: '',
  })
  const [findingFormError, setFindingFormError] = useState('')
  const [findingSubmitting, setFindingSubmitting] = useState(false)

  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null)
  const [findingEditForm, setFindingEditForm] = useState<FindingEditForm>({
    audit_plan_id: 0,
    title: '',
    description: '',
    evidence: '',
    severity: 'MEDIUM',
    remediation_notes: '',
    remediation_date: '',
    status: 'OPEN',
  })
  const [findingEditError, setFindingEditError] = useState('')
  const [findingEditSubmitting, setFindingEditSubmitting] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAuditPlans(
        statusFilter ? { plan_status: statusFilter, limit: 200 } : { limit: 200 }
      )
      setPlans(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('auditPlans.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  function openCreate() {
    setPlanForm(EMPTY_PLAN_FORM)
    setPlanError('')
    setCreateOpen(true)
  }

  async function submitPlan(e: FormEvent) {
    e.preventDefault()
    setPlanError('')
    if (!planForm.name.trim()) {
      setPlanError(t('auditPlans.validation'))
      return
    }
    setPlanSubmitting(true)
    try {
      await createAuditPlan({
        name: planForm.name.trim(),
        scope: planForm.scope,
        period_start: planForm.period_start || null,
        period_end: planForm.period_end || null,
        notes: planForm.notes,
      })
      setSuccess(t('auditPlans.createSuccess'))
      setCreateOpen(false)
      await loadPlans()
    } catch (err) {
      setPlanError(extractErrorMessage(err, t('common.error')))
    } finally {
      setPlanSubmitting(false)
    }
  }

  function openEdit(plan: AuditPlan) {
    setEditingPlan(plan)
    setEditForm({
      name: plan.name,
      scope: plan.scope,
      period_start: plan.period_start ?? '',
      period_end: plan.period_end ?? '',
      notes: plan.notes,
      status: plan.status,
    })
    setEditError('')
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingPlan) return
    setEditError('')
    setEditSubmitting(true)
    try {
      await updateAuditPlan(editingPlan.id, {
        name: editForm.name,
        scope: editForm.scope,
        period_start: editForm.period_start || null,
        period_end: editForm.period_end || null,
        status: editForm.status,
        notes: editForm.notes,
      })
      setSuccess(t('auditPlans.updateSuccess'))
      setEditingPlan(null)
      await loadPlans()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDownload(plan: AuditPlan) {
    setDownloadingId(plan.id)
    setError('')
    try {
      const blob = await downloadAuditReportPdf(plan.id)
      downloadBlob(blob, `audit_report_${plan.id}.pdf`)
    } catch (err) {
      const status = getStatus(err)
      if (status === 404) {
        setError(t('auditPlans.reportNotFound'))
      } else {
        setError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const loadFindings = useCallback(
    async (planId: number) => {
      setFindingsLoading(true)
      setFindingsError('')
      try {
        const data = await listAuditFindings(planId)
        setFindings(data)
      } catch (err) {
        setFindingsError(extractErrorMessage(err, t('auditPlans.findings.loadFailed')))
      } finally {
        setFindingsLoading(false)
      }
    },
    [t]
  )

  function openFindings(plan: AuditPlan) {
    setFindingsPlan(plan)
    setFindings([])
    loadFindings(plan.id)
  }

  function openNewFinding() {
    if (!findingsPlan) return
    setFindingForm({
      audit_plan_id: findingsPlan.id,
      title: '',
      description: '',
      evidence: '',
      severity: 'MEDIUM',
      remediation_notes: '',
      remediation_date: '',
    })
    setFindingFormError('')
    setFindingOpen(true)
  }

  async function submitFinding(e: FormEvent) {
    e.preventDefault()
    setFindingFormError('')
    if (!findingForm.title.trim()) {
      setFindingFormError(t('auditPlans.findings.validation'))
      return
    }
    setFindingSubmitting(true)
    try {
      await createAuditFinding({
        audit_plan_id: findingForm.audit_plan_id,
        title: findingForm.title.trim(),
        description: findingForm.description,
        evidence: findingForm.evidence,
        severity: findingForm.severity,
        remediation_notes: findingForm.remediation_notes,
        remediation_date: findingForm.remediation_date || null,
      })
      setSuccess(t('auditPlans.findings.createSuccess'))
      setFindingOpen(false)
      await loadFindings(findingForm.audit_plan_id)
    } catch (err) {
      setFindingFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setFindingSubmitting(false)
    }
  }

  function openEditFinding(finding: AuditFinding) {
    setEditingFinding(finding)
    setFindingEditForm({
      audit_plan_id: finding.audit_plan_id,
      title: finding.title,
      description: finding.description,
      evidence: finding.evidence,
      severity: finding.severity,
      remediation_notes: finding.remediation_notes,
      remediation_date: finding.remediation_date ?? '',
      status: finding.status,
    })
    setFindingEditError('')
  }

  async function submitEditFinding(e: FormEvent) {
    e.preventDefault()
    if (!editingFinding) return
    setFindingEditError('')
    setFindingEditSubmitting(true)
    try {
      await updateAuditFinding(editingFinding.id, {
        title: findingEditForm.title,
        description: findingEditForm.description,
        evidence: findingEditForm.evidence,
        severity: findingEditForm.severity,
        status: findingEditForm.status,
        remediation_notes: findingEditForm.remediation_notes,
        remediation_date: findingEditForm.remediation_date || null,
      })
      setSuccess(t('auditPlans.findings.updateSuccess'))
      setEditingFinding(null)
      await loadFindings(editingFinding.audit_plan_id)
    } catch (err) {
      setFindingEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setFindingEditSubmitting(false)
    }
  }

  const planColumns = useMemo<DataTableColumn<AuditPlan>[]>(
    () => [
      {
        key: 'name',
        header: t('auditPlans.columns.name'),
        render: (p) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{p.name}</p>
            <p className="text-xs text-ink-300 line-clamp-2">{p.scope}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (p) => <StatusBadge status={p.status} />,
      },
      {
        key: 'period',
        header: t('auditPlans.columns.period'),
        render: (p) => (
          <span className="text-xs text-ink-300">
            {p.period_start ? formatDate(p.period_start) : '—'} →{' '}
            {p.period_end ? formatDate(p.period_end) : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (p) => (
          <div className="flex justify-end gap-1">
            <IconButton
              label={t('auditPlans.findings.open')}
              icon={<Search className="h-4 w-4" />}
              onClick={() => openFindings(p)}
            />
            <IconButton
              label={t('common.edit')}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(p)}
            />
            <IconButton
              label={t('auditPlans.downloadReport')}
              icon={<FileDown className="h-4 w-4" />}
              loading={downloadingId === p.id}
              onClick={() => handleDownload(p)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, downloadingId]
  )

  const findingColumns = useMemo<DataTableColumn<AuditFinding>[]>(
    () => [
      {
        key: 'title',
        header: t('auditPlans.findings.columns.title'),
        render: (f) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{f.title}</p>
            <p className="text-xs text-ink-300 line-clamp-2">{f.description}</p>
          </div>
        ),
      },
      {
        key: 'severity',
        header: t('auditPlans.findings.columns.severity'),
        render: (f) => <Badge tone={severityTone[f.severity] ?? 'neutral'}>{f.severity}</Badge>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (f) => <StatusBadge status={f.status} />,
      },
      {
        key: 'remediation',
        header: t('auditPlans.findings.columns.remediation'),
        render: (f) => (
          <span className="text-xs text-ink-300">
            {f.remediation_date ? formatDate(f.remediation_date) : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (f) => (
          <IconButton
            label={t('common.edit')}
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openEditFinding(f)}
          />
        ),
      },
    ],
    [t]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('auditPlans.title')}
        description={t('auditPlans.description')}
        actions={
          <IconButton
            label={t('auditPlans.create')}
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
              label={t('auditPlans.filter')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: t('common.all') },
                ...PLAN_STATUSES.map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={loadPlans}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<AuditPlan>
          columns={planColumns}
          rows={plans}
          rowKey={(p) => p.id}
          loading={loading}
          emptyTitle={t('auditPlans.empty')}
          emptyDescription={t('auditPlans.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('auditPlans.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('auditPlans.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitPlan} loading={planSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitPlan} className="space-y-3">
          <Input
            label={t('auditPlans.fields.name')}
            value={planForm.name}
            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            required
          />
          <Textarea
            label={t('auditPlans.fields.scope')}
            value={planForm.scope}
            onChange={(e) => setPlanForm({ ...planForm, scope: e.target.value })}
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('auditPlans.fields.periodStart')}
              type="date"
              value={planForm.period_start}
              onChange={(e) => setPlanForm({ ...planForm, period_start: e.target.value })}
            />
            <Input
              label={t('auditPlans.fields.periodEnd')}
              type="date"
              value={planForm.period_end}
              onChange={(e) => setPlanForm({ ...planForm, period_end: e.target.value })}
            />
          </div>
          <Textarea
            label={t('auditPlans.fields.notes')}
            value={planForm.notes}
            onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
            rows={2}
          />
          {planError && <AlertBox tone="danger">{planError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={editingPlan !== null}
        onClose={() => setEditingPlan(null)}
        title={t('auditPlans.edit')}
        description={editingPlan?.name}
        size="lg"
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
            <Input
              label={t('auditPlans.fields.name')}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Select
              label={t('common.status')}
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={PLAN_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <Textarea
            label={t('auditPlans.fields.scope')}
            value={editForm.scope}
            onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })}
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('auditPlans.fields.periodStart')}
              type="date"
              value={editForm.period_start}
              onChange={(e) => setEditForm({ ...editForm, period_start: e.target.value })}
            />
            <Input
              label={t('auditPlans.fields.periodEnd')}
              type="date"
              value={editForm.period_end}
              onChange={(e) => setEditForm({ ...editForm, period_end: e.target.value })}
            />
          </div>
          <Textarea
            label={t('auditPlans.fields.notes')}
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            rows={2}
          />
          {editError && <AlertBox tone="danger">{editError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={findingsPlan !== null}
        onClose={() => setFindingsPlan(null)}
        title={t('auditPlans.findings.title')}
        description={findingsPlan?.name}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFindingsPlan(null)}>
              {t('common.close')}
            </Button>
            <Button onClick={openNewFinding}>{t('auditPlans.findings.add')}</Button>
          </>
        }
      >
        {findingsError && <AlertBox tone="danger">{findingsError}</AlertBox>}
        <DataTable<AuditFinding>
          columns={findingColumns}
          rows={findings}
          rowKey={(f) => f.id}
          loading={findingsLoading}
          emptyTitle={t('auditPlans.findings.empty')}
          emptyDescription={t('auditPlans.findings.emptyHint')}
          emptyAction={<Button onClick={openNewFinding}>{t('auditPlans.findings.add')}</Button>}
        />
      </Modal>

      <Modal
        open={findingOpen}
        onClose={() => setFindingOpen(false)}
        title={t('auditPlans.findings.add')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFindingOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitFinding} loading={findingSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitFinding} className="space-y-3">
          <Input
            label={t('auditPlans.findings.fields.title')}
            value={findingForm.title}
            onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
            required
          />
          <Textarea
            label={t('auditPlans.findings.fields.description')}
            value={findingForm.description}
            onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t('auditPlans.findings.fields.severity')}
              value={findingForm.severity}
              onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}
              options={SEVERITIES.map((s) => ({ value: s, label: s }))}
            />
            <Input
              label={t('auditPlans.findings.fields.remediationDate')}
              type="date"
              value={findingForm.remediation_date}
              onChange={(e) =>
                setFindingForm({ ...findingForm, remediation_date: e.target.value })
              }
            />
          </div>
          <Textarea
            label={t('auditPlans.findings.fields.evidence')}
            value={findingForm.evidence}
            onChange={(e) => setFindingForm({ ...findingForm, evidence: e.target.value })}
            rows={2}
          />
          <Textarea
            label={t('auditPlans.findings.fields.remediationNotes')}
            value={findingForm.remediation_notes}
            onChange={(e) =>
              setFindingForm({ ...findingForm, remediation_notes: e.target.value })
            }
            rows={2}
          />
          {findingFormError && <AlertBox tone="danger">{findingFormError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={editingFinding !== null}
        onClose={() => setEditingFinding(null)}
        title={t('auditPlans.findings.edit')}
        description={editingFinding?.title}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingFinding(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitEditFinding} loading={findingEditSubmitting}>
              {t('common.saveChanges')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitEditFinding} className="space-y-3">
          <Input
            label={t('auditPlans.findings.fields.title')}
            value={findingEditForm.title}
            onChange={(e) => setFindingEditForm({ ...findingEditForm, title: e.target.value })}
            required
          />
          <Textarea
            label={t('auditPlans.findings.fields.description')}
            value={findingEditForm.description}
            onChange={(e) =>
              setFindingEditForm({ ...findingEditForm, description: e.target.value })
            }
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label={t('auditPlans.findings.fields.severity')}
              value={findingEditForm.severity}
              onChange={(e) =>
                setFindingEditForm({ ...findingEditForm, severity: e.target.value })
              }
              options={SEVERITIES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              label={t('common.status')}
              value={findingEditForm.status}
              onChange={(e) =>
                setFindingEditForm({ ...findingEditForm, status: e.target.value })
              }
              options={FINDING_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Input
              label={t('auditPlans.findings.fields.remediationDate')}
              type="date"
              value={findingEditForm.remediation_date}
              onChange={(e) =>
                setFindingEditForm({ ...findingEditForm, remediation_date: e.target.value })
              }
            />
          </div>
          <Textarea
            label={t('auditPlans.findings.fields.evidence')}
            value={findingEditForm.evidence}
            onChange={(e) =>
              setFindingEditForm({ ...findingEditForm, evidence: e.target.value })
            }
            rows={2}
          />
          <Textarea
            label={t('auditPlans.findings.fields.remediationNotes')}
            value={findingEditForm.remediation_notes}
            onChange={(e) =>
              setFindingEditForm({ ...findingEditForm, remediation_notes: e.target.value })
            }
            rows={2}
          />
          {findingEditError && <AlertBox tone="danger">{findingEditError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
