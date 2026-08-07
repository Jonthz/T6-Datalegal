import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardPlus, Pencil, RefreshCw } from 'lucide-react'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  IconButton,
  KPICard,
  Modal,
  PageHeader,
  RiskBadge,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from '../components/ui'
import type { DataTableColumn, RiskLevel } from '../components/ui'
import {
  createRiskAssessment,
  getQuestionnaire,
  getRiskDashboard,
  listRiskAssessments,
  updateRiskAssessment,
} from '../api/riskAssessments'
import { listTreatmentActivities } from '../api/treatmentActivities'
import { getKPIs } from '../api/reports'
import type {
  QuestionnaireSchema,
  ReportKPIs,
  RiskAssessment,
  RiskDashboard,
  TreatmentActivity,
} from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatNumber, formatPercent } from '../lib/format'

interface WizardState {
  treatmentActivityId: string
  responses: Record<string, boolean | null>
  notes: string
}

const EMPTY_WIZARD: WizardState = {
  treatmentActivityId: '',
  responses: {},
  notes: '',
}

function riskTone(level: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (level === 'LOW') return 'success'
  if (level === 'MEDIUM') return 'warning'
  if (level === 'HIGH' || level === 'CRITICAL') return 'danger'
  return 'neutral'
}

export default function RiskAssessmentsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<RiskAssessment[]>([])
  const [activities, setActivities] = useState<TreatmentActivity[]>([])
  const [dashboard, setDashboard] = useState<RiskDashboard | null>(null)
  const [kpis, setKpis] = useState<ReportKPIs | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireSchema | null>(null)
  const [levelFilter, setLevelFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [creating, setCreating] = useState(false)
  const [wizard, setWizard] = useState<WizardState>(EMPTY_WIZARD)
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const [wizardError, setWizardError] = useState('')

  const [editing, setEditing] = useState<RiskAssessment | null>(null)
  const [editResponses, setEditResponses] = useState<Record<string, boolean | null>>({})
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState('COMPLETED')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [list, activityList, dash, kpiData, schema] = await Promise.all([
        listRiskAssessments(levelFilter ? { risk_level: levelFilter } : undefined),
        listTreatmentActivities({ limit: 200 }).catch(() => [] as TreatmentActivity[]),
        getRiskDashboard().catch(() => null),
        getKPIs().catch(() => null),
        getQuestionnaire().catch(() => null),
      ])
      setItems(list)
      setActivities(activityList)
      setDashboard(dash)
      setKpis(kpiData)
      setQuestionnaire(schema)
    } catch (err) {
      setError(extractErrorMessage(err, t('riskAssessments.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [levelFilter, t])

  useEffect(() => {
    load()
  }, [load])

  const activityById = useMemo(() => {
    const map = new Map<number, TreatmentActivity>()
    activities.forEach((a) => map.set(a.id, a))
    return map
  }, [activities])

  function openCreate() {
    setWizard(EMPTY_WIZARD)
    setWizardError('')
    setCreating(true)
  }

  function openEdit(assessment: RiskAssessment) {
    setEditing(assessment)
    setEditResponses({ ...assessment.responses })
    setEditNotes(assessment.notes ?? '')
    setEditStatus(assessment.status || 'COMPLETED')
    setEditError('')
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setWizardError('')
    if (!wizard.treatmentActivityId) {
      setWizardError(t('riskAssessments.selectActivity'))
      return
    }
    const responses: Record<string, boolean> = {}
    for (const q of questionnaire?.questions ?? []) {
      const value = wizard.responses[q.id]
      if (value === null || value === undefined) {
        setWizardError(t('common.error'))
        return
      }
      responses[q.id] = value
    }
    if (responses['q1'] === false) {
      setWizardError(t('riskAssessments.questionnaire.gatewayBlocked'))
      return
    }
    setWizardSubmitting(true)
    try {
      await createRiskAssessment({
        treatment_activity_id: Number(wizard.treatmentActivityId),
        responses,
        notes: wizard.notes,
      })
      setSuccess(t('riskAssessments.createSuccess'))
      setCreating(false)
      setWizard(EMPTY_WIZARD)
      await load()
    } catch (err) {
      setWizardError(extractErrorMessage(err, t('common.error')))
    } finally {
      setWizardSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setEditError('')
    const responses: Record<string, boolean> = {}
    for (const q of questionnaire?.questions ?? []) {
      const value = editResponses[q.id]
      if (value === null || value === undefined) {
        setEditError(t('common.error'))
        return
      }
      responses[q.id] = value
    }
    if (responses['q1'] === false) {
      setEditError(t('riskAssessments.questionnaire.gatewayBlocked'))
      return
    }
    setEditSubmitting(true)
    try {
      await updateRiskAssessment(editing.id, {
        responses,
        notes: editNotes,
        status: editStatus,
      })
      setSuccess(t('riskAssessments.updateSuccess'))
      setEditing(null)
      await load()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  const columns = useMemo<DataTableColumn<RiskAssessment>[]>(
    () => [
      {
        key: 'activity',
        header: t('riskAssessments.fields.activity'),
        render: (a) => {
          const activity = activityById.get(a.treatment_activity_id)
          return (
            <div className="min-w-0">
              <p className="font-medium text-ink-50 truncate">
                {activity?.name ?? `#${a.treatment_activity_id}`}
              </p>
              <p className="text-xs text-ink-400 truncate">
                {activity?.purpose ?? ''}
              </p>
            </div>
          )
        },
      },
      {
        key: 'level',
        header: t('riskAssessments.fields.level'),
        render: (a) => <RiskBadge level={a.risk_level as RiskLevel} />,
      },
      {
        key: 'score',
        header: t('riskAssessments.fields.score'),
        render: (a) => (
          <span className="font-medium text-ink-100">
            {t('riskAssessments.scoreLabel', { score: a.risk_score })}
          </span>
        ),
      },
      {
        key: 'pi',
        header: `${t('riskAssessments.fields.probability')} × ${t('riskAssessments.fields.impact')}`,
        render: (a) => (
          <span className="text-xs text-ink-200">
            {a.probability} × {a.impact}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('riskAssessments.fields.status'),
        render: (a) => <StatusBadge status={a.status} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (a) => (
          <IconButton
            label={t('common.edit')}
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openEdit(a)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, activityById]
  )

  const levelOptions = [
    { value: '', label: t('riskAssessments.filters.all') },
    { value: 'LOW', label: 'LOW' },
    { value: 'MEDIUM', label: 'MEDIUM' },
    { value: 'HIGH', label: 'HIGH' },
  ]

  const activityOptions = useMemo(
    () => activities.map((a) => ({ value: String(a.id), label: a.name })),
    [activities]
  )

  const listPanel = (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="sm:w-56">
            <Select
              label={t('riskAssessments.filters.level')}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              options={levelOptions}
            />
          </div>
          <div className="flex-1 sm:flex sm:justify-end">
            <Button
              onClick={openCreate}
              disabled={activities.length === 0}
            >
              {t('riskAssessments.create')}
            </Button>
          </div>
        </div>
        {activities.length === 0 && (
          <p className="text-xs text-ink-400 mt-2">
            {t('riskAssessments.noActivities')}
          </p>
        )}
      </GlassCard>
      <GlassPanel>
        <DataTable<RiskAssessment>
          columns={columns}
          rows={items}
          rowKey={(a) => a.id}
          loading={loading}
          emptyTitle={t('riskAssessments.empty')}
          emptyDescription={t('riskAssessments.emptyHint')}
          emptyAction={
            <Button onClick={openCreate} disabled={activities.length === 0}>
              {t('riskAssessments.create')}
            </Button>
          }
        />
      </GlassPanel>
    </div>
  )

  const dashboardPanel = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          loading={loading}
          label={t('riskAssessments.dashboard.total')}
          value={dashboard ? formatNumber(dashboard.total) : '—'}
          hint={t('riskAssessments.dashboard.totalHint')}
        />
        <KPICard
          loading={loading}
          label={t('riskAssessments.dashboard.avg')}
          value={dashboard ? dashboard.avg_score.toFixed(2) : '—'}
          hint={t('riskAssessments.dashboard.avgHint')}
        />
        <KPICard
          loading={loading}
          label={t('riskAssessments.dashboard.registeredActivities')}
          value={
            kpis?.pct_activities_active !== undefined
              ? formatPercent(kpis.pct_activities_active, 0)
              : '—'
          }
          hint={t('riskAssessments.dashboard.registeredHint')}
        />
        <KPICard
          loading={loading}
          label={t('riskAssessments.dashboard.breachesReported')}
          value={
            kpis?.reported_breaches !== undefined
              ? formatNumber(Number(kpis.reported_breaches))
              : '—'
          }
          hint={t('riskAssessments.dashboard.breachesHint')}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StoplightCard
          tone="success"
          label={t('riskAssessments.dashboard.green')}
          hint={t('riskAssessments.dashboard.greenHint')}
          value={dashboard?.green ?? 0}
          total={dashboard?.total ?? 0}
        />
        <StoplightCard
          tone="warning"
          label={t('riskAssessments.dashboard.yellow')}
          hint={t('riskAssessments.dashboard.yellowHint')}
          value={dashboard?.yellow ?? 0}
          total={dashboard?.total ?? 0}
        />
        <StoplightCard
          tone="danger"
          label={t('riskAssessments.dashboard.red')}
          hint={t('riskAssessments.dashboard.redHint')}
          value={dashboard?.red ?? 0}
          total={dashboard?.total ?? 0}
        />
      </div>
      <GlassCard>
        <h3 className="text-sm font-semibold text-ink-50 mb-3">
          {t('riskAssessments.dashboard.high')}
        </h3>
        <p className="text-xs text-ink-400 mb-3">
          {t('riskAssessments.dashboard.highHint')}
        </p>
        {dashboard && dashboard.high_risk_activities.length > 0 ? (
          <ul className="space-y-2">
            {dashboard.high_risk_activities.map((entry) => {
              const activity = activityById.get(entry.treatment_activity_id)
              return (
                <li
                  key={entry.assessment_id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-50 truncate">
                      {activity?.name ?? `Activity #${entry.treatment_activity_id}`}
                    </p>
                    <p className="text-xs text-ink-400 truncate">
                      {activity?.purpose ?? ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RiskBadge level={entry.risk_level as RiskLevel} />
                    <Badge tone="danger">
                      {t('riskAssessments.scoreLabel', { score: entry.risk_score })}
                    </Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-300">{t('riskAssessments.dashboard.noHighRisk')}</p>
        )}
      </GlassCard>
    </div>
  )

  const questions = questionnaire?.questions ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('riskAssessments.title')}
        description={t('riskAssessments.description')}
        actions={
          <div className="flex items-center gap-2">
            <IconButton
              label={t('common.refresh')}
              icon={<RefreshCw className="h-4 w-4" />}
              variant="secondary"
              size="md"
              onClick={() => load()}
            />
            <IconButton
              label={t('riskAssessments.create')}
              icon={<ClipboardPlus className="h-5 w-5" />}
              variant="primary"
              size="md"
              disabled={activities.length === 0}
              onClick={openCreate}
            />
          </div>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <Tabs
        tabs={[
          {
            id: 'list',
            label: t('riskAssessments.tabs.list'),
            content: listPanel,
          },
          {
            id: 'dashboard',
            label: t('riskAssessments.tabs.dashboard'),
            content: dashboardPanel,
          },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('riskAssessments.create')}
        description={t('riskAssessments.questionnaire.description')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={wizardSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label={t('riskAssessments.fields.activity')}
            placeholder={t('riskAssessments.selectActivity')}
            required
            value={wizard.treatmentActivityId}
            onChange={(e) =>
              setWizard({ ...wizard, treatmentActivityId: e.target.value })
            }
            options={activityOptions}
          />

          <div className="space-y-2">
            {questions.length === 0 && (
              <p className="text-xs text-ink-400">
                {t('riskAssessments.questionnaire.loadFailed')}
              </p>
            )}
            {questions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q.text}
                gateway={q.is_gateway}
                value={wizard.responses[q.id] ?? null}
                onChange={(value) =>
                  setWizard({
                    ...wizard,
                    responses: { ...wizard.responses, [q.id]: value },
                  })
                }
              />
            ))}
          </div>

          <Textarea
            label={t('riskAssessments.fields.notes')}
            value={wizard.notes}
            onChange={(e) => setWizard({ ...wizard, notes: e.target.value })}
            rows={3}
          />

          {wizardError && <AlertBox tone="danger">{wizardError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t('riskAssessments.edit')}
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
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge tone="brand">
                {activityById.get(editing.treatment_activity_id)?.name ??
                  `Activity #${editing.treatment_activity_id}`}
              </Badge>
              <RiskBadge level={editing.risk_level as RiskLevel} />
              <Badge tone={riskTone(editing.risk_level)}>
                {t('riskAssessments.scoreLabel', { score: editing.risk_score })}
              </Badge>
            </div>
            <div className="space-y-2">
              {questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q.text}
                  gateway={q.is_gateway}
                  value={editResponses[q.id] ?? null}
                  onChange={(value) =>
                    setEditResponses({ ...editResponses, [q.id]: value })
                  }
                />
              ))}
            </div>
            <Textarea
              label={t('riskAssessments.fields.notes')}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
            />
            <Select
              label={t('riskAssessments.fields.status')}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              options={[
                { value: 'DRAFT', label: 'DRAFT' },
                { value: 'COMPLETED', label: 'COMPLETED' },
                { value: 'ARCHIVED', label: 'ARCHIVED' },
              ]}
            />
            {editError && <AlertBox tone="danger">{editError}</AlertBox>}
          </form>
        )}
      </Modal>
    </div>
  )
}

function StoplightCard({
  tone,
  label,
  hint,
  value,
  total,
}: {
  tone: 'success' | 'warning' | 'danger'
  label: string
  hint: string
  value: number
  total: number
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const dotClass =
    tone === 'success'
      ? 'bg-emerald-400'
      : tone === 'warning'
        ? 'bg-amber-400'
        : 'bg-rose-400'
  const barClass =
    tone === 'success'
      ? 'bg-emerald-400/80'
      : tone === 'warning'
        ? 'bg-amber-400/80'
        : 'bg-rose-400/80'
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-300 font-medium flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
            {label}
          </p>
          <p className="text-3xl font-semibold text-ink-50 mt-1">
            {formatNumber(value)}
          </p>
          <p className="text-xs text-ink-300 mt-1">{hint}</p>
        </div>
        <Badge tone={tone}>{formatPercent(pct, 0)}</Badge>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full ${barClass}`}
          style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
        />
      </div>
    </GlassCard>
  )
}

function QuestionRow({
  question,
  gateway,
  value,
  onChange,
}: {
  question: string
  gateway?: boolean
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
      <div className="min-w-0">
        <p className="text-sm text-ink-100">{question}</p>
        {gateway && (
          <Badge tone="warning" className="mt-1">
            Gateway
          </Badge>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          size="sm"
          variant={value === true ? 'primary' : 'subtle'}
          onClick={() => onChange(true)}
          type="button"
        >
          {t('riskAssessments.questionnaire.yes')}
        </Button>
        <Button
          size="sm"
          variant={value === false ? 'danger' : 'subtle'}
          onClick={() => onChange(false)}
          type="button"
        >
          {t('riskAssessments.questionnaire.no')}
        </Button>
      </div>
    </div>
  )
}
