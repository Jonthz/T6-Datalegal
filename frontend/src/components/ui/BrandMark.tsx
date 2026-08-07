import { cn } from '../../lib/cn'

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        'bg-brand-950 text-white shadow-glass ring-1 ring-white/10',
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      <span className="absolute inset-x-1 top-1 h-0.5 rounded-full bg-brand-400" />
      <svg
        viewBox="0 0 48 48"
        className="h-[78%] w-[78%]"
        fill="none"
        focusable="false"
      >
        <path
          d="M24 7.5c4.8 3.3 9.1 5 14 5.7v9.5c0 8.1-5.1 14.3-14 17.8-8.9-3.5-14-9.7-14-17.8v-9.5c4.9-.7 9.2-2.4 14-5.7Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M18.2 23.2v-4.1a5.8 5.8 0 0 1 11.6 0v4.1"
          stroke="#8fb7d9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M16.8 25.4c0-3.8 3.1-6.9 6.9-6.9s6.9 3.1 6.9 6.9v.7c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7v-.7a1.5 1.5 0 0 0-3 0v1.1c0 3.5-2 6.6-5.1 8.1"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M20.2 35.7c3.6-2.1 5.7-5.4 5.7-9.2M30.5 32.7c2.1-1.7 3.3-4.1 3.3-6.8v-.5c0-5.5-4.5-10-10-10s-10 4.5-10 10v2.2"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </div>
  )
}
