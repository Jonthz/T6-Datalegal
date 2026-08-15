import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardPlus, Pencil, RefreshCw, StepForward, Trash2 } from 'lucide-react'
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
  createTreatmentActivity,
  deleteTreatmentActivity,
  listTreatmentActivities,
  updateTreatmentActivity,
} from '../api/treatmentActivities'
import { listDepartments } from '../api/departments'
import type { Department, TreatmentActivity } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { cn } from '../lib/cn'

const STATUS_FILTER_OPTIONS = (t: (k: string) => string) => [
  { value: '', label: t('treatmentActivities.filterAll') },
  { value: 'DRAFT', label: t('treatmentActivities.filterDraft') },
  { value: 'ACTIVE', label: t('treatmentActivities.filterActive') },
  { value: 'ARCHIVED', label: t('treatmentActivities.filterArchived') },
]

export default function TreatmentActivitiesPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<TreatmentActivity[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardActivity, setWizardActivity] = useState<TreatmentActivity | null>(null)
  const [editing, setEditing] = useState<TreatmentActivity | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [activities, deptList] = await Promise.all([
        listTreatmentActivities({
          status: statusFilter || undefined,
          limit: 200,
        }),
        listDepartments({ limit: 200 }).catch(() => [] as Department[]),
      ])
      setItems(activities)
      setDepartments(deptList)
    } catch (err) {
      setError(extractErrorMessage(err, t('treatmentActivities.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(activity: TreatmentActivity) {
    if (!window.confirm(t('treatmentActivities.confirmDelete'))) return
    setBusyId(activity.id)
    try {
      await deleteTreatmentActivity(activity.id)
      setSuccess(t('treatmentActivities.deleteSuccess'))
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  function continueWizard(activity: TreatmentActivity) {
    setWizardActivity(activity)
    setWizardOpen(true)
  }

  function startNewWizard() {
    setWizardActivity(null)
    setWizardOpen(true)
  }

  const deptById = useMemo(() => {
    const map = new Map<number, Department>()
    departments.forEach((d) => map.set(d.id, d))
    return map
  }, [departments])

  const columns = useMemo<DataTableColumn<TreatmentActivity>[]>(
    () => [
      {
        key: 'name',
        header: t('treatmentActivities.fields.name'),
        render: (a) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{a.name}</p>
            <p className="text-xs text-ink-400 line-clamp-2">{a.purpose}</p>
          </div>
        ),
      },
      {
        key: 'legalBasis',
        header: t('treatmentActivities.fields.legalBasis'),
        render: (a) =>
          a.legal_basis ? (
            <Badge tone="brand">{a.legal_basis}</Badge>
          ) : (
            <span className="text-xs text-ink-400">—</span>
          ),
      },
      {
        key: 'department',
        header: t('treatmentActivities.fields.department'),
        render: (a) => {
          if (!a.department_id) return <span className="text-xs text-ink-400">—</span>
          const dept = deptById.get(a.department_id)
          return (
            <span className="text-sm text-ink-100">
              {dept?.name ?? `#${a.department_id}`}
            </span>
          )
        },
      },
      {
        key: 'crossBorder',
        header: t('treatmentActivities.fields.isCrossBorder'),
        render: (a) => (
          <Badge tone={a.is_cross_border ? 'warning' : 'neutral'}>
            {a.is_cross_border ? t('common.yes') : t('common.no')}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: t('treatmentActivities.fields.status'),
        render: (a) => <StatusBadge status={a.status} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (a) => (
          <div className="flex items-center justify-end gap-2">
            {a.status === 'DRAFT' && (
              <IconButton
                label={t('common.next')}
                icon={<StepForward className="h-4 w-4" />}
                variant="secondary"
                onClick={() => continueWizard(a)}
              />
            )}
            <IconButton
              label={t('common.edit')}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => setEditing(a)}
            />
            <IconButton
              label={t('common.delete')}
              icon={<Trash2 className="h-4 w-4" />}
              variant="danger"
              loading={busyId === a.id}
              onClick={() => handleDelete(a)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyId, deptById]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('treatmentActivities.title')}
        description={t('treatmentActivities.description')}
        actions={
          <IconButton
            label={t('treatmentActivities.create')}
            icon={<ClipboardPlus className="h-5 w-5" />}
            variant="primary"
            size="md"
            onClick={startNewWizard}
          />
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Select
            label={t('treatmentActivities.filterStatus')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS(t)}
            className="sm:w-64"
          />
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={() => load()}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<TreatmentActivity>
          columns={columns}
          rows={items}
          rowKey={(a) => a.id}
          loading={loading}
          error={error && !loading ? error : null}
          emptyTitle={t('treatmentActivities.empty')}
          emptyDescription={t('treatmentActivities.emptyHint')}
          emptyAction={<Button onClick={startNewWizard}>{t('treatmentActivities.create')}</Button>}
        />
      </GlassPanel>

      <WizardModal
        open={wizardOpen}
        initial={wizardActivity}
        departments={departments}
        onClose={() => setWizardOpen(false)}
        onCompleted={() => {
          setWizardOpen(false)
          setSuccess(t('treatmentActivities.wizard.finalized'))
          load()
        }}
      />

      <EditModal
        activity={editing}
        departments={departments}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          setSuccess(t('treatmentActivities.wizard.stepSaved'))
          load()
        }}
      />
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface WizardModalProps {
  open: boolean
  initial: TreatmentActivity | null
  departments: Department[]
  onClose: () => void
  onCompleted: () => void
}

interface Step1 {
  name: string
  purpose: string
  department_id: string
}

interface Step2 {
  legal_basis: string
  personal_data_types: string
  data_subjects: string
}

interface Step3 {
  is_cross_border: boolean
  destination_countries: string
  processor_name: string
  processor_country: string
}

function WizardModal({
  open,
  initial,
  departments,
  onClose,
  onCompleted,
}: WizardModalProps) {
  const { t } = useTranslation()
  const totalSteps = 4
  const [step, setStep] = useState(1)
  const [s1, setS1] = useState<Step1>({ name: '', purpose: '', department_id: '' })
  const [s2, setS2] = useState<Step2>({
    legal_basis: '',
    personal_data_types: '',
    data_subjects: '',
  })
  const [s3, setS3] = useState<Step3>({
    is_cross_border: false,
    destination_countries: '',
    processor_name: '',
    processor_country: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync local form when modal opens or initial activity changes
  useEffect(() => {
    if (!open) return
    setError('')
    if (initial) {
      setS1({
        name: initial.name ?? '',
        purpose: initial.purpose ?? '',
        department_id: initial.department_id ? String(initial.department_id) : '',
      })
      setS2({
        legal_basis: initial.legal_basis ?? '',
        personal_data_types: (initial.personal_data_types ?? []).join(', '),
        data_subjects: (initial.data_subjects ?? []).join(', '),
      })
      setS3({
        is_cross_border: initial.is_cross_border ?? false,
        destination_countries: (initial.destination_countries ?? []).join(', '),
        processor_name: initial.processor_name ?? '',
        processor_country: initial.processor_country ?? '',
      })
      setStep(initial.legal_basis ? 3 : 2)
    } else {
      setS1({ name: '', purpose: '', department_id: '' })
      setS2({ legal_basis: '', personal_data_types: '', data_subjects: '' })
      setS3({
        is_cross_border: false,
        destination_countries: '',
        processor_name: '',
        processor_country: '',
      })
      setStep(1)
    }
  }, [open, initial])

  function parseList(input: string): string[] {
    return input
      .split(/[,\n;]/)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  function validateCurrentStep() {
    if (step === 1 && (!s1.name.trim() || !s1.purpose.trim())) {
      setError(t('common.error'))
      return false
    }
    if (step === 2 && !s2.legal_basis.trim()) {
      setError(t('common.error'))
      return false
    }
    return true
  }

  async function submitStep(e?: FormEvent) {
    e?.preventDefault()
    setError('')
    if (step < 4) {
      if (!validateCurrentStep()) return
      setStep((s) => Math.min(4, s + 1))
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: s1.name,
        purpose: s1.purpose,
        legal_basis: s2.legal_basis,
        personal_data_types: parseList(s2.personal_data_types),
        data_subjects: parseList(s2.data_subjects),
        is_cross_border: s3.is_cross_border,
        destination_countries: s3.is_cross_border ? parseList(s3.destination_countries) : [],
        processor_name: s3.processor_name || null,
        processor_country: s3.processor_country || null,
        department_id: s1.department_id ? Number(s1.department_id) : null,
        status: 'ACTIVE',
      }
      if (initial) {
        await updateTreatmentActivity(initial.id, payload)
      } else {
        await createTreatmentActivity(payload)
      }
      onCompleted()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  const deptOptions = useMemo(
    () => [
      { value: '', label: t('common.optional') },
      ...departments.map((d) => ({ value: String(d.id), label: d.name })),
    ],
    [t, departments]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('treatmentActivities.wizard.title')}
      description={t('treatmentActivities.wizard.stepLabel', {
        current: step,
        total: totalSteps,
      })}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {step > 1 && step < 4 && (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={submitting}
            >
              {t('common.previous')}
            </Button>
          )}
          <Button onClick={() => submitStep()} loading={submitting}>
            {step < 4
              ? t('common.next')
              : t('treatmentActivities.wizard.finalize')}
          </Button>
        </>
      }
    >
      <ol className="flex items-center gap-2 text-xs mb-4">
        {[1, 2, 3, 4].map((n) => (
          <li
            key={n}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              n <= step ? 'bg-brand-500' : 'bg-slate-200'
            )}
          />
        ))}
      </ol>

      <form onSubmit={submitStep} className="space-y-4">
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-ink-300">{t('treatmentActivities.wizard.step1Hint')}</p>
            <Input
              label={t('treatmentActivities.fields.name')}
              required
              value={s1.name}
              onChange={(e) => setS1({ ...s1, name: e.target.value })}
            />
            <Textarea
              label={t('treatmentActivities.fields.purpose')}
              required
              value={s1.purpose}
              onChange={(e) => setS1({ ...s1, purpose: e.target.value })}
              rows={3}
            />
            <Select
              label={t('treatmentActivities.fields.department')}
              value={s1.department_id}
              onChange={(e) => setS1({ ...s1, department_id: e.target.value })}
              options={deptOptions}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-ink-300">{t('treatmentActivities.wizard.step2Hint')}</p>
            <Input
              label={t('treatmentActivities.fields.legalBasis')}
              required
              value={s2.legal_basis}
              onChange={(e) => setS2({ ...s2, legal_basis: e.target.value })}
              hint="e.g. CONSENT, CONTRACT, LEGAL_OBLIGATION"
            />
            <Textarea
              label={t('treatmentActivities.fields.dataTypes')}
              value={s2.personal_data_types}
              onChange={(e) => setS2({ ...s2, personal_data_types: e.target.value })}
              hint={t('treatmentActivities.csvHelp')}
              rows={2}
            />
            <Textarea
              label={t('treatmentActivities.fields.dataSubjects')}
              value={s2.data_subjects}
              onChange={(e) => setS2({ ...s2, data_subjects: e.target.value })}
              hint={t('treatmentActivities.csvHelp')}
              rows={2}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-ink-300">{t('treatmentActivities.wizard.step3Hint')}</p>
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={s3.is_cross_border}
                onChange={(e) => setS3({ ...s3, is_cross_border: e.target.checked })}
              />
              {t('treatmentActivities.fields.isCrossBorder')}
            </label>
            <Textarea
              label={t('treatmentActivities.fields.destinationCountries')}
              value={s3.destination_countries}
              onChange={(e) => setS3({ ...s3, destination_countries: e.target.value })}
              hint={t('treatmentActivities.csvHelp')}
              disabled={!s3.is_cross_border}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('treatmentActivities.fields.processorName')}
                value={s3.processor_name}
                onChange={(e) => setS3({ ...s3, processor_name: e.target.value })}
              />
              <Input
                label={t('treatmentActivities.fields.processorCountry')}
                value={s3.processor_country}
                onChange={(e) => setS3({ ...s3, processor_country: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-xs text-ink-300">{t('treatmentActivities.wizard.step4Hint')}</p>
            <ReviewLine label={t('treatmentActivities.fields.name')} value={s1.name} />
            <ReviewLine label={t('treatmentActivities.fields.purpose')} value={s1.purpose} />
            <ReviewLine
              label={t('treatmentActivities.fields.legalBasis')}
              value={s2.legal_basis || '—'}
            />
            <ReviewLine
              label={t('treatmentActivities.fields.dataTypes')}
              value={parseList(s2.personal_data_types).join(', ') || '—'}
            />
            <ReviewLine
              label={t('treatmentActivities.fields.dataSubjects')}
              value={parseList(s2.data_subjects).join(', ') || '—'}
            />
            <ReviewLine
              label={t('treatmentActivities.fields.isCrossBorder')}
              value={s3.is_cross_border ? t('common.yes') : t('common.no')}
            />
            {s3.is_cross_border && (
              <ReviewLine
                label={t('treatmentActivities.fields.destinationCountries')}
                value={parseList(s3.destination_countries).join(', ') || '—'}
              />
            )}
          </div>
        )}

        {error && <AlertBox tone="danger">{error}</AlertBox>}
      </form>
    </Modal>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-sm py-1 border-b border-slate-100">
      <span className="text-xs uppercase text-ink-400">{label}</span>
      <span className="sm:col-span-2 text-ink-100 break-words">{value}</span>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  activity: TreatmentActivity | null
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}

function EditModal({ activity, departments, onClose, onSaved }: EditModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [legalBasis, setLegalBasis] = useState('')
  const [dataTypes, setDataTypes] = useState('')
  const [subjects, setSubjects] = useState('')
  const [retentionDays, setRetentionDays] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!activity) return
    setName(activity.name ?? '')
    setPurpose(activity.purpose ?? '')
    setLegalBasis(activity.legal_basis ?? '')
    setDataTypes((activity.personal_data_types ?? []).join(', '))
    setSubjects((activity.data_subjects ?? []).join(', '))
    setRetentionDays(activity.retention_period_days ? String(activity.retention_period_days) : '')
    setDepartmentId(activity.department_id ? String(activity.department_id) : '')
    setError('')
  }, [activity])

  if (!activity) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activity) return
    setSubmitting(true)
    setError('')
    try {
      await updateTreatmentActivity(activity.id, {
        name,
        purpose,
        legal_basis: legalBasis,
        personal_data_types: dataTypes
          .split(/[,\n;]/)
          .map((p) => p.trim())
          .filter(Boolean),
        data_subjects: subjects
          .split(/[,\n;]/)
          .map((p) => p.trim())
          .filter(Boolean),
        retention_period_days: retentionDays ? Number(retentionDays) : undefined,
        department_id: departmentId ? Number(departmentId) : null,
      })
      onSaved()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!activity}
      onClose={onClose}
      title={activity.name}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label={t('treatmentActivities.fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Textarea
          label={t('treatmentActivities.fields.purpose')}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
          rows={3}
        />
        <Input
          label={t('treatmentActivities.fields.legalBasis')}
          value={legalBasis}
          onChange={(e) => setLegalBasis(e.target.value)}
        />
        <Textarea
          label={t('treatmentActivities.fields.dataTypes')}
          value={dataTypes}
          onChange={(e) => setDataTypes(e.target.value)}
          rows={2}
        />
        <Textarea
          label={t('treatmentActivities.fields.dataSubjects')}
          value={subjects}
          onChange={(e) => setSubjects(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('treatmentActivities.fields.retentionDays')}
            type="number"
            min={0}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
          />
          <Select
            label={t('treatmentActivities.fields.department')}
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={[
              { value: '', label: t('common.optional') },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />
        </div>
        {error && <AlertBox tone="danger">{error}</AlertBox>}
      </form>
    </Modal>
  )
}
