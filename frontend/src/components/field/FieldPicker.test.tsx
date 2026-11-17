import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { fields as realFields } from '@/test/fixtures'
import { FieldPicker } from './FieldPicker'

const field = (field_id: number, name: string): FieldSummary => ({ ...realFields[0], field_id, name })

const FIELDS: ApiState<FieldSummary[]> = {
  status: 'ready',
  data: [
    field(3420717, 'Volve'),
    field(43765, 'Åsgard'),
    field(42002473, 'Berling'),
    field(1, 'Ærfugl Nord'),
    field(2, 'Oseberg'),
    field(3, 'Bøyla'),
  ],
}

function renderPicker(fields: ApiState<FieldSummary[]> = FIELDS, currentName?: string) {
  const onSelect = vi.fn()
  render(<FieldPicker fields={fields} currentId={3420717} currentName={currentName} onSelect={onSelect} />)
  return onSelect
}

function open() {
  fireEvent.click(screen.getByRole('button', { name: /Field/ }))
  return screen.getByRole('dialog')
}

const optionNames = (list: HTMLElement) => within(list).queryAllByRole('option').map((o) => o.textContent)

describe('FieldPicker', () => {
  it('shows the current field on the button, with "Field" as its label', () => {
    renderPicker()
    expect(screen.getByRole('button', { name: 'Field Volve' })).toBeInTheDocument()
  })

  it('uses the name it was given while the list of fields is still loading', () => {
    renderPicker({ status: 'loading' }, 'Volve')
    expect(screen.getByRole('button', { name: 'Field Volve' })).toBeInTheDocument()
  })

  it('lists every field in Norwegian alphabetical order, with Æ, Ø and Å last', () => {
    renderPicker()
    expect(optionNames(open())).toEqual(['Berling', 'Bøyla', 'Oseberg', 'Volve', 'Ærfugl Nord', 'Åsgard'])
  })

  it('ticks the field that is open now', () => {
    renderPicker()
    const list = open()
    expect(within(list).getByRole('option', { name: 'Volve' })).toHaveAttribute('data-checked', 'true')
    expect(within(list).getByRole('option', { name: 'Berling' })).toHaveAttribute('data-checked', 'false')
  })

  it('finds Åsgard and Bøyla when typed without Norwegian letters', () => {
    renderPicker()
    const list = open()
    const search = within(list).getByRole('combobox', { name: 'Search fields' })

    fireEvent.change(search, { target: { value: 'asgard' } })
    expect(optionNames(list)).toEqual(['Åsgard'])

    fireEvent.change(search, { target: { value: 'boy' } })
    expect(optionNames(list)).toEqual(['Bøyla'])
  })

  it('says so when no field matches', () => {
    renderPicker()
    const list = open()
    fireEvent.change(within(list).getByRole('combobox'), { target: { value: 'troll' } })
    expect(optionNames(list)).toEqual([])
    expect(within(list).getByText('No field matches.')).toBeInTheDocument()
  })

  it('gives the chosen field id and closes', () => {
    const onSelect = renderPicker()
    fireEvent.click(within(open()).getByRole('option', { name: 'Åsgard' }))
    expect(onSelect).toHaveBeenCalledWith(43765)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says the list is loading, or why it failed', () => {
    renderPicker({ status: 'loading' })
    expect(within(open()).getByText('Loading fields…')).toBeInTheDocument()
  })

  it('shows the error message when the list could not load', () => {
    renderPicker({ status: 'error', message: 'Could not reach the server. Check your connection and try again.' })
    expect(within(open()).getByText(/Could not reach the server/)).toBeInTheDocument()
  })
})
