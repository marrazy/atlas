import { useId } from 'react'
import { SEGMENT_BUTTON, SEGMENT_OFF, SEGMENT_ON, SEGMENT_TRACK } from '@/components/segmented'
import { cn } from '@/lib/utils'

type Option = { id: number; name: string }

type Props = {
  options: Option[]
  value: number | null
  onChange: (id: number) => void
}

/** A segmented control, one button per field, and the pressed one is highlighted on both charts. */
export function HighlightPicker({ options, value, onChange }: Props) {
  const labelId = useId()
  if (options.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span id={labelId} className="text-[13px] text-text-2">
        Highlight
      </span>
      <div role="group" aria-labelledby={labelId} className={SEGMENT_TRACK}>
        {options.map((option) => {
          const on = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option.id)}
              className={cn(SEGMENT_BUTTON, on ? SEGMENT_ON : SEGMENT_OFF)}
            >
              {option.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
