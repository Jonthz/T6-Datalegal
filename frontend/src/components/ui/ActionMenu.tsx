import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface ActionMenuItem {
  label: string
  icon: ReactNode
  onSelect: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  loading?: boolean
}

export interface ActionMenuProps {
  ariaLabel: string
  items: ActionMenuItem[]
  align?: 'start' | 'end'
}

export function ActionMenu({ ariaLabel, items, align = 'end' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-ink-100',
          'transition-colors hover:bg-slate-50 active:bg-slate-100',
          'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1'
        )}
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1 min-w-52 rounded-md border border-slate-200 bg-white py-1 shadow-glass-lg',
            align === 'end' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled || item.loading}
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                'focus:outline-none focus:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                item.variant === 'danger'
                  ? 'text-rose-700 hover:bg-rose-50'
                  : 'text-ink-100 hover:bg-slate-50 hover:text-ink-50'
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {item.loading ? (
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                ) : (
                  item.icon
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
