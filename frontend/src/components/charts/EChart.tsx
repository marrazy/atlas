import ReactEChartsCore from 'echarts-for-react/esm/core'
import { useEffect, useMemo, useState, type Ref } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { echarts } from '@/lib/charts/echarts'

export type EChartHandle = InstanceType<typeof ReactEChartsCore>

/**
 * A canvas does not wait for web fonts, so charts are drawn once Inter and IBM Plex Mono are loaded.
 * Otherwise the axis numbers would be drawn in a fallback font.
 */
function useChartFonts(): boolean {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || !document.fonts)

  useEffect(() => {
    if (ready) return
    let current = true
    Promise.all([
      document.fonts.load('11px "IBM Plex Mono"'),
      document.fonts.load('600 11px "IBM Plex Mono"'),
      document.fonts.load('11px "Inter Variable"'),
    ])
      .catch(() => undefined)
      .then(() => current && setReady(true))
    return () => {
      current = false
    }
  }, [ready])

  return ready
}

type EChartProps = {
  option: object
  height: number
  chartRef?: Ref<EChartHandle>
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function EChart({ option, height, chartRef }: EChartProps) {
  const fontsReady = useChartFonts()
  const shown = useMemo(() => (prefersReducedMotion() ? { ...option, animation: false } : option), [option])
  if (!fontsReady) return <Skeleton style={{ height }} className="w-full" />

  return (
    <ReactEChartsCore
      ref={chartRef}
      echarts={echarts}
      option={shown}
      notMerge
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
