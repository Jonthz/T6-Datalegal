import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { History, Pencil, Plus, RefreshCw, Trash2, Upload, Wand2 } from 'lucide-react'
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
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  bulkLoadCatalog,
  createCatalogEntry,
  deleteCatalogEntry,
  listCatalogs,
  listCatalogVersions,
  reclassifyCatalogEntry,
  updateCatalogEntry,
  type CatalogEntryCreate,
} from '../api/catalogs'
import type { CatalogEntry, CatalogEntryVersion } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { formatDate, formatDateTime } from '../lib/format'

const KNOWN_TYPES = [
  'LEGAL_BASIS',
  'DATA_TYPE',
  'THREAT',
  'CONTROL',
  'ASSET_TYPE',
  'ASSET_FORMAT',
  'STORAGE_MEDIUM',
  'CLASSIFICATION_LEVEL',
]

const SENSITIVITY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'ORDINARY', label: 'Ordinary' },
  { value: 'SENSITIVE', label: 'Sensitive' },
]

const CRITICALITY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

interface EditForm {
  label: string
  description: string
  sensitivity: string
  criticality: string
  is_active: boolean
}

const EMPTY_EDIT: EditForm = {
  label: '',
  description: '',
  sensitivity: '',
  criticality: '',
  is_active: true,
}

export default function CatalogsPage() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [editing, setEditing] = useState<CatalogEntry | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT)
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkType, setBulkType] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CatalogEntryCreate>({
    type: '',
    code: '',
    label: '',
    description: '',
    sensitivity: '',
    criticality: '',
  })
  const [createError, setCreateError] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [versionsFor, setVersionsFor] = useState<CatalogEntry | null>(null)
  const [versions, setVersions] = useState<CatalogEntryVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const data = await listCatalogs({
        type: typeFilter || undefined,
        limit: 500,
      })
      setEntries(data)
    } catch (err) {
      setPageError(extractErrorMessage(err, t('catalogs.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t, typeFilter])

  useEffect(() => {
    load()
  }, [load])

  function openEdit(entry: CatalogEntry) {
    setEditing(entry)
    setEditForm({
      label: entry.label ?? '',
      description: entry.description ?? '',
      sensitivity: entry.sensitivity ?? '',
      criticality: entry.criticality ?? '',
      is_active: entry.is_active,
    })
    setEditError('')
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setEditSubmitting(true)
    setEditError('')
    try {
      await updateCatalogEntry(editing.id, {
        label: editForm.label,
        description: editForm.description,
        sensitivity: editForm.sensitivity || null,
        criticality: editForm.criticality || null,
        is_active: editForm.is_active,
      })
      setSuccess(t('catalogs.updateSuccess'))
      setEditing(null)
      await load()
    } catch (err) {
      setEditError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(entry: CatalogEntry) {
    if (!window.confirm(t('catalogs.confirmDelete'))) return
    setBusyId(entry.id)
    setPageError('')
    try {
      await deleteCatalogEntry(entry.id)
      setSuccess(t('catalogs.deleteSuccess'))
      await load()
    } catch (err) {
      const status = getStatus(err)
      if (status === 409) {
        setPageError(t('catalogs.deleteBlocked'))
      } else {
        setPageError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setBusyId(null)
    }
  }

  function openCreate() {
    setCreateForm({
      type: typeFilter || '',
      code: '',
      label: '',
      description: '',
      sensitivity: '',
      criticality: '',
    })
    setCreateError('')
    setCreateOpen(true)
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError('')
    try {
      await createCatalogEntry({
        type: createForm.type.trim(),
        code: createForm.code.trim(),
        label: createForm.label.trim() || createForm.code.trim(),
        description: createForm.description ?? '',
        sensitivity: createForm.sensitivity || null,
        criticality: createForm.criticality || null,
      })
      setSuccess(t('catalogs.createSuccess'))
      setCreateOpen(false)
      await load()
    } catch (err) {
      setCreateError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleReclassify(entry: CatalogEntry) {
    setBusyId(entry.id)
    setPageError('')
    try {
      await reclassifyCatalogEntry(entry.id)
      setSuccess(t('catalogs.reclassifySuccess'))
      await load()
    } catch (err) {
      const status = getStatus(err)
      if (status === 422) {
        setPageError(t('catalogs.reclassifyNoRule', { code: entry.code }))
      } else {
        setPageError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function openVersions(entry: CatalogEntry) {
    setVersionsFor(entry)
    setVersions([])
    setVersionsLoading(true)
    try {
      const data = await listCatalogVersions(entry.id)
      setVersions(data)
    } catch (err) {
      setPageError(extractErrorMessage(err, t('common.error')))
    } finally {
      setVersionsLoading(false)
    }
  }

  function openBulk() {
    setBulkText('')
    setBulkType('')
    setBulkError('')
    setBulkOpen(true)
  }

  function handleBulkFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => setBulkText(text))
  }

  async function handleBulkSubmit() {
    setBulkError('')
    setBulkSubmitting(true)
    try {
      const parsed = parseCatalogCsv(bulkText, bulkType)
      if (parsed.length === 0) {
        setBulkError(t('catalogs.csvFailed'))
        return
      }
      await bulkLoadCatalog(parsed)
      setSuccess(t('catalogs.csvImported', { count: parsed.length }))
      setBulkOpen(false)
      await load()
    } catch (err) {
      setBulkError(extractErrorMessage(err, t('catalogs.csvFailed')))
    } finally {
      setBulkSubmitting(false)
    }
  }

  const typeOptions = useMemo(() => {
    const seen = new Set(KNOWN_TYPES)
    entries.forEach((e) => seen.add(e.type))
    return [
      { value: '', label: t('catalogs.allTypes') },
      ...Array.from(seen).sort().map((tp) => ({ value: tp, label: tp })),
    ]
  }, [entries, t])

  const columns = useMemo<DataTableColumn<CatalogEntry>[]>(
    () => [
      {
        key: 'type',
        header: t('catalogs.fields.type'),
        render: (entry) => <Badge tone="info">{entry.type}</Badge>,
      },
      {
        key: 'code',
        header: t('catalogs.fields.code'),
        render: (entry) => <code className="text-xs text-ink-100">{entry.code}</code>,
      },
      {
        key: 'label',
        header: t('catalogs.fields.label'),
        render: (entry) => (
          <div className="min-w-0">
            <p className="text-sm text-ink-50 truncate">{entry.label}</p>
            {entry.description && (
              <p className="text-xs text-ink-400 line-clamp-2">{entry.description}</p>
            )}
          </div>
        ),
      },
      {
        key: 'sensitivity',
        header: t('catalogs.fields.sensitivity'),
        render: (entry) =>
          entry.sensitivity ? (
            <Badge tone={entry.sensitivity === 'SENSITIVE' ? 'danger' : 'neutral'}>
              {entry.sensitivity}
            </Badge>
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        key: 'criticality',
        header: t('catalogs.fields.criticality'),
        render: (entry) =>
          entry.criticality ? (
            <Badge
              tone={
                entry.criticality === 'HIGH'
                  ? 'danger'
                  : entry.criticality === 'MEDIUM'
                    ? 'warning'
                    : 'success'
              }
            >
              {entry.criticality}
            </Badge>
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        key: 'version',
        header: t('catalogs.fields.version'),
        render: (entry) => <span className="text-xs text-ink-300">v{entry.version}</span>,
      },
      {
        key: 'created',
        header: t('common.created'),
        render: (entry) => (
          <span className="text-xs text-ink-300">{formatDate(entry.created_at)}</span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (entry) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              label={t('catalogs.history')}
              icon={<History className="h-4 w-4" />}
              variant="secondary"
              onClick={() => openVersions(entry)}
            />
            <IconButton
              label={t('catalogs.reclassify')}
              icon={<Wand2 className="h-4 w-4" />}
              variant="secondary"
              loading={busyId === entry.id}
              onClick={() => handleReclassify(entry)}
            />
            <IconButton
              label={t('common.edit')}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(entry)}
            />
            <IconButton
              label={t('common.delete')}
              icon={<Trash2 className="h-4 w-4" />}
              variant="danger"
              loading={busyId === entry.id}
              onClick={() => handleDelete(entry)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyId]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('catalogs.title')}
        description={t('catalogs.description')}
        actions={
          <div className="flex items-center gap-2">
            <IconButton
              label={t('catalogs.createSingle')}
              icon={<Plus className="h-5 w-5" />}
              variant="secondary"
              size="md"
              onClick={openCreate}
            />
            <IconButton
              label={t('catalogs.create')}
              icon={<Upload className="h-5 w-5" />}
              variant="primary"
              size="md"
              onClick={openBulk}
            />
          </div>
        }
      />

      {pageError && <AlertBox tone="danger">{pageError}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Select
            label={t('catalogs.filterByType')}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={typeOptions}
            className="sm:w-72"
          />
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={() => setTypeFilter('')}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<CatalogEntry>
          columns={columns}
          rows={entries}
          rowKey={(entry) => entry.id}
          loading={loading}
          error={pageError && !loading ? pageError : null}
          emptyTitle={t('catalogs.empty')}
        />
      </GlassPanel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.type} / ${editing.code}` : ''}
        size="md"
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
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <Input
            label={t('catalogs.fields.label')}
            value={editForm.label}
            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
            required
          />
          <Textarea
            label={t('catalogs.fields.description')}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('catalogs.fields.sensitivity')}
              value={editForm.sensitivity}
              onChange={(e) => setEditForm({ ...editForm, sensitivity: e.target.value })}
              options={SENSITIVITY_OPTIONS}
            />
            <Select
              label={t('catalogs.fields.criticality')}
              value={editForm.criticality}
              onChange={(e) => setEditForm({ ...editForm, criticality: e.target.value })}
              options={CRITICALITY_OPTIONS}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
            />
            {t('catalogs.fields.active')}
          </label>
          {editError && <AlertBox tone="danger">{editError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('catalogs.createSingle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateSubmit} loading={createSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('catalogs.fields.type')}
              value={KNOWN_TYPES.includes(createForm.type) ? createForm.type : ''}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
              options={[
                { value: '', label: t('common.optional') },
                ...KNOWN_TYPES.map((tp) => ({ value: tp, label: tp })),
              ]}
            />
            <Input
              label={t('catalogs.fields.typeCustom')}
              value={createForm.type}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
              placeholder="DATA_TYPE"
            />
          </div>
          <Input
            label={t('catalogs.fields.code')}
            value={createForm.code}
            onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
            hint={t('catalogs.autoClassifyHint')}
            required
          />
          <Input
            label={t('catalogs.fields.label')}
            value={createForm.label}
            onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
            required
          />
          <Textarea
            label={t('catalogs.fields.description')}
            value={createForm.description ?? ''}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('catalogs.fields.sensitivity')}
              value={createForm.sensitivity ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, sensitivity: e.target.value })}
              options={SENSITIVITY_OPTIONS}
            />
            <Select
              label={t('catalogs.fields.criticality')}
              value={createForm.criticality ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, criticality: e.target.value })}
              options={CRITICALITY_OPTIONS}
            />
          </div>
          {createError && <AlertBox tone="danger">{createError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={!!versionsFor}
        onClose={() => setVersionsFor(null)}
        title={
          versionsFor
            ? `${t('catalogs.history')} · ${versionsFor.type}/${versionsFor.code}`
            : t('catalogs.history')
        }
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setVersionsFor(null)}>
            {t('common.close')}
          </Button>
        }
      >
        {versionsLoading ? (
          <p className="text-sm text-ink-300">{t('common.loading')}</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-ink-300">{t('catalogs.noHistory')}</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {versions.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="info">v{v.version}</Badge>
                    <span className="text-sm font-medium text-ink-50">{v.label}</span>
                    {!v.is_active && <Badge tone="neutral">{t('catalogs.inactive')}</Badge>}
                  </div>
                  {v.description && (
                    <p className="text-xs text-ink-300 line-clamp-2">{v.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {v.sensitivity && (
                      <Badge tone={v.sensitivity === 'SENSITIVE' ? 'danger' : 'neutral'}>
                        {v.sensitivity}
                      </Badge>
                    )}
                    {v.criticality && (
                      <Badge
                        tone={
                          v.criticality === 'HIGH'
                            ? 'danger'
                            : v.criticality === 'MEDIUM'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {v.criticality}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-ink-400">
                  {formatDateTime(v.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={t('catalogs.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBulkSubmit} loading={bulkSubmitting}>
              {t('common.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-ink-300">{t('catalogs.csvHint')}</p>
          <Select
            label={t('catalogs.fields.type')}
            value={bulkType}
            onChange={(e) => setBulkType(e.target.value)}
            options={[
              { value: '', label: t('common.optional') },
              ...KNOWN_TYPES.map((tp) => ({ value: tp, label: tp })),
            ]}
            hint="Overrides the 'type' column if set."
          />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-ink-200">
              {t('catalogs.csvLabel')}
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleBulkFile}
              className="block w-full text-xs text-ink-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-brand-500/15 file:text-brand-100 hover:file:bg-brand-500/25"
            />
          </div>
          <Textarea
            label="CSV content"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder="type,code,label,description"
          />
          {bulkError && <AlertBox tone="danger">{bulkError}</AlertBox>}
        </div>
      </Modal>
    </div>
  )
}

function parseCatalogCsv(text: string, defaultType: string): CatalogEntryCreate[] {
  if (!text.trim()) return []
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []
  const headerCols = splitCsv(lines[0]).map((c) => c.toLowerCase())
  const hasHeader = headerCols.includes('code') && headerCols.includes('label')
  const rows = hasHeader ? lines.slice(1) : lines
  const cols = hasHeader ? headerCols : ['type', 'code', 'label', 'description']
  const idx = (key: string) => cols.indexOf(key)
  const out: CatalogEntryCreate[] = []
  rows.forEach((line) => {
    const parts = splitCsv(line)
    if (parts.length < 2) return
    const code = parts[idx('code')] ?? parts[1]
    const label = parts[idx('label')] ?? parts[2] ?? code
    const description = parts[idx('description')] ?? parts[3] ?? ''
    const csvType = parts[idx('type')] ?? parts[0]
    const finalType = defaultType || csvType
    if (!finalType || !code) return
    out.push({
      type: finalType.trim(),
      code: code.trim(),
      label: (label ?? code).trim(),
      description: (description ?? '').trim(),
    })
  })
  return out
}

function splitCsv(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"' && line[i + 1] === '"') {
      current += '"'
      i += 1
    } else if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map((c) => c.trim())
}
