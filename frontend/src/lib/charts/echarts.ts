// Only the parts of ECharts the atlas uses, so the rest is left out of the build.
import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  MarkPointComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  MarkPointComponent,
  ToolboxComponent,
  TooltipComponent,
  CanvasRenderer,
])

export { echarts }
