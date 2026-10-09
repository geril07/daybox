import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlannerStore } from '@/modules/planner'
import { useTaskStore } from '@/modules/tasks'

import { App } from './App'

const serverAuth = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
}))

type AudioContextMockApi = {
  instances: unknown[]
  reset: () => void
}

const getAudioContextMock = () => AudioContext as unknown as AudioContextMockApi

vi.mock('@/shared/google-drive/server-auth', () => ({
  startAuth: vi.fn(),
  refreshAccessToken: vi.fn(),
  disconnectAuth: vi.fn(),
  getAuthStatus: serverAuth.getAuthStatus,
}))

vi.mock('@/modules/google-drive', () => ({
  useGoogleDriveStore: {
    getState: vi.fn(() => ({ hydrateFromStatus: vi.fn() })),
    setState: vi.fn(),
  },
  GoogleDrivePanel: () => null,
}))

beforeEach(() => {
  cleanup()
  useTaskStore.setState({ tasks: [], series: [] })
  usePlannerStore.setState({
    weekStartDay: 1,
    dayStartMinutes: 0,
    browseDate: null,
  })
  getAudioContextMock().reset()
  serverAuth.getAuthStatus.mockReset().mockResolvedValue({
    connected: false,
    email: null,
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('App shell boot hydration', () => {
  it('generates the new week at the planner boundary without reload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 12, 2, 29))
    usePlannerStore.setState({ dayStartMinutes: 150 })
    useTaskStore.getState().addSeries({ title: 'Monday work', weekdays: [1] })
    const { unmount } = render(<App />)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(
      useTaskStore.getState().tasks.map((task) => task.occurrenceDate),
    ).toEqual(['2026-10-12'])
    expect(screen.getByText('Monday work')).toBeTruthy()
    unmount()
    const tasks = useTaskStore.getState().tasks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7 * 24 * 60 * 60_000)
    })
    expect(useTaskStore.getState().tasks).toBe(tasks)
  })

  it('refreshes the view at rollover even when no series generates a task', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 6, 2, 29))
    usePlannerStore.setState({ dayStartMinutes: 150 })
    useTaskStore.getState().addTask('Next day', undefined, '2026-10-06')
    render(<App />)
    expect(screen.queryByText('Next day')).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(screen.getByText('Next day')).toBeTruthy()
  })

  it('refreshes on focus, visibility, and planner preference changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 12, 2, 29))
    usePlannerStore.setState({ dayStartMinutes: 150 })
    useTaskStore.getState().addSeries({ title: 'Monday work', weekdays: [1] })
    render(<App />)
    vi.setSystemTime(new Date(2026, 9, 12, 2, 30))
    fireEvent(window, new Event('focus'))
    expect(useTaskStore.getState().tasks).toHaveLength(1)
    act(() => useTaskStore.setState({ tasks: [] }))
    fireEvent(document, new Event('visibilitychange'))
    expect(useTaskStore.getState().tasks).toHaveLength(1)
    act(() => useTaskStore.setState({ tasks: [] }))
    act(() => usePlannerStore.getState().setWeekStartDay(0))
    expect(useTaskStore.getState().tasks).toHaveLength(1)
    act(() => useTaskStore.setState({ tasks: [] }))
    act(() => usePlannerStore.getState().setDayStartMinutes(0))
    expect(useTaskStore.getState().tasks).toHaveLength(1)
  })
  it('calls getAuthStatus on mount and hydrates the store', async () => {
    serverAuth.getAuthStatus.mockResolvedValue({
      connected: true,
      email: 'me@example.com',
    })
    render(<App />)

    await waitFor(() => {
      expect(serverAuth.getAuthStatus).toHaveBeenCalledTimes(1)
    })
  })

  it('clears the connected query param and re-fetches status', async () => {
    window.history.replaceState(null, '', '/?connected=1')
    serverAuth.getAuthStatus.mockResolvedValue({
      connected: true,
      email: 'me@example.com',
    })

    render(<App />)

    await waitFor(() => {
      expect(window.location.search).toBe('')
    })
    expect(serverAuth.getAuthStatus).toHaveBeenCalledTimes(1)
  })

  it('clears the failed connected query param', async () => {
    window.history.replaceState(null, '', '/?connected=0')

    render(<App />)

    await waitFor(() => {
      expect(window.location.search).toBe('')
    })
  })

  it('does not unlock audio for untrusted synthetic interactions', () => {
    render(<App />)

    fireEvent(window, new Event('pointerdown'))
    fireEvent(window, new KeyboardEvent('keydown', { key: 'a' }))

    expect(getAudioContextMock().instances).toHaveLength(0)
  })

  it('unlocks audio for a trusted pointer interaction', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    render(<App />)

    const pointerListener = addEventListenerSpy.mock.calls.find(
      ([type]) => type === 'pointerdown',
    )?.[1]
    expect(pointerListener).toEqual(expect.any(Function))
    ;(pointerListener as EventListener)({ isTrusted: true } as Event)

    expect(getAudioContextMock().instances).toHaveLength(1)
  })
})
