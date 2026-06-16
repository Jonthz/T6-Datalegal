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
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createDPIA,
  downloadDPIAPdf,
  listDPIAs,
  signDPIA,
  updateDPIA,
} from '../api/dpias'
import { listTreatmentActivities } from '../api/treatmentActivities'
import type { DPIA, TreatmentActivity } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { cn } from '../lib/cn'
import { downloadBlob, formatDateTime } from '../lib/format'
import { useAuth } from '../hooks/useAuth'

interface WizardForm {
  treatmentActivityId: string
  step1: string
  step2: string
  step3: string
}

const EMPTY_WIZARD: WizardForm = {
  treatmentActivityId: '',
  step1: '',
  step2: '',
  step3: '',
}

export default function DPIAsPage() {
  const { t } = useTranslation()
  const { auth } = useAuth()
  const isSigner = auth.role === 'DPO' || auth.role === 'SUPER_ADMIN'
  const [items, setItems] = useState<DPIA[]>([])
  const [activities, setActivities] = useState<TreatmentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [creating, setCreating] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizard, setWizard] = useState<WizardForm>(EMPTY_WIZARD)
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const [wizardError, setWizardError] = useState('')

  const [editing, setEditing] = useState<DPIA | null>(null)
  const [editStep1, setEditStep1] = useState('')
  const [editStep2, setEditStep2] = useState('')
  const [editStep3, setEditStep3] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dpias, activityList] = await Promise.all([
        listDPIAs(),
        listTreatmentActivities({ limit: 200 }).catch(() => [] as TreatmentActivity[]),
      ])
      setItems(dpias)
      setActivities(activityList)
    } catch (err) {
      setError(extractErrorMessage(err, t('dpias.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

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
    setWizardStep(1)
    setWizardError('')
    setCreating(true)
  }

  function openEdit(dpia: DPIA) {
    setEditing(dpia)
    setEditStep1(dpia.step1_description ?? '')
    setEditStep2(dpia.step2_risk_analysis ?? '')
    setEditStep3(dpia.step3_mitigations ?? '')
    setEditError('')
  }

  async function handleCreate(e?: FormEvent) {
    e?.preventDefault()
    setWizardError('')
    if (wizardStep < 4) {
      if (wizardStep === 1 && !wizard.treatmentActivityId) {
        setWizardError(t('dpias.selectActivity'))
        return
      }
      setWizardStep((s) => Math.min(4, s + 1))
      return
    }
    if (!wizard.step1.trim() || !wizard.step2.trim() || !wizard.step3.trim()) {
      setWizardError(t('dpias.wizard.validate'))
      return
    }
    setWizardSubmitting(true)
    try {
      await createDPIA({
        treatment_activity_id: Number(wizard.treatmentActivityId),
        step1_description: wizard.step1,
        step2_risk_analysis: wizard.step2,
        step3_mitigations: wizard.step3,
      })
      setSuccess(t('dpias.wizard.createSuccess'))
      setCreating(false)
      setWizard(EMPTY_WIZARD)
      setWizardStep(1)
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
    setEditSubmitting(true)
    try {
      await updateDPIA(editing.id, {
        step1_description: editStep1,
        step2_risk_analysis: editStep2,
        step3_mitigations: editStep3,
      })
      setSuccess(t('dpias.wizard.saveSuccess'))
      setEditing(null)
      await load()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleSign(dpia: DPIA) {
    if (!isSigner) {
      setError(t('dpias.permissionRequired'))
      return
    }
    if (
      !dpia.step1_description?.trim() ||
      !dpia.step2_risk_analysis?.trim() ||
      !dpia.step3_mitigations?.trim()
    ) {
      setError(t('dpias.wizard.validate'))
      return
    }
    setBusyId(dpia.id)
    setError('')
    try {
      await signDPIA(dpia.id)
      setSuccess(t('dpias.wizard.signSuccess'))
      await load()
    } catch (err) {
      const status = getStatus(err)
      if (status === 403) {
        setError(t('dpias.permissionRequired'))
      } else {
        setError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function handleDownload(dpia: DPIA) {
    setBusyId(dpia.id)
    setError('')
    try {
      const blob = await downloadDPIAPdf(dpia.id)
      downloadBlob(blob, t('dpias.pdfFilename', { id: dpia.id, version: dpia.version }))
    } catch (err) {
      const status = getStatus(err)
      if (status === 404) {
        setError(t('dpias.pdfMissing'))
      } else {
        setError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setBusyId(null)
    }
  }

  const activityOptions = useMemo(
    () => activities.map((a) => ({ value: String(a.id), label: a.name })),
    [activities]
  )

  const columns = useMemo<DataTableColumn<DPIA>[]>(
    () => [
      {
        key: 'activity',
        header: t('dpias.fields.activity'),
        render: (d) => {
          const activity = activityById.get(d.treatment_activity_id)
          return (
            <div className="min-w-0">
              <p className="font-medium text-ink-50 truncate">
                {activity?.name ?? `#${d.treatment_activity_id}`}
              </p>
              <p className="text-xs text-ink-400">
                DPIA #{d.id} · v{d.version}
              </p>
            </div>
          )
        },
      },
      {
        key: 'status',
        header: t('dpias.fields.status'),
        render: (d) => <StatusBadge status={d.status} />,
      },
      {
        key: 'signed',
        header: t('dpias.fields.signedAt'),
        render: (d) =>
          d.signed_at ? (
            <span className="text-xs text-ink-200">{formatDateTime(d.signed_at)}</span>
          ) : (
            <Badge tone="warning">Draft</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (d) => (
          <div className="flex justify-end gap-1 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
              {t('common.edit')}
            </Button>
            {d.status !== 'SIGNED' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleSign(d)}
                loading={busyId === d.id}
                disabled={!isSigner}
                title={!isSigner ? t('dpias.permissionRequired') : undefined}
              >
                {t('dpias.sign')}
              </Button>
            )}
            {d.status === 'SIGNED' && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleDownload(d)}
                loading={busyId === d.id}
              >
                {t('dpias.downloadPdf')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyId, isSigner, activityById]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dpias.title')}
        description={t('dpias.description')}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => load()}>
              {t('common.refresh')}
            </Button>
            <Button onClick={openCreate} disabled={activities.length === 0}>
              {t('dpias.create')}
            </Button>
          </>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}
      {!isSigner && (
        <AlertBox tone="info">{t('dpias.permissionRequired')}</AlertBox>
      )}

      <GlassPanel>
        <DataTable<DPIA>
          columns={columns}
          rows={items}
          rowKey={(d) => d.id}
          loading={loading}
          emptyTitle={t('dpias.empty')}
          emptyDescription={t('dpias.emptyHint')}
          emptyAction={
            <Button onClick={openCreate} disabled={activities.length === 0}>
              {t('dpias.create')}
            </Button>
          }
        />
      </GlassPanel>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('dpias.wizard.title')}
        description={t('dpias.wizard.stepLabel', { current: wizardStep, total: 4 })}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
            {wizardStep > 1 && (
              <Button
                variant="secondary"
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                disabled={wizardSubmitting}
              >
                {t('common.previous')}
              </Button>
            )}
            <Button onClick={() => handleCreate()} loading={wizardSubmitting}>
              {wizardStep < 4 ? t('common.next') : t('common.save')}
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
                n <= wizardStep ? 'bg-brand-500' : 'bg-white/10'
              )}
            />
          ))}
        </ol>

        <form onSubmit={handleCreate} className="space-y-4">
          {wizardStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-300">{t('dpias.wizard.step1Hint')}</p>
              <Select
                label={t('dpias.fields.activity')}
                placeholder={t('dpias.selectActivity')}
                required
                value={wizard.treatmentActivityId}
                onChange={(e) =>
                  setWizard({ ...wizard, treatmentActivityId: e.target.value })
                }
                options={activityOptions}
              />
              <Textarea
                label={t('dpias.fields.step1')}
                value={wizard.step1}
                onChange={(e) => setWizard({ ...wizard, step1: e.target.value })}
                placeholder={t('dpias.wizard.step1Placeholder')}
                rows={6}
              />
            </div>
          )}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-300">{t('dpias.wizard.step2Hint')}</p>
              <Textarea
                label={t('dpias.fields.step2')}
                value={wizard.step2}
                onChange={(e) => setWizard({ ...wizard, step2: e.target.value })}
                placeholder={t('dpias.wizard.step2Placeholder')}
                rows={8}
              />
            </div>
          )}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-300">{t('dpias.wizard.step3Hint')}</p>
              <Textarea
                label={t('dpias.fields.step3')}
                value={wizard.step3}
                onChange={(e) => setWizard({ ...wizard, step3: e.target.value })}
                placeholder={t('dpias.wizard.step3Placeholder')}
                rows={8}
              />
            </div>
          )}
          {wizardStep === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-300">{t('dpias.wizard.step4Hint')}</p>
              <GlassCard padded>
                <p className="text-xs uppercase text-ink-400">
                  {t('dpias.fields.activity')}
                </p>
                <p className="text-sm text-ink-100 mb-3">
                  {activityById.get(Number(wizard.treatmentActivityId))?.name ??
                    `#${wizard.treatmentActivityId}`}
                </p>
                <p className="text-xs uppercase text-ink-400 mt-2">
                  {t('dpias.fields.step1')}
                </p>
                <p className="text-sm text-ink-100 whitespace-pre-wrap">
                  {wizard.step1 || '—'}
                </p>
                <p className="text-xs uppercase text-ink-400 mt-2">
                  {t('dpias.fields.step2')}
                </p>
                <p className="text-sm text-ink-100 whitespace-pre-wrap">
                  {wizard.step2 || '—'}
                </p>
                <p className="text-xs uppercase text-ink-400 mt-2">
                  {t('dpias.fields.step3')}
                </p>
                <p className="text-sm text-ink-100 whitespace-pre-wrap">
                  {wizard.step3 || '—'}
                </p>
              </GlassCard>
            </div>
          )}
          {wizardError && <AlertBox tone="danger">{wizardError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t('dpias.edit')}
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
            <div className="flex items-center gap-3">
              <Badge tone="brand">
                {activityById.get(editing.treatment_activity_id)?.name ??
                  `Activity #${editing.treatment_activity_id}`}
              </Badge>
              <StatusBadge status={editing.status} />
              <Badge tone="neutral">v{editing.version}</Badge>
            </div>
            <Textarea
              label={t('dpias.fields.step1')}
              value={editStep1}
              onChange={(e) => setEditStep1(e.target.value)}
              rows={5}
            />
            <Textarea
              label={t('dpias.fields.step2')}
              value={editStep2}
              onChange={(e) => setEditStep2(e.target.value)}
              rows={6}
            />
            <Textarea
              label={t('dpias.fields.step3')}
              value={editStep3}
              onChange={(e) => setEditStep3(e.target.value)}
              rows={6}
            />
            {editError && <AlertBox tone="danger">{editError}</AlertBox>}
          </form>
        )}
      </Modal>
    </div>
  )
}
