import { vi } from 'vitest'

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  // ResizeObserver takes a callback; the mock ignores it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: ResizeObserverCallback) {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
