import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
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
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  bulkLoadCatalog,
  deleteCatalogEntry,
  listCatalogs,
  updateCatalogEntry,
  type CatalogEntryCreate,
} from '../api/catalogs'
import type { CatalogEntry } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { formatDate } from '../lib/format'

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
            <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busyId === entry.id}
              onClick={() => handleDelete(entry)}
            >
              {t('common.delete')}
            </Button>
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
        actions={<Button onClick={openBulk}>{t('catalogs.create')}</Button>}
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
          <Button variant="ghost" size="sm" onClick={() => setTypeFilter('')}>
            {t('common.refresh')}
          </Button>
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
