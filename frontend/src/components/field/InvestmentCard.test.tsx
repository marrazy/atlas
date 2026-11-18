import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { volveInvestments } from '@/test/fixtures'
import { InvestmentCard } from './InvestmentCard'

describe('InvestmentCard', () => {
  it('has a title only, the unit at the right of the legend row, and the chart with its spoken description', () => {
    render(<InvestmentCard fieldName="Volve" investments={{ status: 'ready', data: volveInvestments }} />)
    const heading = screen.getByRole('heading', { level: 2, name: 'Investment by year' })
    expect(heading.parentElement!.querySelectorAll('p')).toHaveLength(0)
    expect(screen.getByText('Million NOK, not adjusted for inflation')).toHaveClass('text-muted-foreground')
    expect(screen.getByRole('img')).toHaveAccessibleName(/^Bar chart of Volve investment by year/)
  })

  it('has no toolbox buttons, as design v2 asks', () => {
    render(<InvestmentCard fieldName="Volve" investments={{ status: 'ready', data: volveInvestments }} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says so when the field has no investment, with no chart', () => {
    render(<InvestmentCard fieldName="Hugin Satellitter" investments={{ status: 'ready', data: [] }} />)
    expect(screen.getByText('No investment reported for this field')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the error when the investments could not load', () => {
    render(<InvestmentCard fieldName="Volve" investments={{ status: 'error', message: 'Could not reach the server.' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
  })
})
