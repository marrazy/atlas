import { cn } from '@/lib/utils'

export function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M6 19 C11 15, 15 23, 20 18 S 25 14, 27 16"
        fill="none"
        strokeWidth={2.2}
        className="stroke-background"
      />
      <circle cx="16" cy="11" r="3" className="fill-oil" />
    </svg>
  )
}
