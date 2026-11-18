import { useId } from 'react'
import { cn } from '@/lib/utils'

type Option = { id: number; name: string }

type Props = {
  options: Option[]
  value: number | null
  onChange: (id: number) => void
}

/** A row of buttons, one per field, and the pressed one is highlighted on both charts. */
export function HighlightPicker({ options, value, onChange }: Props) {
  const labelId = useId()
  if (options.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span id={labelId} className="text-[13px] font-medium">
        Highlight
      </span>
      <div role="group" aria-labelledby={labelId} className="inline-flex flex-wrap gap-0.5 rounded-[10px] bg-muted p-1">
        {options.map((option) => {
          const on = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option.id)}
              className={cn(
                'min-h-9 rounded-md px-3.5 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
