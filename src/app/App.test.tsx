import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  it('shows a series created in Settings without reload or a timer tick', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recurring' }))
    fireEvent.change(screen.getByLabelText('New recurring task'), {
      target: { value: 'Daily exercise' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add series' }))
    expect(
      useTaskStore.getState().tasks.map((task) => task.occurrenceDate),
    ).toEqual(['2026-10-09', '2026-10-10', '2026-10-11'])
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(
      within(screen.getByRole('main')).getByText('Daily exercise'),
    ).toBeTruthy()
  })

  it('generates missing occurrences on reactivation without duplicating existing tasks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    const series = useTaskStore.getState().addSeries({
      title: 'Exercise',
      weekdays: [5, 6],
    })!
    useTaskStore.getState().setSeriesActive(series.id, false)
    render(<App />)
    expect(useTaskStore.getState().tasks).toEqual([])
    act(() => useTaskStore.getState().setSeriesActive(series.id, true))
    expect(
      useTaskStore.getState().tasks.map((task) => task.occurrenceDate),
    ).toEqual(['2026-10-09', '2026-10-10'])
    const existing = useTaskStore.getState().tasks
    act(() => useTaskStore.getState().setSeriesActive(series.id, false))
    act(() => useTaskStore.getState().setSeriesActive(series.id, true))
    expect(useTaskStore.getState().tasks).toEqual(existing)
  })

  it('generates newly selected weekdays while preserving existing occurrences', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    const series = useTaskStore.getState().addSeries({
      title: 'Exercise',
      weekdays: [5],
      pomoEstimate: 2,
    })!
    render(<App />)
    const friday = useTaskStore.getState().tasks[0]
    act(() =>
      useTaskStore.getState().updateSeries(series.id, {
        title: 'Stretching',
        weekdays: [5, 6],
        pomoEstimate: 3,
      }),
    )
    expect(useTaskStore.getState().tasks).toEqual([
      friday,
      expect.objectContaining({
        title: 'Stretching',
        occurrenceDate: '2026-10-10',
        pomoEstimate: 3,
      }),
    ])
    act(() =>
      useTaskStore.getState().updateSeries(series.id, { weekdays: [6] }),
    )
    expect(useTaskStore.getState().tasks[0]).toEqual(friday)
    expect(useTaskStore.getState().tasks).toHaveLength(2)
  })

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
