import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { volve } from '@/test/fixtures'
import { FieldSources } from './FieldSources'

describe('FieldSources', () => {
  it('names where the numbers come from, and Equinor only for the Volve recovery rate', () => {
    const { container } = render(<FieldSources field={volve} />)
    expect(container).toHaveTextContent(
      'Production and investment from Sodir FactPages (NLOD). Recovery rate from Equinor. The economic limit is an example setting. The forecast range is the rough 95% range the API gives for the fit.',
    )
  })

  it('leaves Equinor out for other fields', () => {
    const { container } = render(<FieldSources field={{ ...volve, field_id: 1578840, name: 'Fram' }} />)
    expect(container).toHaveTextContent('Production and investment from Sodir FactPages (NLOD). The economic limit')
    expect(container).not.toHaveTextContent('Equinor')
  })

  it('does not call the forecast range an example setting, because the API calculates it', () => {
    const { container } = render(<FieldSources field={volve} />)
    expect(container).not.toHaveTextContent(/forecast range (is|are) (an )?example/i)
  })

  it('links to the field on Sodir FactPages and says it opens a new tab', () => {
    render(<FieldSources field={volve} />)
    const link = screen.getByRole('link', { name: 'Volve on Sodir FactPages (opens in a new tab)' })
    expect(link).toHaveAttribute('href', volve.factpage_url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
