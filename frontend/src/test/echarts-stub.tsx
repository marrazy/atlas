import { Component, type CSSProperties } from 'react'
import { vi } from 'vitest'

/** What the stand-in chart was last given, and a fake ECharts instance for the card's buttons. */
export const fakeChart = {
  lastOption: null as unknown,
  lastNotMerge: undefined as boolean | undefined,
  dispatchAction: vi.fn(),
  getDataURL: vi.fn(() => 'data:image/png;base64,AAAA'),
}

type Props = { option: { aria?: { label?: { description?: string } } }; style?: CSSProperties; notMerge?: boolean }

/**
 * jsdom cannot draw on a canvas, so tests use this in place of echarts-for-react.
 * It shows the chart's spoken description, like ECharts does on the real chart.
 */
export default class EChartsStub extends Component<Props> {
  getEchartsInstance() {
    return fakeChart
  }

  render() {
    fakeChart.lastOption = this.props.option
    fakeChart.lastNotMerge = this.props.notMerge
    return <div role="img" aria-label={this.props.option.aria?.label?.description} style={this.props.style} />
  }
}
