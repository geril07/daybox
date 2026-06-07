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

class AudioContextMock {
  state = 'running'
  currentTime = 0
  destination = {}
  resume(): void {}
  createOscillator() {
    return {
      type: 'sine' as OscillatorType,
      frequency: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
      start: () => {},
      stop: () => {},
    }
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    }
  }
}

vi.stubGlobal('AudioContext', AudioContextMock)
