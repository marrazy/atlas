import ReactEChartsCore from 'echarts-for-react/esm/core'
import { useEffect, useMemo, useState, type Ref } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { echarts } from '@/lib/charts/echarts'

export type EChartHandle = InstanceType<typeof ReactEChartsCore>

/**
 * A canvas does not wait for web fonts, so charts are drawn once Geist and Geist Mono are loaded.
 * Otherwise the axis numbers would be drawn in a fallback font.
 */
function useChartFonts(): boolean {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || !document.fonts)

  useEffect(() => {
    if (ready) return
    let current = true
    Promise.all([
      document.fonts.load('11px "Geist Mono Variable"'),
      document.fonts.load('12px "Geist Variable"'),
      document.fonts.load('500 12px "Geist Variable"'),
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
  /**
   * True (the default) draws each new option from scratch. False merges it into the chart that is
   * already there, so a small change such as a moving year line does not redraw everything.
   */
  replace?: boolean
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function EChart({ option, height, chartRef, replace = true }: EChartProps) {
  const fontsReady = useChartFonts()
  const shown = useMemo(() => (prefersReducedMotion() ? { ...option, animation: false } : option), [option])
  if (!fontsReady) return <Skeleton style={{ height }} className="w-full" />

  return (
    <ReactEChartsCore
      ref={chartRef}
      echarts={echarts}
      option={shown}
      notMerge={replace}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
