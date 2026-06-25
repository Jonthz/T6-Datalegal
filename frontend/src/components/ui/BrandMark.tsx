import { cn } from '../../lib/cn'

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-md',
        'bg-brand-950 text-white font-bold shadow-glass ring-1 ring-white/10',
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      <span className="absolute inset-x-1 top-1 h-0.5 rounded-full bg-brand-400" />
      DL
    </div>
  )
}
