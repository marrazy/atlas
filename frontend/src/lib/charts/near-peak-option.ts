import type { Lifecycle } from '@/lib/api/types'
import { CHART_COLOURS as C, CHART_FONTS as F } from './colours'
import { highlightColour } from './lifecycle-option'

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`

/** Space for each bar, so the chart grows with the number of fields. */
export const BAR_ROW_HEIGHT = 24

export function describeNearPeak(fields: Lifecycle[], highlighted: Lifecycle | null): string {
  const intro = `Bar chart of the number of years each of ${fields.length} fields produced within 10% of its best year.`
  const most = fields[0] ? ` ${fields[0].name} has the most, ${years(fields[0].plateau_years)}.` : ''
  const own = highlighted ? ` ${highlighted.name}, highlighted, has ${years(highlighted.plateau_years)}.` : ''
  return intro + most + own
}

/** The sentence under the bars about the highlighted field, from its lifecycle data. */
export function nearPeakSentence(field: Lifecycle): string {
  return `${field.name} started in ${field.first_year}, had its best year in ${field.peak_year}, and spent ${years(field.plateau_years)} within 10% of that best year.`
}

export function nearPeakOption(fields: Lifecycle[], highlighted: Lifecycle | null) {
  const isOn = (f: Lifecycle) => f.field_id === highlighted?.field_id
  const names = fields.map((f) => f.name)
  const byName = new Map(fields.map((f) => [f.name, f]))

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeNearPeak(fields, highlighted) } },
    textStyle: { fontFamily: F.sans, color: C.foreground },
    grid: { left: 8, right: 32, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: 'value' as const, show: false, minInterval: 1 },
    yAxis: {
      type: 'category' as const,
      inverse: true,
      data: names,
      axisLine: { show: false },
      axisTick: { show: false },
      // the highlighted field's name is bold and brighter, so the bar is found by more than its colour
      axisLabel: {
        formatter: (name: string) => (byName.get(name) && isOn(byName.get(name)!) ? `{on|${name}}` : `{off|${name}}`),
        rich: {
          on: { color: C.foreground, fontFamily: F.sans, fontSize: 12, fontWeight: 700 },
          off: { color: C.mutedForeground, fontFamily: F.sans, fontSize: 12 },
        },
      },
    },
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: C.background,
      borderColor: C.border,
      textStyle: { color: C.foreground, fontFamily: F.sans, fontSize: 12 },
      formatter: ({ name, value }: { name: string; value: number }) => `${name}: ${years(value)} within 10% of its best year`,
    },
    series: [
      {
        name: 'Years near peak',
        type: 'bar' as const,
        barWidth: 15,
        data: fields.map((f) => ({
          value: f.plateau_years,
          itemStyle: { color: isOn(f) ? highlightColour(f) : C.other, borderRadius: 4 },
        })),
        label: { show: true, position: 'right' as const, color: C.mutedForeground, fontFamily: F.mono, fontSize: 11 },
      },
    ],
  }
}
