import { CHART_COLOURS } from './colours'

type ChartWithImage = { getDataURL: (options: { type: 'png'; pixelRatio: number; backgroundColor: string }) => string }

/** Downloads the chart as a PNG at double resolution, on the card colour so it reads well outside the page. */
export function saveChartImage(chart: ChartWithImage | undefined, fileName: string) {
  const url = chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: CHART_COLOURS.card })
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}
