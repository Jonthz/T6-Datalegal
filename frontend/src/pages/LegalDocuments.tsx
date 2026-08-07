import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FilePlus2, RefreshCw } from 'lucide-react'
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
  createLegalDocument,
  downloadLegalDocumentPdf,
  listLegalDocuments,
  listTemplateTypes,
} from '../api/legalDocuments'
import type { LegalDocument, TemplateTypeInfo } from '../types'
import { extractErrorMessage, getStatus } from '../lib/errors'
import { downloadBlob, formatDate } from '../lib/format'

interface DocForm {
  doc_type: string
  title: string
  version: string
  effective_date: string
  content: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const EMPTY_DOC_FORM: DocForm = {
  doc_type: '',
  title: '',
  version: '1.0',
  effective_date: todayIso(),
  content: '',
}

export default function LegalDocumentsPage() {
  const { t } = useTranslation()

  const [templateTypes, setTemplateTypes] = useState<TemplateTypeInfo[]>([])
  const [docs, setDocs] = useState<LegalDocument[]>([])
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [onlyCurrent, setOnlyCurrent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<DocForm>(EMPTY_DOC_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const data = await listTemplateTypes()
      setTemplateTypes(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('legalDocuments.loadFailed')))
    } finally {
      setTemplatesLoading(false)
    }
  }, [t])

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listLegalDocuments({
        doc_type: docTypeFilter || undefined,
        current_only: onlyCurrent || undefined,
        limit: 200,
      })
      setDocs(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('legalDocuments.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [docTypeFilter, onlyCurrent, t])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  function openCreate(template?: TemplateTypeInfo) {
    setForm({
      ...EMPTY_DOC_FORM,
      doc_type: template?.doc_type ?? templateTypes[0]?.doc_type ?? '',
      title: template ? formatTitleFromType(template.doc_type) : '',
    })
    setFormError('')
    setCreating(true)
  }

  function formatTitleFromType(docType: string) {
    return docType
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.doc_type || !form.title.trim() || !form.version.trim()) {
      setFormError(t('legalDocuments.validation'))
      return
    }
    setSubmitting(true)
    try {
      await createLegalDocument({
        doc_type: form.doc_type,
        title: form.title.trim(),
        version: form.version.trim(),
        effective_date: form.effective_date,
        content: form.content,
        parameters: {},
      })
      setSuccess(t('legalDocuments.createSuccess'))
      setCreating(false)
      await loadDocs()
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload(doc: LegalDocument) {
    setDownloadingId(doc.id)
    setError('')
    try {
      const blob = await downloadLegalDocumentPdf(doc.id)
      const safeTitle = doc.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'document'
      downloadBlob(blob, `${doc.doc_type.toLowerCase()}_${safeTitle}_v${doc.version}.pdf`)
    } catch (err) {
      const status = getStatus(err)
      if (status === 404) {
        setError(t('legalDocuments.notFound'))
      } else {
        setError(extractErrorMessage(err, t('common.error')))
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const typeOptions = useMemo(
    () => [
      { value: '', label: t('legalDocuments.filterAllTypes') },
      ...templateTypes.map((tp) => ({ value: tp.doc_type, label: tp.doc_type })),
    ],
    [templateTypes, t]
  )

  const typeOptionsForForm = useMemo(
    () => templateTypes.map((tp) => ({ value: tp.doc_type, label: tp.doc_type })),
    [templateTypes]
  )

  const columns = useMemo<DataTableColumn<LegalDocument>[]>(
    () => [
      {
        key: 'title',
        header: t('legalDocuments.columns.title'),
        render: (row) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{row.title}</p>
            <p className="text-xs text-ink-300">{row.doc_type}</p>
          </div>
        ),
      },
      {
        key: 'version',
        header: t('legalDocuments.columns.version'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <Badge tone="brand">v{row.version}</Badge>
            {row.is_current && <Badge tone="success">{t('legalDocuments.current')}</Badge>}
          </div>
        ),
      },
      {
        key: 'effective',
        header: t('legalDocuments.columns.effective'),
        render: (row) => (
          <span className="text-xs text-ink-300">{formatDate(row.effective_date)}</span>
        ),
      },
      {
        key: 'created',
        header: t('legalDocuments.columns.created'),
        render: (row) => (
          <span className="text-xs text-ink-300">{formatDate(row.created_at)}</span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) => (
          <IconButton
            label={t('legalDocuments.downloadPdf')}
            icon={<Download className="h-4 w-4" />}
            loading={downloadingId === row.id}
            onClick={() => handleDownload(row)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, downloadingId]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('legalDocuments.title')}
        description={t('legalDocuments.description')}
        actions={
          <IconButton
            label={t('legalDocuments.create')}
            icon={<FilePlus2 className="h-5 w-5" />}
            variant="primary"
            size="md"
            onClick={() => openCreate()}
          />
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard>
        <div className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-50">
                {t('legalDocuments.templates.title')}
              </h2>
              <p className="text-sm text-ink-300">
                {t('legalDocuments.templates.description')}
              </p>
            </div>
            <IconButton
              label={t('common.refresh')}
              icon={<RefreshCw className="h-4 w-4" />}
              variant="secondary"
              onClick={loadTemplates}
            />
          </header>
          {templatesLoading ? (
            <p className="text-sm text-ink-300">{t('common.loading')}</p>
          ) : templateTypes.length === 0 ? (
            <p className="text-sm text-ink-300">{t('legalDocuments.templates.empty')}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {templateTypes.map((tp) => (
                <li
                  key={tp.doc_type}
                  className="rounded-lg p-3 flex flex-col gap-2 bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink-50">{tp.doc_type}</p>
                    <Badge tone={tp.category === 'CORE' ? 'brand' : 'info'}>{tp.category}</Badge>
                  </div>
                  <p className="text-xs text-ink-300 line-clamp-3">{tp.description}</p>
                  <Button size="sm" variant="secondary" onClick={() => openCreate(tp)}>
                    {t('legalDocuments.generate')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </GlassCard>

      <GlassCard padded={false} className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow min-w-[12rem]">
            <Select
              label={t('legalDocuments.filterType')}
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              options={typeOptions}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ink-200 h-10 mb-1">
            <input
              type="checkbox"
              checked={onlyCurrent}
              onChange={(e) => setOnlyCurrent(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white"
            />
            {t('legalDocuments.onlyCurrent')}
          </label>
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={loadDocs}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<LegalDocument>
          columns={columns}
          rows={docs}
          rowKey={(d) => d.id}
          loading={loading}
          emptyTitle={t('legalDocuments.empty')}
          emptyDescription={t('legalDocuments.emptyHint')}
          emptyAction={<Button onClick={() => openCreate()}>{t('legalDocuments.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('legalDocuments.create')}
        description={t('legalDocuments.createHint')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} loading={submitting}>
              {t('legalDocuments.generate')}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t('legalDocuments.fields.docType')}
              value={form.doc_type}
              onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
              options={typeOptionsForForm}
              placeholder={t('legalDocuments.fields.docTypePlaceholder')}
              required
            />
            <Input
              label={t('legalDocuments.fields.version')}
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              required
            />
          </div>
          <Input
            label={t('legalDocuments.fields.title')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label={t('legalDocuments.fields.effective')}
            type="date"
            value={form.effective_date}
            onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
            required
          />
          <Textarea
            label={t('legalDocuments.fields.content')}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={6}
            hint={t('legalDocuments.fields.contentHint')}
          />
          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
