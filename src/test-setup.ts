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

class NotificationMock {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(
    async () => 'granted' as NotificationPermission,
  )
  static instances: NotificationMock[] = []

  onclick: ((this: Notification, ev: Event) => unknown) | null = null
  title: string
  options?: NotificationOptions

  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.options = options
    NotificationMock.instances.push(this)
  }
}

vi.stubGlobal('Notification', NotificationMock)

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

const matchMediaMock = vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))
vi.stubGlobal('matchMedia', matchMediaMock)
