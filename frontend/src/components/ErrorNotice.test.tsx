import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorNotice } from './ErrorNotice'

describe('ErrorNotice', () => {
  it('shows the message as an alert', () => {
    render(<ErrorNotice message="Could not reach the server." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
  })

  it('has no "Try again" button when there is nothing to try again', () => {
    render(<ErrorNotice message="No field with id 1." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('has a "Try again" button that loads the data again', () => {
    const onRetry = vi.fn()
    render(<ErrorNotice message="Could not reach the server." onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
