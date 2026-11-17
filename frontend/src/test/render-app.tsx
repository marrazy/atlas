import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { AppRoutes } from '@/App'

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

/** Renders the whole app, sidebar and header included, as if the browser opened `path`. */
export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <CurrentPath />
    </MemoryRouter>,
  )
}

export function currentPath(): string | null {
  return screen.getByTestId('path').textContent
}

export function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}
