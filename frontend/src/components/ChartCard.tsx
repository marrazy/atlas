import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ChartCardProps = {
  title: string
  /** Controls at the right of the title, such as the decline model tabs. */
  actions?: ReactNode
  /** True while the card's data loads. Its grey placeholders say nothing to screen readers, so the card says "Loading". */
  busy?: boolean
  className?: string
  children: ReactNode
}

/** Design v2 card: a title only, no description line. A chart's unit goes at the right end of its legend row. */
export function ChartCard({ title, actions, busy = false, className, children }: ChartCardProps) {
  return (
    <section
      className={cn('min-w-0 rounded-[14px] border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
        <h2 className="min-w-0 text-[15px] leading-5 font-medium">{title}</h2>
        {actions && <div className="flex gap-0.5">{actions}</div>}
      </div>
      <div className="px-6 pt-4 pb-6">
        {busy && <p className="sr-only">Loading</p>}
        {children}
      </div>
    </section>
  )
}

export type LegendSwatch =
  | { kind: 'dot' | 'square' | 'ring'; colour: string }
  | { kind: 'line'; colour: string; dashed?: boolean; width?: number }
  | { kind: 'band'; colour: string }

function Swatch({ swatch }: { swatch: LegendSwatch }) {
  switch (swatch.kind) {
    case 'dot':
      return <circle cx="5" cy="5" r="4" fill={swatch.colour} />
    case 'square':
      return <rect x="0" y="0" width="10" height="10" rx="2" fill={swatch.colour} />
    case 'ring':
      return <circle cx="5" cy="5" r="3.75" fill="none" stroke={swatch.colour} strokeWidth={1.5} />
    case 'band':
      return <rect x="0" y="1" width="16" height="8" rx="2" fill={swatch.colour} fillOpacity={0.16} />
    case 'line':
      return (
        <line
          x1="0"
          y1="5"
          x2="16"
          y2="5"
          stroke={swatch.colour}
          strokeWidth={swatch.width ?? 1.5}
          strokeDasharray={swatch.dashed ? '3 2' : undefined}
        />
      )
  }
}

export type LegendEntry = { label: string; swatch: LegendSwatch }

/** One legend row: 12px items 16px apart, and the chart's unit at the far right. It wraps on narrow screens. */
export function Legend({ items, unit }: { items: LegendEntry[]; unit?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map(({ label, swatch }) => (
          <li key={label} className="inline-flex items-center gap-2 text-xs text-text-2">
            <svg
              aria-hidden="true"
              width={swatch.kind === 'line' || swatch.kind === 'band' ? 16 : 10}
              height="10"
              className="shrink-0"
            >
              <Swatch swatch={swatch} />
            </svg>
            {label}
          </li>
        ))}
      </ul>
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  )
}
