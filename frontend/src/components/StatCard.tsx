import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">{children}</dl>
}

type StatCardProps = {
  label: string
  icon: LucideIcon
  /** Leave out while the value is loading. */
  value?: ReactNode
  note?: ReactNode
}

export function StatCard({ label, icon: Icon, value, note }: StatCardProps) {
  const loading = value === undefined

  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card px-5 py-[18px] shadow-xs" aria-busy={loading}>
      <dt className="flex items-center justify-between gap-2 text-[13px] font-medium">
        {label}
        <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </dt>
      <dd className="text-[26px] leading-tight font-bold tracking-heading">
        {loading ? <Skeleton className="my-1 h-7 w-28" /> : value}
      </dd>
      <dd className="text-xs text-muted-foreground">{loading ? <Skeleton className="h-3.5 w-36" /> : note}</dd>
    </div>
  )
}
