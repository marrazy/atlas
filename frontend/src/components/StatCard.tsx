import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">{children}</dl>
}

type StatCardProps = {
  label: string
  /** Leave out while the value is loading. */
  value?: ReactNode
  note?: ReactNode
  /** Oil and gas cards get their light tint, and a dot before the label when `dot` is set. */
  tint?: 'oil' | 'gas'
  dot?: boolean
}

/** Design v2 stat card: a label, a number and one line. No icon. */
export function StatCard({ label, value, note, tint, dot = false }: StatCardProps) {
  const loading = value === undefined

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-[14px] border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        tint === 'oil' ? 'bg-tint-oil' : tint === 'gas' ? 'bg-tint-gas' : 'bg-card',
      )}
      aria-busy={loading}
    >
      <dt className="flex items-center gap-2 text-[13px] text-text-2">
        {dot && tint && (
          <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', tint === 'oil' ? 'bg-oil' : 'bg-gas')} />
        )}
        {label}
      </dt>
      <dd className="text-[28px] leading-none font-medium tabular-nums">
        {loading ? <Skeleton className="h-7 w-28" /> : value}
      </dd>
      <dd className="text-xs leading-4 text-muted-foreground">{loading ? <Skeleton className="h-3.5 w-36" /> : note}</dd>
    </div>
  )
}
