import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { EmptyState, LoadingState, ErrorState } from './states'

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
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    )
  }

  return (
    <div className={cn('overflow-x-auto scrollbar-thin', className)}>
      <table className="min-w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-300 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-2.5 font-medium whitespace-nowrap',
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
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-slate-50'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-ink-100 align-top',
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
  )
}
