import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { volve } from '@/test/fixtures'
import { FieldSources } from './FieldSources'

describe('FieldSources', () => {
  it('names where the numbers come from, and Equinor only for the Volve recovery rate', () => {
    const { container } = render(<FieldSources field={volve} />)
    expect(container).toHaveTextContent(
      'Production and investment from the Norwegian Offshore Directorate (Sodir), NLOD. Recovery rate from Equinor. The economic limit and forecast range are example settings, not Equinor figures.',
    )
  })

  it('leaves Equinor out for other fields', () => {
    const { container } = render(<FieldSources field={{ ...volve, field_id: 1578840, name: 'Fram' }} />)
    expect(container).toHaveTextContent(
      'Production and investment from the Norwegian Offshore Directorate (Sodir), NLOD. The economic limit and forecast range are example settings.',
    )
    expect(container).not.toHaveTextContent('Equinor')
  })

  it('credits Sodir, so it can stand in for the usual credit line under the page', () => {
    render(<FieldSources field={volve} />)
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Norwegian Offshore Directorate (Sodir), NLOD')
  })

  it('links to the field on Sodir FactPages and says it opens a new tab', () => {
    render(<FieldSources field={volve} />)
    const link = screen.getByRole('link', { name: 'Volve on Sodir FactPages (opens in a new tab)' })
    expect(link).toHaveAttribute('href', volve.factpage_url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
