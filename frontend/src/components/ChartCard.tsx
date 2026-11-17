import type { ReactNode } from 'react'

type ChartCardProps = {
  title: string
  description?: ReactNode
  /** Buttons shown at the top right, such as reset or save. */
  actions?: ReactNode
  children: ReactNode
}

export function ChartCard({ title, description, actions, children }: ChartCardProps) {
  return (
    <section className="min-w-0 rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex-[1_1_260px]">
          <h2 className="text-base leading-tight font-semibold">{title}</h2>
          {description && <p className="mt-1.5 text-[13px] leading-normal text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex gap-0.5">{actions}</div>}
      </div>
      <div className="px-5 pt-4 pb-5">{children}</div>
    </section>
  )
}

export function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-0.5 w-5 rounded-full" style={{ backgroundColor: colour }} />
      {label}
    </span>
  )
}
