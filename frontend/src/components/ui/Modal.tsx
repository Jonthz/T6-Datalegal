import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { CloseIcon } from './Icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      const prev = document.activeElement as HTMLElement | null
      dialogRef.current?.focus()
      return () => prev?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/55 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'glass-surface rounded-glass w-full shadow-glass-lg border-slate-200',
          'flex flex-col max-h-[90vh] sm:max-h-[85vh]',
          sizeClasses[size]
        )}
      >
        <header className="flex items-start justify-between gap-3 shrink-0 px-6 pt-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
            {description && <p className="text-sm text-ink-300 mt-0.5">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <CloseIcon className="h-4 w-4" />
          </Button>
        </header>
        <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4">{children}</div>
        {footer && (
          <footer className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
