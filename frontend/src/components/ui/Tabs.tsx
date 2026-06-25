import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Tab {
  id: string
  label: string
  badge?: ReactNode
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  initial?: string
  onChange?: (id: string) => void
  className?: string
}

export function Tabs({ tabs, initial, onChange, className }: TabsProps) {
  const [active, setActive] = useState<string>(initial ?? tabs[0]?.id ?? '')

  return (
    <div className={cn('space-y-4', className)}>
      <div role="tablist" className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-100 p-1 scrollbar-thin">
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => {
                setActive(tab.id)
                onChange?.(tab.id)
              }}
              className={cn(
                'px-3 h-8 shrink-0 rounded-md text-sm font-semibold transition-colors flex items-center gap-2',
                selected
                  ? 'bg-white text-brand-800 border border-brand-200 shadow-sm'
                  : 'text-ink-300 hover:text-ink-50 hover:bg-slate-100 border border-transparent'
              )}
            >
              {tab.label}
              {tab.badge}
            </button>
          )
        })}
      </div>
      <div role="tabpanel">{tabs.find((tab) => tab.id === active)?.content}</div>
    </div>
  )
}
