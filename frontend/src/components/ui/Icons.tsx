import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function ModuleIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M8.5 9h7M8.5 12h7M8.5 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyTableIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M4.75 7.25h14.5v9.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M4.75 10.5h14.5M9 7.25v11.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12.25 14.25h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden {...props}>
      <path
        d="m7.5 4.75 5.25 5.25-5.25 5.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden {...props}>
      <path
        d="m5.5 5.5 9 9M14.5 5.5l-9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SidebarGroupIcon({ groupId, className }: { groupId: string; className?: string }) {
  const path = sidebarGroupPaths[groupId] ?? sidebarGroupPaths.default
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      {path}
    </svg>
  )
}

const sidebarGroupPaths: Record<string, ReactNode> = {
  overview: (
    <>
      <path d="M4 11h4V5H4zM12 15h4V5h-4zM4 15h4v-2H4z" fill="currentColor" />
    </>
  ),
  organization: (
    <>
      <path d="M5 15.5V7l5-2.5L15 7v8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 15.5v-4h4v4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  data: (
    <>
      <path d="M4.5 6.5c0-1.1 2.46-2 5.5-2s5.5.9 5.5 2-2.46 2-5.5 2-5.5-.9-5.5-2Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 6.5v7c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-7M4.5 10c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  'data-registry': (
    <>
      <path d="M4.5 6.5c0-1.1 2.46-2 5.5-2s5.5.9 5.5 2-2.46 2-5.5 2-5.5-.9-5.5-2Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 6.5v7c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-7M4.5 10c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  risk: (
    <>
      <path d="M10 3.5 15.5 6v4.2c0 3-2.25 5.05-5.5 6.3-3.25-1.25-5.5-3.3-5.5-6.3V6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 7v3.2M10 13h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  rights: (
    <>
      <path d="M6 4.5h8A1.5 1.5 0 0 1 15.5 6v8A1.5 1.5 0 0 1 14 15.5H6A1.5 1.5 0 0 1 4.5 14V6A1.5 1.5 0 0 1 6 4.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 8h5M7.5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  governance: (
    <>
      <path d="M10 4.5 15.5 7v6L10 15.5 4.5 13V7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 4.5v11M4.5 7 10 9.5 15.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  documents: (
    <>
      <path d="M6.5 4.5h5L15.5 8v7.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 4.5V8h4M8.5 11h4M8.5 13.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  operations: (
    <>
      <path d="M5 5.5h10M5 10h10M5 14.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 5.5h.01M4.5 10h.01M4.5 14.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  transversal: (
    <>
      <path d="M10 4.25v11.5M4.25 10h11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 6h8v8H6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  system: (
    <>
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.75v2M10 14.25v2M4.6 6.9l1.75 1M13.65 12.1l1.75 1M4.6 13.1l1.75-1M13.65 7.9l1.75-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  default: (
    <>
      <path d="M5 5h10v10H5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h4M8 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
}
