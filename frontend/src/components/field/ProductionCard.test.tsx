import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

beforeEach(() => {
  fakeChart.dispatchAction.mockClear()
  fakeChart.getDataURL.mockClear()
})

describe('ProductionCard', () => {
  it('shows the title, the legend with words, and the chart with its spoken description', () => {
    renderReady()
    expect(screen.getByRole('heading', { level: 2, name: 'Production' })).toBeInTheDocument()
    expect(screen.getByText('Oil rate')).toBeInTheDocument()
    expect(screen.getByText('Gas oil ratio')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /^Two linked charts for Volve, February 2008 to September 2016\./,
    )
  })

  it('turns area zoom on and off, and says whether it is on', () => {
    renderReady()
    const zoom = screen.getByRole('button', { name: 'Zoom into an area' })
    expect(zoom).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(zoom)
    expect(zoom).toHaveAttribute('aria-pressed', 'true')
    expect(fakeChart.dispatchAction).toHaveBeenLastCalledWith({
      type: 'takeGlobalCursor',
      key: 'dataZoomSelect',
      dataZoomSelectActive: true,
    })

    fireEvent.click(zoom)
    expect(zoom).toHaveAttribute('aria-pressed', 'false')
  })

  it('resets the zoom on both charts and turns area zoom off', () => {
    renderReady()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom into an area' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))
    expect(fakeChart.dispatchAction).toHaveBeenCalledWith({ type: 'dataZoom', start: 0, end: 100 })
    expect(screen.getByRole('button', { name: 'Zoom into an area' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('saves the chart as a PNG named after the field', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderReady(VOLVE, 'Oseberg Øst')
    fireEvent.click(screen.getByRole('button', { name: 'Save as image' }))

    expect(fakeChart.getDataURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'png', pixelRatio: 2 }))
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('oseberg-ost-production.png')
    expect(link.href).toBe('data:image/png;base64,AAAA')
    click.mockRestore()
  })

  it('says so when the field has no production, with no chart and no buttons', () => {
    renderReady([], 'Berling')
    expect(screen.getByText('No production reported for this field.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the error when the monthly data could not load', () => {
    render(<ProductionCard fieldName="Volve" production={{ status: 'error', message: 'The server answered with error 500.' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('The server answered with error 500.')
  })

  it('shows a placeholder, and no buttons, while loading', () => {
    render(<ProductionCard fieldName="Volve" production={{ status: 'loading' }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
