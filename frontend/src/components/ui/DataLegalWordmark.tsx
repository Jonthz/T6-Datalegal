import { cn } from '../../lib/cn'

interface DataLegalWordmarkProps {
  className?: string
}

export function DataLegalWordmark({ className }: DataLegalWordmarkProps) {
  return (
    <svg
      viewBox="0 0 82 24"
      className={cn(
        'block h-6 w-[82px] shrink-0 text-ink-50',
        className
      )}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <text
        x="0"
        y="17"
        fill="currentColor"
        fontFamily="Aptos Display, Aptos, Segoe UI Variable, Segoe UI, sans-serif"
        fontSize="16"
        fontWeight="650"
        letterSpacing="0"
      >
        Data
      </text>
      <text
        x="38"
        y="17"
        fill="currentColor"
        fontFamily="Aptos Display, Aptos, Segoe UI Variable, Segoe UI, sans-serif"
        fontSize="16"
        fontWeight="820"
        letterSpacing="0"
      >
        Legal
      </text>
      <path
        d="M39 20.5H78"
        stroke="#0f9fb6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
