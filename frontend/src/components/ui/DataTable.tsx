import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { EmptyState, LoadingState, ErrorState } from './states'
import { EmptyTableIcon } from './Icons'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  className?: string
  render: (row: T, index: number) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  loading?: boolean
  error?: string | null
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
  className?: string
  caption?: string
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  emptyTitle = 'No records to display',
  emptyDescription,
  emptyAction,
  onRowClick,
  className,
  caption,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState rows={4} />
  }

  if (error) {
    return <ErrorState description={error} />
  }

  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<EmptyTableIcon className="h-6 w-6" />}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('rounded-md border border-slate-200 bg-white overflow-hidden', className)}>
      <div className="md:hidden divide-y divide-slate-100">
        {rows.map((row, idx) => {
          const actionColumns = columns.filter((col) => col.key === 'actions')
          const contentColumns = columns.filter((col) => col.key !== 'actions')
          return (
            <article
              key={rowKey(row, idx)}
              className={cn(
                'p-4 space-y-3 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-slate-50/80'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink-100">
                    {contentColumns[0]?.render(row, idx)}
                  </div>
                </div>
                {actionColumns.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {actionColumns.map((col) => (
                      <span key={col.key}>{col.render(row, idx)}</span>
                    ))}
                  </div>
                )}
              </div>
              {contentColumns.slice(1).map((col) => (
                <div key={col.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm">
                  <div className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
                    {col.header}
                  </div>
                  <div className={cn('min-w-0 text-ink-100', alignClass[col.align ?? 'left'])}>
                    {col.render(row, idx)}
                  </div>
                </div>
              ))}
            </article>
          )
        })}
      </div>
      <div className="hidden md:block max-h-[70vh] overflow-auto scrollbar-thin">
      <table className="min-w-full text-sm tabular-nums">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 z-10 bg-slate-100">
          <tr className="text-[13px] uppercase tracking-wide text-ink-200 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-2.5 font-semibold whitespace-nowrap',
                  col.key === 'actions' && 'w-px',
                  alignClass[col.align ?? 'left'],
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, idx) => (
            <tr
              key={rowKey(row, idx)}
              className={cn(
                'group transition-colors hover:bg-slate-50/80',
                onRowClick && 'cursor-pointer'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-ink-100 align-top first:font-medium',
                    col.key === 'actions' && 'whitespace-nowrap',
                    alignClass[col.align ?? 'left'],
                    col.className
                  )}
                >
                  {col.render(row, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
