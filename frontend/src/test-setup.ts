import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { fakeChart } from './test/echarts-stub'

vi.mock('echarts-for-react/esm/core', () => import('./test/echarts-stub'))
vi.mock('maplibre-gl', () => import('./test/maplibre-stub'))

// jsdom has no matchMedia. The sidebar uses it to tell phones from desktops,
// and reads window.innerWidth for the answer, so tests set innerWidth instead.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom also lacks these two. The popover and the searchable field list call them.
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}

afterEach(() => {
  cleanup()
  fakeChart.options.length = 0
})
