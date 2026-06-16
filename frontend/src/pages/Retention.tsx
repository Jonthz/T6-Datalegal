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
  Tabs,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createRetentionPolicy,
  executeRetention,
  getExpiredUnderReview,
  listRetentionExecutionLogs,
  listRetentionPolicies,
  listRetentionRecords,
  updateRetentionPolicy,
  updateRetentionRecord,
} from '../api/retention'
import { listInformationAssets } from '../api/informationAssets'
import type {
  ExpiredUnderReviewReport,
  InformationAsset,
  RetentionExecutionLog,
  RetentionPolicy,
  RetentionRecord,
} from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDate, formatDateTime } from '../lib/format'

interface PolicyForm {
  name: string
  data_category: string
  retention_days: string
  action_on_expiry: string
  legal_basis: string
}

const EMPTY_POLICY: PolicyForm = {
  name: '',
  data_category: '',
  retention_days: '90',
  action_on_expiry: 'REVIEW',
  legal_basis: '',
}

export default function RetentionPage() {
  const { t } = useTranslation()
  const [policies, setPolicies] = useState<RetentionPolicy[]>([])
  const [records, setRecords] = useState<RetentionRecord[]>([])
  const [assets, setAssets] = useState<InformationAsset[]>([])
  const [expired, setExpired] = useState<ExpiredUnderReviewReport | null>(null)
  const [logs, setLogs] = useState<RetentionExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [policyModal, setPolicyModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null)
  const [policyForm, setPolicyForm] = useState<PolicyForm>(EMPTY_POLICY)
  const [policyError, setPolicyError] = useState('')
  const [policySubmitting, setPolicySubmitting] = useState(false)

  const [executePolicyId, setExecutePolicyId] = useState('')
  const [executing, setExecuting] = useState(false)

  const [reviewingRecord, setReviewingRecord] = useState<RetentionRecord | null>(null)
  const [reviewDecision, setReviewDecision] = useState('RETAIN')
  const [reviewRationale, setReviewRationale] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [policyList, recordList, assetList, expiredReport, logList] = await Promise.all([
        listRetentionPolicies(),
        listRetentionRecords(),
        listInformationAssets({ limit: 500 }).catch(() => [] as InformationAsset[]),
        getExpiredUnderReview(),
        listRetentionExecutionLogs(),
      ])
      setPolicies(policyList)
      setRecords(recordList)
      setAssets(assetList)
      setExpired(expiredReport)
      setLogs(logList)
    } catch (err) {
      setError(extractErrorMessage(err, t('retention.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreatePolicy() {
    setEditingPolicy(null)
    setPolicyForm(EMPTY_POLICY)
    setPolicyError('')
    setPolicyModal(true)
  }

  function openEditPolicy(policy: RetentionPolicy) {
    setEditingPolicy(policy)
    setPolicyForm({
      name: policy.name,
      data_category: policy.data_category,
      retention_days: String(policy.retention_days),
      action_on_expiry: policy.action_on_expiry || 'REVIEW',
      legal_basis: policy.legal_basis ?? '',
    })
    setPolicyError('')
    setPolicyModal(true)
  }

  async function handlePolicySubmit(e: FormEvent) {
    e.preventDefault()
    setPolicyError('')
    setPolicySubmitting(true)
    try {
      const payload = {
        name: policyForm.name,
        data_category: policyForm.data_category,
        retention_days: Number(policyForm.retention_days) || 0,
        action_on_expiry: policyForm.action_on_expiry,
        legal_basis: policyForm.legal_basis,
      }
      if (editingPolicy) {
        await updateRetentionPolicy(editingPolicy.id, payload)
        setSuccess(t('retention.policies.updateSuccess'))
      } else {
        await createRetentionPolicy(payload)
        setSuccess(t('retention.policies.createSuccess'))
      }
      setPolicyModal(false)
      await load()
    } catch (err) {
      setPolicyError(extractErrorMessage(err, t('common.error')))
    } finally {
      setPolicySubmitting(false)
    }
  }

  async function handleExecute() {
    setExecuting(true)
    setError('')
    setSuccess('')
    try {
      await executeRetention({
        policy_id: executePolicyId ? Number(executePolicyId) : null,
        run_type: 'MANUAL',
      })
      setSuccess(t('retention.execute.success'))
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, t('retention.execute.failed')))
    } finally {
      setExecuting(false)
    }
  }

  function openReview(record: RetentionRecord) {
    setReviewingRecord(record)
    setReviewDecision(record.review_decision || 'RETAIN')
    setReviewRationale(record.decision_rationale ?? '')
    setReviewError('')
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault()
    if (!reviewingRecord) return
    setReviewSubmitting(true)
    setReviewError('')
    try {
      await updateRetentionRecord(reviewingRecord.id, {
        review_decision: reviewDecision,
        decision_rationale: reviewRationale,
      })
      setSuccess(t('retention.expired.decisionSaved'))
      setReviewingRecord(null)
      await load()
    } catch (err) {
      setReviewError(extractErrorMessage(err, t('common.error')))
    } finally {
      setReviewSubmitting(false)
    }
  }

  const assetById = useMemo(() => {
    const map = new Map<number, InformationAsset>()
    assets.forEach((a) => map.set(a.id, a))
    return map
  }, [assets])

  const policyById = useMemo(() => {
    const map = new Map<number, RetentionPolicy>()
    policies.forEach((p) => map.set(p.id, p))
    return map
  }, [policies])

  const policyColumns = useMemo<DataTableColumn<RetentionPolicy>[]>(
    () => [
      {
        key: 'name',
        header: t('retention.policies.fields.name'),
        render: (p) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{p.name}</p>
            <p className="text-xs text-ink-400 truncate">{p.legal_basis || '—'}</p>
          </div>
        ),
      },
      {
        key: 'category',
        header: t('retention.policies.fields.category'),
        render: (p) => <Badge tone="brand">{p.data_category}</Badge>,
      },
      {
        key: 'days',
        header: t('retention.policies.fields.days'),
        render: (p) => <span className="text-ink-100">{p.retention_days}</span>,
      },
      {
        key: 'action',
        header: t('retention.policies.fields.action'),
        render: (p) => (
          <Badge tone={p.action_on_expiry === 'DELETE' ? 'danger' : 'info'}>
            {p.action_on_expiry}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (p) => (
          <Button size="sm" variant="ghost" onClick={() => openEditPolicy(p)}>
            {t('common.edit')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )

  const recordColumns = useMemo<DataTableColumn<RetentionRecord>[]>(
    () => [
      {
        key: 'asset',
        header: t('retention.records.fields.asset'),
        render: (r) => {
          const asset = assetById.get(r.information_asset_id)
          return (
            <span className="text-sm text-ink-100">
              {asset?.name ?? `#${r.information_asset_id}`}
            </span>
          )
        },
      },
      {
        key: 'policy',
        header: t('retention.records.fields.policy'),
        render: (r) => {
          if (!r.policy_id) return <span className="text-xs text-ink-400">—</span>
          const policy = policyById.get(r.policy_id)
          return <span className="text-sm text-ink-200">{policy?.name ?? `#${r.policy_id}`}</span>
        },
      },
      {
        key: 'expiry',
        header: t('retention.records.fields.expiry'),
        render: (r) => <span className="text-xs text-ink-200">{formatDate(r.expiry_date)}</span>,
      },
      {
        key: 'status',
        header: t('retention.records.fields.status'),
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: 'hold',
        header: t('retention.records.fields.legalHold'),
        render: (r) => (
          <Badge tone={r.legal_hold ? 'warning' : 'neutral'}>
            {r.legal_hold ? t('common.yes') : t('common.no')}
          </Badge>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, assetById, policyById]
  )

  const expiredColumns = useMemo<DataTableColumn<RetentionRecord>[]>(
    () => [
      {
        key: 'asset',
        header: t('retention.records.fields.asset'),
        render: (r) => {
          const asset = assetById.get(r.information_asset_id)
          return (
            <span className="text-sm text-ink-100">
              {asset?.name ?? `#${r.information_asset_id}`}
            </span>
          )
        },
      },
      {
        key: 'expiry',
        header: t('retention.records.fields.expiry'),
        render: (r) => <span className="text-xs text-ink-200">{formatDate(r.expiry_date)}</span>,
      },
      {
        key: 'status',
        header: t('retention.records.fields.status'),
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: 'decision',
        header: t('retention.expired.decisionLabel'),
        render: (r) =>
          r.review_decision ? (
            <Badge tone="info">{r.review_decision}</Badge>
          ) : (
            <span className="text-xs text-ink-400">—</span>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (r) => (
          <Button size="sm" variant="secondary" onClick={() => openReview(r)}>
            {t('common.viewDetails')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, assetById]
  )

  const logColumns = useMemo<DataTableColumn<RetentionExecutionLog>[]>(
    () => [
      {
        key: 'created',
        header: t('common.created'),
        render: (log) => <span className="text-xs text-ink-200">{formatDateTime(log.created_at)}</span>,
      },
      {
        key: 'policy',
        header: t('retention.records.fields.policy'),
        render: (log) =>
          log.policy_id ? (
            <span className="text-sm text-ink-200">
              {policyById.get(log.policy_id)?.name ?? `#${log.policy_id}`}
            </span>
          ) : (
            <span className="text-xs text-ink-400">All</span>
          ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (log) => <StatusBadge status={log.status} />,
      },
      {
        key: 'processed',
        header: t('retention.logs.processed'),
        render: (log) => <span className="text-ink-100">{log.records_processed}</span>,
      },
      {
        key: 'exceptions',
        header: t('retention.logs.exceptions'),
        render: (log) => (
          <span className={log.records_exceptions > 0 ? 'text-rose-200' : 'text-ink-200'}>
            {log.records_exceptions}
          </span>
        ),
      },
      {
        key: 'runType',
        header: t('retention.logs.runType'),
        render: (log) => <Badge tone="neutral">{log.run_type}</Badge>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, policyById]
  )

  const policyOptions = useMemo(
    () => [
      { value: '', label: t('retention.execute.policyAll') },
      ...policies.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [policies, t]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('retention.title')}
        description={t('retention.description')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {t('common.refresh')}
          </Button>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <Tabs
        tabs={[
          {
            id: 'policies',
            label: t('retention.tabs.policies'),
            content: (
              <GlassPanel>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-ink-50">
                    {t('retention.policies.title')}
                  </h3>
                  <Button size="sm" onClick={openCreatePolicy}>
                    {t('retention.policies.create')}
                  </Button>
                </div>
                <DataTable<RetentionPolicy>
                  columns={policyColumns}
                  rows={policies}
                  rowKey={(p) => p.id}
                  loading={loading}
                  emptyTitle={t('retention.policies.empty')}
                  emptyDescription={t('retention.policies.emptyHint')}
                  emptyAction={<Button onClick={openCreatePolicy}>{t('retention.policies.create')}</Button>}
                />
              </GlassPanel>
            ),
          },
          {
            id: 'records',
            label: t('retention.tabs.records'),
            content: (
              <GlassPanel>
                <DataTable<RetentionRecord>
                  columns={recordColumns}
                  rows={records}
                  rowKey={(r) => r.id}
                  loading={loading}
                  emptyTitle={t('retention.records.empty')}
                  emptyDescription={t('retention.records.emptyHint')}
                />
              </GlassPanel>
            ),
          },
          {
            id: 'expired',
            label: t('retention.tabs.expired'),
            badge: expired && expired.total > 0 ? (
              <Badge tone="warning">{expired.total}</Badge>
            ) : undefined,
            content: (
              <div className="space-y-4">
                <GlassCard>
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink-50">
                        {t('retention.execute.title')}
                      </h3>
                      <p className="text-xs text-ink-300 mt-0.5">
                        {t('retention.execute.description')}
                      </p>
                      {expired && (
                        <p className="text-[10px] text-ink-400 mt-1">
                          {t('retention.expired.asOf', { date: formatDateTime(expired.as_of) })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <Select
                        label={t('retention.policies.title')}
                        value={executePolicyId}
                        onChange={(e) => setExecutePolicyId(e.target.value)}
                        options={policyOptions}
                        className="sm:w-56"
                      />
                      <Button onClick={handleExecute} loading={executing}>
                        {t('retention.execute.title')}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
                <GlassPanel>
                  <DataTable<RetentionRecord>
                    columns={expiredColumns}
                    rows={expired?.records ?? []}
                    rowKey={(r) => r.id}
                    loading={loading}
                    emptyTitle={t('retention.expired.empty')}
                    emptyDescription={t('retention.expired.noLegalHold')}
                  />
                </GlassPanel>
              </div>
            ),
          },
          {
            id: 'logs',
            label: t('retention.tabs.logs'),
            content: (
              <GlassPanel>
                <DataTable<RetentionExecutionLog>
                  columns={logColumns}
                  rows={logs}
                  rowKey={(log) => log.id}
                  loading={loading}
                  emptyTitle={t('retention.logs.empty')}
                />
              </GlassPanel>
            ),
          },
        ]}
      />

      <Modal
        open={policyModal}
        onClose={() => setPolicyModal(false)}
        title={
          editingPolicy ? t('common.edit') : t('retention.policies.create')
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPolicyModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePolicySubmit} loading={policySubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handlePolicySubmit} className="space-y-3">
          <Input
            label={t('retention.policies.fields.name')}
            required
            value={policyForm.name}
            onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
          />
          <Input
            label={t('retention.policies.fields.category')}
            required
            value={policyForm.data_category}
            onChange={(e) => setPolicyForm({ ...policyForm, data_category: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('retention.policies.fields.days')}
              type="number"
              min={0}
              required
              value={policyForm.retention_days}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, retention_days: e.target.value })
              }
            />
            <Select
              label={t('retention.policies.fields.action')}
              value={policyForm.action_on_expiry}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, action_on_expiry: e.target.value })
              }
              options={[
                { value: 'DELETE', label: t('retention.policies.actions.DELETE') },
                { value: 'ANONYMIZE', label: t('retention.policies.actions.ANONYMIZE') },
                { value: 'REVIEW', label: t('retention.policies.actions.REVIEW') },
              ]}
            />
          </div>
          <Input
            label={t('retention.policies.fields.legalBasis')}
            value={policyForm.legal_basis}
            onChange={(e) => setPolicyForm({ ...policyForm, legal_basis: e.target.value })}
          />
          {policyError && <AlertBox tone="danger">{policyError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!reviewingRecord}
        onClose={() => setReviewingRecord(null)}
        title={t('retention.expired.title')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewingRecord(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleReviewSubmit} loading={reviewSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleReviewSubmit} className="space-y-3">
          <Select
            label={t('retention.expired.decisionLabel')}
            value={reviewDecision}
            onChange={(e) => setReviewDecision(e.target.value)}
            options={[
              { value: 'RETAIN', label: t('retention.expired.decisionOptions.RETAIN') },
              { value: 'DELETE', label: t('retention.expired.decisionOptions.DELETE') },
              { value: 'ANONYMIZE', label: t('retention.expired.decisionOptions.ANONYMIZE') },
            ]}
          />
          <Textarea
            label={t('retention.expired.rationale')}
            value={reviewRationale}
            onChange={(e) => setReviewRationale(e.target.value)}
            rows={3}
          />
          {reviewError && <AlertBox tone="danger">{reviewError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
