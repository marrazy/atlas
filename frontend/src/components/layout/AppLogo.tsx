import { cn } from '@/lib/utils'

/** An offshore platform on the waterline (design v2, section 2). The same mark is the favicon. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      <path d="M4 9.5h12" />
      <path d="M6 9.5 5 17" />
      <path d="M14 9.5 15 17" />
      <path d="M9 9.5 10.5 3 12 9.5" />
      <path d="M2.5 17c1.25 0 1.25-.8 2.5-.8s1.25.8 2.5.8 1.25-.8 2.5-.8 1.25.8 2.5.8 1.25-.8 2.5-.8 1.25.8 2.5.8" />
    </svg>
  )
}
