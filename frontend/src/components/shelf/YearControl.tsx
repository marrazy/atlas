import { PauseIcon, PlayIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

/** Time between years while playing, like the design. */
const STEP_MS = 220

type Props = {
  year: number
  min: number
  max: number
  onYearChange: (year: number) => void
  /** How many fields had production in the year, counted from `producing_years`. */
  producing: number
}

/** Design v2 slider row: play button, the year slider, and the chosen year with its count on the right. */
export function YearControl({ year, min, max, onYearChange, producing }: Props) {
  const id = useId()
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      const next = Math.min(year + 1, max)
      onYearChange(next)
      if (next >= max) setPlaying(false)
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [playing, year, max, onYearChange])

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (year >= max) onYearChange(min)
    setPlaying(true)
  }

  const percent = max > min ? ((year - min) / (max - min)) * 100 : 100

  return (
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play through the years'}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-foreground transition-colors hover:bg-raised"
      >
        {playing ? (
          <PauseIcon aria-hidden="true" strokeWidth={1.5} className="size-4" />
        ) : (
          <PlayIcon aria-hidden="true" strokeWidth={1.5} className="size-4" />
        )}
      </button>
      <div className="order-last flex min-w-0 basis-full flex-col gap-2 sm:order-none sm:flex-[1_1_260px] sm:basis-auto">
        <label htmlFor={id} className="text-[13px] text-text-2">
          Year
        </label>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={year}
          onChange={(event) => {
            setPlaying(false)
            onYearChange(Number(event.target.value))
          }}
          className="year-slider h-1 w-full cursor-pointer appearance-none rounded-full"
          style={{ background: `linear-gradient(to right, var(--text) ${percent}%, var(--raised) ${percent}%)` }}
        />
        <div aria-hidden="true" className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1 sm:ml-0">
        <span aria-hidden="true" className="text-[32px] leading-none font-medium tabular-nums">
          {year}
        </span>
        {/* while playing, a new sentence every 220 ms would flood a screen reader, so it only speaks when paused */}
        <p aria-live={playing ? 'off' : 'polite'} className="text-xs text-text-2">
          <span className="sr-only">In {year}, </span>
          {producing} {producing === 1 ? 'field' : 'fields'} producing
        </p>
      </div>
    </div>
  )
}
