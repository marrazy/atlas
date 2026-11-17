import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'

describe('shadcn Button', () => {
  it('loads through the @ alias and renders a real button', () => {
    render(<Button>Play</Button>)
    expect(screen.getByRole('button', { name: 'Play' })).toBeInstanceOf(HTMLButtonElement)
  })

  it('uses the theme colours, not fixed colours', () => {
    render(<Button>Play</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('lets our own classes win over its defaults (cn merges them)', () => {
    render(<Button className="px-6">Play</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-6')
    expect(button).not.toHaveClass('px-2.5')
  })

  it('can style a link as a button, for navigation later', () => {
    render(
      <Button asChild variant="outline">
        <a href="/lifecycles">Field lifecycles</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Field lifecycles' })
    expect(link).toHaveAttribute('href', '/lifecycles')
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
