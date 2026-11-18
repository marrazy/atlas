import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ProductionMonth } from '@/lib/api/types'
import { fakeChart } from '@/test/echarts-stub'
import { volveProduction } from '@/test/fixtures'
import { ProductionCard } from './ProductionCard'

const VOLVE: ProductionMonth[] = [
  ...volveProduction,
  { month: '2016-09', oil_rate: 287.3, gas_rate: 0, gor: null, oe_net_msm3: 0.008 },
]

const renderReady = (months: ProductionMonth[] = VOLVE, name = 'Volve') =>
  render(<ProductionCard fieldName={name} production={{ status: 'ready', data: months }} />)

describe('ProductionCard', () => {
  it('shows the title, the legend with words, and the chart with its spoken description', () => {
    renderReady()
    expect(screen.getByRole('heading', { level: 2, name: 'Production' })).toBeInTheDocument()
    expect(screen.getByText('Oil rate, Sm³/day')).toBeInTheDocument()
    expect(screen.getByText('Gas oil ratio')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName(/^Two linked charts for Volve, February 2008 to September 2016\./)
  })

  it('has no toolbox buttons, as design v2 asks; the zoom bar under the chart is the only zoom', () => {
    renderReady()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    const option = fakeChart.lastOption as { dataZoom: { type: string }[] }
    expect(option.dataZoom.map((z) => z.type)).toEqual(['slider'])
  })

  it('draws the note band when one is given (Volve: output rises again)', () => {
    render(
      <ProductionCard
        fieldName="Volve"
        production={{ status: 'ready', data: VOLVE }}
        note={{ start: '2008-03', end: '2008-05', label: 'Output rises again' }}
      />,
    )
    expect(JSON.stringify(fakeChart.lastOption)).toContain('Output rises again')
  })

  it('says so when the field has no production, with no chart', () => {
    renderReady([], 'Berling')
    expect(screen.getByText('No production reported for this field')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the error when the monthly data could not load', () => {
    render(<ProductionCard fieldName="Volve" production={{ status: 'error', message: 'The server answered with error 500.' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('The server answered with error 500.')
  })

  it('shows a placeholder while loading', () => {
    render(<ProductionCard fieldName="Volve" production={{ status: 'loading' }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
