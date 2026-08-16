import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
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
        key: 'rat_code',
        header: t('treatmentActivities.fields.ratCode'),
        render: (a) =>
          a.rat_code ? (
            <code className="text-xs font-semibold text-ink-100">{a.rat_code}</code>
          ) : (
            <span className="text-xs text-ink-400">—</span>
          ),
      },
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
  area: string
}

interface Step2 {
  legal_basis: string
  legal_bases: string
  complementary_legal_bases: string
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
  const [activity, setActivity] = useState<TreatmentActivity | null>(initial)
  const [s1, setS1] = useState<Step1>({ name: '', purpose: '', department_id: '', area: '' })
  const [s2, setS2] = useState<Step2>({
    legal_basis: '',
    legal_bases: '',
    complementary_legal_bases: '',
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
  // Inicializa el formulario UNA sola vez por apertura del modal. Sin esto, cada
  // onSavedStep actualiza `initial`, re-dispara el efecto y la fórmula de "reanudar"
  // (tope en 3) revierte el setStep(4), dejando el wizard atascado en el paso 3.
  const initializedRef = useRef(false)

  // Sync local form when modal opens or initial activity changes
  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      return
    }
    if (initializedRef.current) return
    initializedRef.current = true
    setError('')
    if (initial) {
      setS1({
        name: initial.name ?? '',
        purpose: initial.purpose ?? '',
        department_id: initial.department_id ? String(initial.department_id) : '',
        area: initial.area ?? '',
      })
      setS2({
        legal_basis: initial.legal_basis ?? '',
        legal_bases: (initial.legal_bases ?? []).join(', '),
        complementary_legal_bases: (initial.complementary_legal_bases ?? []).join(', '),
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
      setActivity(null)
      setS1({ name: '', purpose: '', department_id: '', area: '' })
      setS2({
        legal_basis: '',
        legal_bases: '',
        complementary_legal_bases: '',
        personal_data_types: '',
        data_subjects: '',
      })
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
      if (step === 1) {
        if (!s1.name.trim() || !s1.purpose.trim()) {
          setError(t('treatmentActivities.wizard.validationStep1'))
          return
        }
        const created = await wizardStart({
          name: s1.name.trim(),
          purpose: s1.purpose.trim(),
          department_id: s1.department_id ? Number(s1.department_id) : null,
          area: s1.area.trim() || null,
        })
        setActivity(created)
        onSavedStep(created)
        setStep(2)
      } else if (step === 2 && activity) {
        const bases = parseList(s2.legal_bases)
        const principal = s2.legal_basis.trim() || bases[0] || ''
        if (!principal) {
          setError(t('treatmentActivities.wizard.validationStep2'))
          return
        }
        const updated = await wizardLegalBasis(activity.id, {
          legal_basis: principal,
          legal_bases: bases.length ? bases : principal ? [principal] : [],
          complementary_legal_bases: parseList(s2.complementary_legal_bases),
          personal_data_types: parseList(s2.personal_data_types),
          data_subjects: parseList(s2.data_subjects),
        })
        setActivity(updated)
        onSavedStep(updated)
        setStep(3)
      } else if (step === 3 && activity) {
        const updated = await wizardTransfers(activity.id, {
          is_cross_border: s3.is_cross_border,
          destination_countries: parseList(s3.destination_countries),
          processor_name: s3.processor_name || null,
          processor_country: s3.processor_country || null,
        })
        setActivity(updated)
        onSavedStep(updated)
        setStep(4)
      } else if (step === 4 && activity) {
        await wizardFinalize(activity.id)
        onCompleted()
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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('treatmentActivities.fields.area')}
                value={s1.area}
                onChange={(e) => setS1({ ...s1, area: e.target.value })}
                hint={t('treatmentActivities.areaHint')}
              />
              <Select
                label={t('treatmentActivities.fields.department')}
                value={s1.department_id}
                onChange={(e) => setS1({ ...s1, department_id: e.target.value })}
                options={deptOptions}
              />
            </div>
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
              label={t('treatmentActivities.fields.legalBases')}
              value={s2.legal_bases}
              onChange={(e) => setS2({ ...s2, legal_bases: e.target.value })}
              hint={t('treatmentActivities.legalBasesHint')}
              rows={2}
            />
            <Textarea
              label={t('treatmentActivities.fields.complementaryLegalBases')}
              value={s2.complementary_legal_bases}
              onChange={(e) => setS2({ ...s2, complementary_legal_bases: e.target.value })}
              hint={t('treatmentActivities.csvHelp')}
              rows={2}
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

  interface EditState {
    name: string
    purpose: string
    area: string
    operational_owner: string
    legal_basis: string
    legal_bases: string
    complementary_legal_bases: string
    personal_data_types: string
    data_categories: string
    data_subjects: string
    data_origin: string
    treatment_operations: string
    recipients: string
    processors: string
    system_platform: string
    retention_days: string
    department_id: string
    technical_measures: string
    organizational_measures: string
    physical_measures: string
    legal_measures: string
    mtge_score: string
    mtge_result: string
    uses_profiling: boolean
    uses_ai: boolean
    automated_decision: boolean
    requires_dpia: boolean
    has_special_data: boolean
    involves_minors: boolean
  }

  const EMPTY: EditState = {
    name: '',
    purpose: '',
    area: '',
    operational_owner: '',
    legal_basis: '',
    legal_bases: '',
    complementary_legal_bases: '',
    personal_data_types: '',
    data_categories: '',
    data_subjects: '',
    data_origin: '',
    treatment_operations: '',
    recipients: '',
    processors: '',
    system_platform: '',
    retention_days: '',
    department_id: '',
    technical_measures: '',
    organizational_measures: '',
    physical_measures: '',
    legal_measures: '',
    mtge_score: '',
    mtge_result: '',
    uses_profiling: false,
    uses_ai: false,
    automated_decision: false,
    requires_dpia: false,
    has_special_data: false,
    involves_minors: false,
  }

  const [f, setF] = useState<EditState>(EMPTY)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!activity) return
    setF({
      name: activity.name ?? '',
      purpose: activity.purpose ?? '',
      area: activity.area ?? '',
      operational_owner: activity.operational_owner ?? '',
      legal_basis: activity.legal_basis ?? '',
      legal_bases: (activity.legal_bases ?? []).join(', '),
      complementary_legal_bases: (activity.complementary_legal_bases ?? []).join(', '),
      personal_data_types: (activity.personal_data_types ?? []).join(', '),
      data_categories: (activity.data_categories ?? []).join(', '),
      data_subjects: (activity.data_subjects ?? []).join(', '),
      data_origin: activity.data_origin ?? '',
      treatment_operations: (activity.treatment_operations ?? []).join(', '),
      recipients: (activity.recipients ?? []).join(', '),
      processors: (activity.processors ?? []).join(', '),
      system_platform: activity.system_platform ?? '',
      retention_days: activity.retention_period_days ? String(activity.retention_period_days) : '',
      department_id: activity.department_id ? String(activity.department_id) : '',
      technical_measures: activity.technical_measures ?? '',
      organizational_measures: activity.organizational_measures ?? '',
      physical_measures: activity.physical_measures ?? '',
      legal_measures: activity.legal_measures ?? '',
      mtge_score: activity.mtge_score != null ? String(activity.mtge_score) : '',
      mtge_result: activity.mtge_result ?? '',
      uses_profiling: activity.uses_profiling ?? false,
      uses_ai: activity.uses_ai ?? false,
      automated_decision: activity.automated_decision ?? false,
      requires_dpia: activity.requires_dpia ?? false,
      has_special_data: activity.has_special_data ?? false,
      involves_minors: activity.involves_minors ?? false,
    })
    setError('')
  }, [activity])

  if (!activity) return null

  function parseList(input: string): string[] {
    return input
      .split(/[,\n;]/)
      .map((p) => p.trim())
      .filter(Boolean)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activity) return
    setSubmitting(true)
    setError('')
    try {
      const bases = parseList(f.legal_bases)
      const principal = f.legal_basis.trim() || bases[0] || ''
      await updateTreatmentActivity(activity.id, {
        name: f.name,
        purpose: f.purpose,
        area: f.area || null,
        operational_owner: f.operational_owner || null,
        legal_basis: principal,
        legal_bases: bases.length ? bases : principal ? [principal] : [],
        complementary_legal_bases: parseList(f.complementary_legal_bases),
        personal_data_types: parseList(f.personal_data_types),
        data_categories: parseList(f.data_categories),
        data_subjects: parseList(f.data_subjects),
        data_origin: f.data_origin || null,
        treatment_operations: parseList(f.treatment_operations),
        recipients: parseList(f.recipients),
        processors: parseList(f.processors),
        system_platform: f.system_platform || null,
        retention_period_days: f.retention_days ? Number(f.retention_days) : undefined,
        department_id: f.department_id ? Number(f.department_id) : null,
        technical_measures: f.technical_measures || null,
        organizational_measures: f.organizational_measures || null,
        physical_measures: f.physical_measures || null,
        legal_measures: f.legal_measures || null,
        mtge_score: f.mtge_score ? Number(f.mtge_score) : null,
        mtge_result: f.mtge_result || null,
        uses_profiling: f.uses_profiling,
        uses_ai: f.uses_ai,
        automated_decision: f.automated_decision,
        requires_dpia: f.requires_dpia,
        has_special_data: f.has_special_data,
        involves_minors: f.involves_minors,
      })
      onSaved()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  const set = (patch: Partial<EditState>) => setF((prev) => ({ ...prev, ...patch }))

  const flags: Array<{ key: keyof EditState; label: string }> = [
    { key: 'uses_profiling', label: t('treatmentActivities.fields.usesProfiling') },
    { key: 'uses_ai', label: t('treatmentActivities.fields.usesAi') },
    { key: 'automated_decision', label: t('treatmentActivities.fields.automatedDecision') },
    { key: 'requires_dpia', label: t('treatmentActivities.fields.requiresDpia') },
    { key: 'has_special_data', label: t('treatmentActivities.fields.hasSpecialData') },
    { key: 'involves_minors', label: t('treatmentActivities.fields.involvesMinors') },
  ]

  return (
    <Modal
      open={!!activity}
      onClose={onClose}
      title={activity.rat_code ? `${activity.rat_code} · ${activity.name}` : activity.name}
      size="xl"
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionTitle>{t('treatmentActivities.section.general')}</SectionTitle>
        <Input
          label={t('treatmentActivities.fields.name')}
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
          required
        />
        <Textarea
          label={t('treatmentActivities.fields.purpose')}
          value={f.purpose}
          onChange={(e) => set({ purpose: e.target.value })}
          required
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('treatmentActivities.fields.area')}
            value={f.area}
            onChange={(e) => set({ area: e.target.value })}
            hint={t('treatmentActivities.areaHint')}
          />
          <Input
            label={t('treatmentActivities.fields.operationalOwner')}
            value={f.operational_owner}
            onChange={(e) => set({ operational_owner: e.target.value })}
          />
        </div>

        <SectionTitle>{t('treatmentActivities.section.legalBases')}</SectionTitle>
        <Input
          label={t('treatmentActivities.fields.legalBasis')}
          value={f.legal_basis}
          onChange={(e) => set({ legal_basis: e.target.value })}
          hint="e.g. CONTRACT, LEGAL_OBLIGATION"
        />
        <Textarea
          label={t('treatmentActivities.fields.legalBases')}
          value={f.legal_bases}
          onChange={(e) => set({ legal_bases: e.target.value })}
          hint={t('treatmentActivities.legalBasesHint')}
          rows={2}
        />
        <Textarea
          label={t('treatmentActivities.fields.complementaryLegalBases')}
          value={f.complementary_legal_bases}
          onChange={(e) => set({ complementary_legal_bases: e.target.value })}
          hint={t('treatmentActivities.csvHelp')}
          rows={2}
        />

        <SectionTitle>{t('treatmentActivities.section.data')}</SectionTitle>
        <Textarea
          label={t('treatmentActivities.fields.dataSubjects')}
          value={f.data_subjects}
          onChange={(e) => set({ data_subjects: e.target.value })}
          rows={2}
        />
        <Textarea
          label={t('treatmentActivities.fields.dataTypes')}
          value={f.personal_data_types}
          onChange={(e) => set({ personal_data_types: e.target.value })}
          rows={2}
        />
        <Textarea
          label={t('treatmentActivities.fields.dataCategories')}
          value={f.data_categories}
          onChange={(e) => set({ data_categories: e.target.value })}
          hint={t('treatmentActivities.csvHelp')}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('treatmentActivities.fields.dataOrigin')}
            value={f.data_origin}
            onChange={(e) => set({ data_origin: e.target.value })}
          />
          <Input
            label={t('treatmentActivities.fields.treatmentOperations')}
            value={f.treatment_operations}
            onChange={(e) => set({ treatment_operations: e.target.value })}
            hint={t('treatmentActivities.csvHelp')}
          />
        </div>

        <SectionTitle>{t('treatmentActivities.section.flags')}</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {flags.map((flag) => (
            <label key={flag.key} className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={f[flag.key] as boolean}
                onChange={(e) => set({ [flag.key]: e.target.checked } as Partial<EditState>)}
              />
              {flag.label}
            </label>
          ))}
        </div>

        <SectionTitle>{t('treatmentActivities.section.recipients')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Textarea
            label={t('treatmentActivities.fields.recipients')}
            value={f.recipients}
            onChange={(e) => set({ recipients: e.target.value })}
            hint={t('treatmentActivities.csvHelp')}
            rows={2}
          />
          <Textarea
            label={t('treatmentActivities.fields.processors')}
            value={f.processors}
            onChange={(e) => set({ processors: e.target.value })}
            hint={t('treatmentActivities.csvHelp')}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('treatmentActivities.fields.systemPlatform')}
            value={f.system_platform}
            onChange={(e) => set({ system_platform: e.target.value })}
          />
          <Input
            label={t('treatmentActivities.fields.retentionDays')}
            type="number"
            min={0}
            value={f.retention_days}
            onChange={(e) => set({ retention_days: e.target.value })}
          />
        </div>
        <Select
          label={t('treatmentActivities.fields.department')}
          value={f.department_id}
          onChange={(e) => set({ department_id: e.target.value })}
          options={[
            { value: '', label: t('common.optional') },
            ...departments.map((d) => ({ value: String(d.id), label: d.name })),
          ]}
        />

        <SectionTitle>{t('treatmentActivities.section.measures')}</SectionTitle>
        <Textarea
          label={t('treatmentActivities.fields.technicalMeasures')}
          value={f.technical_measures}
          onChange={(e) => set({ technical_measures: e.target.value })}
          rows={2}
        />
        <Textarea
          label={t('treatmentActivities.fields.organizationalMeasures')}
          value={f.organizational_measures}
          onChange={(e) => set({ organizational_measures: e.target.value })}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Textarea
            label={t('treatmentActivities.fields.physicalMeasures')}
            value={f.physical_measures}
            onChange={(e) => set({ physical_measures: e.target.value })}
            rows={2}
          />
          <Textarea
            label={t('treatmentActivities.fields.legalMeasures')}
            value={f.legal_measures}
            onChange={(e) => set({ legal_measures: e.target.value })}
            rows={2}
          />
        </div>

        <SectionTitle>{t('treatmentActivities.section.mtge')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('treatmentActivities.fields.mtgeScore')}
            type="number"
            step="0.5"
            value={f.mtge_score}
            onChange={(e) => set({ mtge_score: e.target.value })}
          />
          <Input
            label={t('treatmentActivities.fields.mtgeResult')}
            value={f.mtge_result}
            onChange={(e) => set({ mtge_result: e.target.value })}
          />
        </div>

        {error && <AlertBox tone="danger">{error}</AlertBox>}
      </form>
    </Modal>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
      {children}
    </h4>
  )
}

