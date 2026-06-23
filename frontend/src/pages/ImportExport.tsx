import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  GlassCard,
  PageHeader,
  Tabs,
} from '../components/ui'
import {
  exportComplianceReport,
  exportTreatmentActivitiesCsv,
  importTreatmentActivities,
  type BulkImportError,
} from '../api/importExport'
import { extractErrorMessage } from '../lib/errors'
import { downloadBlob } from '../lib/format'

interface ParsedFile {
  rows: Record<string, unknown>[]
  rawText: string
  filename: string
}

export default function ImportExportPage() {
  const { t } = useTranslation()
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [parseError, setParseError] = useState('')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [importErrors, setImportErrors] = useState<BulkImportError[]>([])
  const [importing, setImporting] = useState(false)

  const [exportError, setExportError] = useState('')
  const [exportingKind, setExportingKind] = useState<'csv' | 'json' | null>(null)

  const handleFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    setParseError('')
    setImportError('')
    setImportSuccess('')
    setImportErrors([])
    const file = e.target.files?.[0]
    if (!file) {
      setParsed(null)
      return
    }
    try {
      const text = await file.text()
      const rows = parseFileToRows(text, file.name)
      setParsed({ rows, rawText: text, filename: file.name })
    } catch (err) {
      setParseError(extractErrorMessage(err, t('importExport.import.parsingFailed')))
      setParsed(null)
    }
  }, [t])

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) {
      setImportError(t('importExport.import.emptyFile'))
      return
    }
    setImporting(true)
    setImportError('')
    setImportSuccess('')
    setImportErrors([])
    try {
      const result = await importTreatmentActivities({ activities: parsed.rows })
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors)
        if (result.created > 0) {
          setImportSuccess(
            t('importExport.import.partial', {
              count: result.created,
              errors: result.errors.length,
            })
          )
        } else {
          setImportError(t('importExport.import.failed'))
        }
      } else {
        setImportSuccess(t('importExport.import.success', { count: result.created }))
      }
    } catch (err) {
      setImportError(extractErrorMessage(err, t('importExport.import.failed')))
    } finally {
      setImporting(false)
    }
  }

  async function downloadCsv() {
    setExportingKind('csv')
    setExportError('')
    try {
      const blob = await exportTreatmentActivitiesCsv()
      downloadBlob(blob, `treatment_activities-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      setExportError(extractErrorMessage(err, t('importExport.export.failed')))
    } finally {
      setExportingKind(null)
    }
  }

  async function downloadJson() {
    setExportingKind('json')
    setExportError('')
    try {
      const data = await exportComplianceReport()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      downloadBlob(blob, `compliance-report-${new Date().toISOString().slice(0, 10)}.json`)
    } catch (err) {
      setExportError(extractErrorMessage(err, t('importExport.export.failed')))
    } finally {
      setExportingKind(null)
    }
  }

  const previewRows = useMemo(() => parsed?.rows.slice(0, 5) ?? [], [parsed])
  const previewCols = useMemo(() => {
    if (!previewRows.length) return [] as string[]
    return Object.keys(previewRows[0])
  }, [previewRows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('importExport.title')}
        description={t('importExport.description')}
      />

      <Tabs
        tabs={[
          {
            id: 'import',
            label: t('importExport.tabs.import'),
            content: (
              <div className="space-y-4">
                <GlassCard>
                  <h2 className="text-base font-semibold text-ink-50 mb-1">
                    {t('importExport.import.title')}
                  </h2>
                  <p className="text-xs text-ink-300 mb-4">
                    {t('importExport.import.description')}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-200 mb-1">
                        {t('importExport.import.csvFile')}
                      </label>
                      <input
                        type="file"
                        accept=".csv,.json,application/json,text/csv"
                        onChange={handleFile}
                        className="block w-full text-xs text-ink-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-brand-500/15 file:text-brand-100 hover:file:bg-brand-500/25"
                      />
                    </div>

                    {parseError && <AlertBox tone="danger">{parseError}</AlertBox>}

                    {parsed && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-ink-300">
                          <Badge tone="info">{parsed.filename}</Badge>
                          <span>
                            {t('importExport.import.previewHint', { count: parsed.rows.length })}
                          </span>
                        </div>
                        {previewRows.length > 0 && (
                          <div className="overflow-x-auto scrollbar-thin rounded-lg border border-slate-200">
                            <table className="min-w-full text-xs">
                              <thead className="bg-slate-50 text-ink-300">
                                <tr>
                                  {previewCols.map((col) => (
                                    <th
                                      key={col}
                                      className="px-3 py-2 text-left font-medium border-b border-slate-200"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {previewRows.map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-slate-100 last:border-b-0"
                                  >
                                    {previewCols.map((col) => (
                                      <td
                                        key={col}
                                        className="px-3 py-2 text-ink-100 align-top"
                                      >
                                        {formatPreviewCell(row[col])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <Button onClick={handleImport} loading={importing} disabled={importing}>
                          {t('importExport.import.submit', { count: parsed.rows.length })}
                        </Button>
                      </div>
                    )}

                    {importError && <AlertBox tone="danger">{importError}</AlertBox>}
                    {importSuccess && (
                      <AlertBox
                        tone={importErrors.length > 0 ? 'warning' : 'success'}
                      >
                        {importSuccess}
                      </AlertBox>
                    )}
                    {importErrors.length > 0 && (
                      <ImportErrorsList errors={importErrors} title={t('importExport.import.errorsTitle')} />
                    )}
                  </div>
                </GlassCard>
              </div>
            ),
          },
          {
            id: 'export',
            label: t('importExport.tabs.export'),
            content: (
              <div className="space-y-4">
                {exportError && <AlertBox tone="danger">{exportError}</AlertBox>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-ink-50">
                      {t('importExport.export.csvActivities')}
                    </h3>
                    <p className="text-xs text-ink-300 mt-1 mb-4">
                      {t('importExport.export.csvActivitiesHint')}
                    </p>
                    <Button
                      onClick={downloadCsv}
                      loading={exportingKind === 'csv'}
                    >
                      {t('importExport.export.downloadCsv')}
                    </Button>
                  </GlassCard>
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-ink-50">
                      {t('importExport.export.jsonReport')}
                    </h3>
                    <p className="text-xs text-ink-300 mt-1 mb-4">
                      {t('importExport.export.jsonReportHint')}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={downloadJson}
                      loading={exportingKind === 'json'}
                    >
                      {t('importExport.export.downloadJson')}
                    </Button>
                  </GlassCard>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parseFileToRows(text: string, filename: string): Record<string, unknown>[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const isJson = filename.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')
  if (isJson) return parseJsonRows(trimmed)
  return parseCsvRows(trimmed)
}

function parseJsonRows(text: string): Record<string, unknown>[] {
  const data = JSON.parse(text)
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object' && Array.isArray((data as { activities?: unknown }).activities)) {
    return (data as { activities: Record<string, unknown>[] }).activities
  }
  throw new Error('JSON must be an array or an object with an "activities" array.')
}

function parseCsvRows(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const headers = splitCsv(lines[0])
  return lines.slice(1).map((line) => {
    const parts = splitCsv(line)
    const row: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      const value = parts[idx] ?? ''
      row[header] = coerceValue(header, value)
    })
    return row
  })
}

function coerceValue(header: string, raw: string): unknown {
  const lower = header.toLowerCase()
  if (raw === '') return undefined
  if (
    lower === 'personal_data_types' ||
    lower === 'data_subjects' ||
    lower === 'destination_countries'
  ) {
    return raw
      .split(/[|;]/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  if (lower === 'is_cross_border') {
    return raw.toLowerCase() === 'true' || raw === '1'
  }
  if (lower === 'retention_period_days' || lower === 'department_id') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
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

function formatPreviewCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function ImportErrorsList({ errors, title }: { errors: BulkImportError[]; title: string }) {
  return (
    <div className="rounded-lg border border-rose-400/30 bg-rose-500/[0.05] p-3 space-y-2">
      <p className="text-xs font-semibold text-rose-200">{title}</p>
      <ul className="space-y-1 text-xs text-rose-100/90 max-h-60 overflow-y-auto scrollbar-thin">
        {errors.map((err, idx) => (
          <li key={idx}>
            <span className="font-mono text-rose-300 mr-2">#{err.row}</span>
            {err.detail}
          </li>
        ))}
      </ul>
    </div>
  )
}
