import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fakeChart } from '@/test/echarts-stub'
import { volveInvestments } from '@/test/fixtures'
import { InvestmentCard } from './InvestmentCard'

describe('InvestmentCard', () => {
  it('shows the unit and the total in the description, and the chart with its spoken description', () => {
    render(<InvestmentCard fieldName="Volve" investments={{ status: 'ready', data: volveInvestments }} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Investment by year' })).toBeInTheDocument()
    expect(screen.getByText('Million Norwegian kroner, not adjusted for inflation. 1,937 million in total.')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName(/^Bar chart of Volve investment by year/)
  })

  it('saves the chart as a PNG named after the field', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<InvestmentCard fieldName="Åsgard" investments={{ status: 'ready', data: volveInvestments }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save as image' }))
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('asgard-investment.png')
    expect(fakeChart.getDataURL).toHaveBeenCalled()
    click.mockRestore()
  })

  it('says so when the field has no investment, with no chart and no button', () => {
    render(<InvestmentCard fieldName="Hugin Satellitter" investments={{ status: 'ready', data: [] }} />)
    expect(screen.getByText('No investment reported for this field.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the error when the investments could not load', () => {
    render(<InvestmentCard fieldName="Volve" investments={{ status: 'error', message: 'Could not reach the server.' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
  })
})
