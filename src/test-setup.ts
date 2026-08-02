import '@testing-library/jest-dom/vitest'
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

type AudioOscillatorMock = {
  type: OscillatorType
  frequency: {
    setValueAtTime: (...args: unknown[]) => unknown
    linearRampToValueAtTime: (...args: unknown[]) => unknown
    exponentialRampToValueAtTime: (...args: unknown[]) => unknown
  }
  connect: (...args: unknown[]) => unknown
  start: (...args: unknown[]) => unknown
  stop: (...args: unknown[]) => unknown
}

class AudioContextMock {
  static instances: AudioContextMock[] = []
  static initialState: AudioContextState = 'running'
  static resumeBehavior: 'resolve' | 'resolveSuspended' | 'reject' | 'pending' =
    'resolve'
  static oscillatorBehavior: 'create' | 'throw' = 'create'
  static pendingResumes: Array<() => void> = []

  state: AudioContextState
  currentTime = 0
  destination = {}
  oscillators: AudioOscillatorMock[] = []

  constructor() {
    this.state = AudioContextMock.initialState
    AudioContextMock.instances.push(this)
  }

  resume = vi.fn((): Promise<void> => {
    if (AudioContextMock.resumeBehavior === 'reject') {
      return Promise.reject(new Error('AudioContext resume rejected'))
    }

    if (AudioContextMock.resumeBehavior === 'pending') {
      return new Promise<void>((resolve) => {
        AudioContextMock.pendingResumes.push(() => {
          this.state = 'running'
          resolve()
        })
      })
    }

    if (AudioContextMock.resumeBehavior === 'resolveSuspended') {
      return Promise.resolve()
    }

    this.state = 'running'
    return Promise.resolve()
  })

  createOscillator(): AudioOscillatorMock {
    if (AudioContextMock.oscillatorBehavior === 'throw') {
      throw new Error('Audio graph creation failed')
    }

    const oscillator = {
      type: 'sine' as OscillatorType,
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
    this.oscillators.push(oscillator)
    return oscillator
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }
  }

  static reset() {
    AudioContextMock.instances = []
    AudioContextMock.initialState = 'running'
    AudioContextMock.resumeBehavior = 'resolve'
    AudioContextMock.oscillatorBehavior = 'create'
    AudioContextMock.pendingResumes = []
  }

  static resolvePendingResumes() {
    const pending = AudioContextMock.pendingResumes.splice(0)
    pending.forEach((resolve) => resolve())
  }
}

AudioContextMock.reset()

vi.stubGlobal('AudioContext', AudioContextMock)

const matchMediaMock = vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))
vi.stubGlobal('matchMedia', matchMediaMock)
