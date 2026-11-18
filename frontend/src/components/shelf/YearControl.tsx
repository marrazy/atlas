import { PauseIcon, PlayIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

/** Time between years while playing, like the design. */
const STEP_MS = 220

type Props = {
  year: number
  min: number
  max: number
  onYearChange: (year: number) => void
  /** How many fields had production in the year, shown under the slider. */
  producing: number
  /** How many of those fields have no circle, because the data has no location for them. */
  notMapped?: number
}

export function YearControl({ year, min, max, onYearChange, producing, notMapped = 0 }: Props) {
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
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play through the years'}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {playing ? <PauseIcon aria-hidden="true" className="size-4" /> : <PlayIcon aria-hidden="true" className="size-4" />}
        </button>
        <div className="order-last flex min-w-0 basis-full flex-col gap-2 sm:order-none sm:flex-[1_1_260px] sm:basis-auto">
          <label htmlFor={id} className="text-[13px] font-medium">
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-foreground [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-foreground [&::-webkit-slider-thumb]:bg-background focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-ring/25"
            style={{ background: `linear-gradient(to right, var(--foreground) ${percent}%, var(--muted) ${percent}%)` }}
          />
          <div aria-hidden="true" className="flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
        <span aria-hidden="true" className="ml-auto min-w-[84px] text-right text-[32px] font-bold tracking-heading tabular-nums sm:ml-0">
          {year}
        </span>
      </div>
      {/* while playing, a new sentence every 220 ms would flood a screen reader, so it only speaks when paused */}
      <p aria-live={playing ? 'off' : 'polite'} className="mt-2 text-[13px] text-muted-foreground">
        {producing} {producing === 1 ? 'field' : 'fields'} had production in {year}.
        {notMapped > 0 &&
          ` ${notMapped} of them ${notMapped === 1 ? 'has' : 'have'} no location in the data, so ${notMapped === 1 ? 'it is' : 'they are'} not on the map.`}
      </p>
    </div>
  )
}
