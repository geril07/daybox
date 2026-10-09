import { render, cleanup, fireEvent, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'
import { registerShortcuts } from '@/shared/keyboard'

import { unlockAudio } from '../alarm'
import { clearIntervalNotification } from '../notifications'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '../store'
import { TimerBar } from './TimerBar'

type NotificationMock = typeof Notification & {
  permission: NotificationPermission
  instances: Array<
    Notification & { title: string; options?: NotificationOptions }
  >
}

const getNotificationMock = () => Notification as unknown as NotificationMock

type AudioContextMockApi = {
  initialState: AudioContextState
  oscillatorBehavior: 'create' | 'throw'
  instances: Array<{
    state: AudioContextState
    oscillators: unknown[]
  }>
}

const getAudioContextMock = () => AudioContext as unknown as AudioContextMockApi

beforeEach(() => {
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    intervalDurationMin: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
  const notification = getNotificationMock()
  notification.permission = 'default'
  notification.instances = []
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
})

afterEach(() => {
  clearIntervalNotification()
  cleanup()
  vi.restoreAllMocks()
})

function createTask(overrides = {}) {
  return {
    id: 'test-1',
    title: 'Test Task',
    groupId: 'default',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    seriesId: null,
    occurrenceDate: null,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function fireFocusComplete(taskId: string) {
  const focusMs = useTimerStore.getState().settings.focusDuration * 60 * 1000
  useTimerStore.setState({
    phase: 'focus',
    focusedTaskId: taskId,
    startedAt: Date.now() - 1000,
    elapsed: focusMs + 1,
    isRunning: true,
  })
}

describe('TimerBar', () => {
  describe('session progress', () => {
    it('uses Space to open and edit progress instead of the timer shortcut', async () => {
      const user = userEvent.setup()
      const toggle = vi.fn()
      const unregister = registerShortcuts({ ' ': toggle })
      try {
        useTimerStore.setState({ sessionPomoCount: 2 })
        render(<TimerBar />)
        screen.getByRole('button', { name: /Adjust cycle progress/ }).focus()
        await user.keyboard(' ')
        expect(screen.getByRole('dialog')).toBeTruthy()
        screen.getByRole('button', { name: 'Decrease cycle progress' }).focus()
        await user.keyboard(' ')
        expect(useTimerStore.getState().sessionPomoCount).toBe(1)
        expect(toggle).not.toHaveBeenCalled()
      } finally {
        unregister()
      }
    })

    it('restores progress after reset without changing task totals', async () => {
      const user = userEvent.setup()
      const task = createTask({ pomoCompleted: 3 })
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({ sessionPomoCount: 3, focusedTaskId: task.id })
      render(<TimerBar />)

      await user.click(screen.getByRole('button', { name: 'Reset session' }))
      await user.click(
        screen.getByRole('button', { name: /Adjust cycle progress/ }),
      )
      expect(
        screen.getByRole('button', { name: 'Decrease cycle progress' }),
      ).toBeDisabled()
      const increase = screen.getByRole('button', {
        name: 'Increase cycle progress',
      })
      await user.click(increase)
      await user.click(increase)
      await user.click(increase)
      expect(useTimerStore.getState().sessionPomoCount).toBe(3)
      expect(
        screen.getByRole('button', { name: /Adjust cycle progress/ }),
      ).toHaveTextContent('3 of 4 · long next')
      expect(useTaskStore.getState().tasks[0]?.pomoCompleted).toBe(3)

      await user.click(increase)
      expect(increase).toBeDisabled()
      await user.click(
        screen.getByRole('button', { name: 'Decrease cycle progress' }),
      )
      expect(useTimerStore.getState().sessionPomoCount).toBe(3)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(
        screen.getByRole('button', { name: /Adjust cycle progress/ }),
      ).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Skip' }))
      expect(useTimerStore.getState().phase).toBe('longBreak')
    })

    it.each([
      ['focus', 0, '0 of 4'],
      ['focus', 2, '2 of 4'],
      ['shortBreak', 2, '2 of 4'],
      ['focus', 3, '3 of 4 · long next'],
      ['shortBreak', 3, '3 of 4 · long next'],
      ['focus', 4, '4 of 4 · long next'],
      ['focus', 5, '5 of 4 · long next'],
      ['focus', 7, '7 of 4 · long next'],
      ['shortBreak', 7, '7 of 4 · long next'],
      ['longBreak', 4, 'long break'],
      ['longBreak', 7, 'long break'],
    ] as const)(
      'keeps the existing cycle text in %s at count %i',
      (phase, count, label) => {
        useTimerStore.setState({ phase, sessionPomoCount: count })
        render(<TimerBar />)
        expect(
          screen.getByRole('button', { name: /Adjust cycle progress/ }),
        ).toHaveTextContent(label)
      },
    )

    it.each(['skip', 'completion'] as const)(
      'takes the promised long break on focus %s with an excess count',
      (action) => {
        useTimerStore.setState({ sessionPomoCount: 5 })
        render(<TimerBar />)
        expect(
          screen.getByRole('button', { name: /Adjust cycle progress/ }),
        ).toHaveTextContent('5 of 4 · long next')

        if (action === 'skip') {
          fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
        } else {
          act(() => {
            useTimerStore.setState({
              elapsed: DEFAULT_TIMER_SETTINGS.focusDuration * 60_000,
              startedAt: Date.now(),
              isRunning: true,
            })
          })
        }

        expect(useTimerStore.getState().phase).toBe('longBreak')
        expect(useTimerStore.getState().sessionPomoCount).toBe(6)
        expect(screen.getByText('long break', { exact: true })).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
        expect(useTimerStore.getState().phase).toBe('focus')
        expect(useTimerStore.getState().sessionPomoCount).toBe(0)
        expect(
          screen.getByRole('button', { name: /Adjust cycle progress/ }),
        ).toHaveTextContent('0 of 4')
      },
    )

    it('updates progress without losing completions when the interval is reduced', () => {
      useTimerStore.setState({
        sessionPomoCount: 5,
        settings: { ...DEFAULT_TIMER_SETTINGS, longBreakInterval: 8 },
      })
      render(<TimerBar />)
      expect(
        screen.getByRole('button', { name: /Adjust cycle progress/ }),
      ).toHaveTextContent('5 of 8')

      act(() => {
        useTimerStore.getState().setTimerSettings({ longBreakInterval: 4 })
      })

      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(5)
      expect(
        screen.getByRole('button', { name: /Adjust cycle progress/ }),
      ).toHaveTextContent('5 of 4 · long next')
    })
  })

  describe('document title', () => {
    it.each([
      ['focus', 'Focus', '24:00'],
      ['shortBreak', 'Short break', '04:00'],
      ['longBreak', 'Long break', '14:00'],
    ] as const)(
      'follows start, pause, and reset for %s',
      (phase, label, clock) => {
        useTimerStore.getState().setPhase(phase)
        render(<TimerBar />)
        expect(document.title).toBe(`${label} ready — DayBox`)

        act(() => {
          useTimerStore.setState({ elapsed: 60_000 })
          useTimerStore.getState().start()
        })
        expect(document.title).toBe(`${clock} · ${label} — DayBox`)

        act(() => useTimerStore.getState().pause())
        expect(document.title).toBe(`Paused · ${label} — DayBox`)

        act(() => useTimerStore.getState().reset())
        expect(document.title).toBe(`${label} ready — DayBox`)
      },
    )

    it.each([
      ['focus', 0, false, 'Short break ready — DayBox'],
      ['focus', 3, false, 'Long break ready — DayBox'],
      ['shortBreak', 1, false, 'Focus ready — DayBox'],
      ['longBreak', 4, false, 'Focus ready — DayBox'],
      ['focus', 0, true, '05:00 · Short break — DayBox'],
      ['focus', 3, true, '15:00 · Long break — DayBox'],
      ['shortBreak', 1, true, '25:00 · Focus — DayBox'],
      ['longBreak', 4, true, '25:00 · Focus — DayBox'],
    ] as const)(
      'updates after %s completes (count %i, auto-start %s)',
      (phase, sessionPomoCount, autoStart, title) => {
        useTimerStore.setState({
          phase,
          sessionPomoCount,
          elapsed: 180 * 60_000,
          startedAt: Date.now(),
          isRunning: true,
          settings: {
            ...DEFAULT_TIMER_SETTINGS,
            autoStartBreaks: autoStart,
            autoStartPomodoros: autoStart,
          },
        })
        render(<TimerBar />)
        expect(document.title).toBe(title)
      },
    )

    it('shows focus ready for a fresh session and after resetting the session', () => {
      render(<TimerBar />)
      expect(document.title).toBe('Focus ready — DayBox')

      act(() => useTimerStore.getState().setPhase('longBreak'))
      expect(document.title).toBe('Long break ready — DayBox')

      act(() => useTimerStore.getState().resetSession())
      expect(document.title).toBe('Focus ready — DayBox')
    })
  })

  it('preserves the full multiline focused title and links', () => {
    const title = 'Review\nhttps://example.com/proposal'
    const task = createTask({ title })
    useTaskStore.setState({ tasks: [task] })
    useTimerStore.setState({ focusedTaskId: task.id })
    render(<TimerBar />)
    const link = screen.getByRole('link', {
      name: 'https://example.com/proposal',
    })
    const container = link.parentElement
    expect(container?.textContent).toBe(title)
    expect(container).toHaveClass('whitespace-pre-wrap', 'break-words')
    expect(container).not.toHaveClass('truncate')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('increments pomoCompleted past pomoEstimate = 0 on focus complete', () => {
    const task = createTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)
    render(<TimerBar />)
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(1)
    expect(updated?.pomoEstimate).toBe(0)
  })

  it('increments pomoCompleted past pomoEstimate on focus complete', () => {
    const task = createTask({ pomoEstimate: 3, pomoCompleted: 3 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)
    render(<TimerBar />)
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(4)
    expect(updated?.pomoEstimate).toBe(3)
  })

  it('does not send a notification when the tab is visible', () => {
    const notification = getNotificationMock()
    notification.permission = 'granted'
    const task = createTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(notification.instances).toHaveLength(0)
    expect(useTaskStore.getState().tasks[0]?.pomoCompleted).toBe(1)
  })

  it('sends a notification when the tab is visible and the user opts in', () => {
    const notification = getNotificationMock()
    notification.permission = 'granted'
    useTimerStore.getState().setTimerSettings({ notifyWhileVisible: true })
    fireFocusComplete('missing-task')

    render(<TimerBar />)

    expect(notification.instances).toHaveLength(1)
    expect(notification.instances[0].title).toBe('Focus complete!')
    expect(useTimerStore.getState().phase).toBe('shortBreak')
  })

  it('sends a notification when the tab is hidden and focuses the window on click', () => {
    const notification = getNotificationMock()
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {})
    notification.permission = 'granted'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    const task = createTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(notification.instances).toHaveLength(1)
    expect(notification.instances[0].title).toBe('Focus complete!')
    expect(notification.instances[0].options?.requireInteraction).toBe(false)
    expect(notification.instances[0].onclick).toEqual(expect.any(Function))

    notification.instances[0].onclick?.call(
      notification.instances[0],
      new Event('click'),
    )
    expect(focusSpy).toHaveBeenCalledTimes(1)
    expect(notification.instances[0].close).toHaveBeenCalledTimes(1)
  })

  describe('persistent reminders', () => {
    beforeEach(() => {
      getNotificationMock().permission = 'granted'
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      useTimerStore
        .getState()
        .setTimerSettings({ keepNotificationsVisible: true })
    })

    it.each(['focus', 'shortBreak', 'longBreak'] as const)(
      'keeps the %s completion reminder while waiting for the next stage',
      (phase) => {
        useTimerStore.setState({
          phase,
          startedAt: Date.now(),
          elapsed: 180 * 60_000,
          isRunning: true,
        })
        render(<TimerBar />)

        const notification = getNotificationMock().instances[0]
        expect(notification.options?.requireInteraction).toBe(true)
        expect(notification.close).not.toHaveBeenCalled()
        expect(useTimerStore.getState().isRunning).toBe(false)
      },
    )

    it.each([
      ['start', () => useTimerStore.getState().start()],
      ['reset', () => useTimerStore.getState().reset()],
      ['reset session', () => useTimerStore.getState().resetSession()],
      [
        'edit cycle progress',
        () => useTimerStore.getState().setSessionPomoCount(2),
      ],
      ['skip', () => useTimerStore.getState().skip(4)],
      ['change phase', () => useTimerStore.getState().setPhase('focus')],
      [
        'disable reminders',
        () =>
          useTimerStore
            .getState()
            .setTimerSettings({ keepNotificationsVisible: false }),
      ],
      [
        'disable notifications',
        () =>
          useTimerStore
            .getState()
            .setTimerSettings({ notificationsEnabled: false }),
      ],
    ] as const)('clears a pending reminder on %s', (_name, action) => {
      fireFocusComplete('missing-task')
      render(<TimerBar />)
      const notification = getNotificationMock().instances[0]

      act(action)

      expect(notification.close).toHaveBeenCalledTimes(1)
    })

    it('replaces the previous stage reminder instead of stacking', () => {
      fireFocusComplete('missing-task')
      render(<TimerBar />)
      const first = getNotificationMock().instances[0]

      act(() => {
        useTimerStore.setState({
          startedAt: Date.now(),
          elapsed: 5 * 60_000,
          isRunning: true,
        })
      })

      const second = getNotificationMock().instances[1]
      expect(first.close).toHaveBeenCalledTimes(1)
      expect(second.title).toBe('Short break complete!')
      expect(second.options?.tag).toBe(first.options?.tag)
    })

    it('uses a temporary notification when the next stage auto-starts', () => {
      useTimerStore.getState().setTimerSettings({ autoStartBreaks: true })
      fireFocusComplete('missing-task')
      render(<TimerBar />)

      expect(
        getNotificationMock().instances[0].options?.requireInteraction,
      ).toBe(false)
      expect(useTimerStore.getState().isRunning).toBe(true)
    })
  })

  it('continues interval completion when audio graph creation throws', async () => {
    const audio = getAudioContextMock()
    const notification = getNotificationMock()
    notification.permission = 'granted'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    await expect(unlockAudio()).resolves.toBe(true)
    audio.oscillatorBehavior = 'throw'
    const task = createTask()
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(useTimerStore.getState().phase).toBe('shortBreak')
    expect(useTaskStore.getState().tasks[0]?.pomoCompleted).toBe(1)
    expect(notification.instances).toHaveLength(1)
  })

  describe('clear focus button', () => {
    it('is hidden when focusedTaskId is null', () => {
      render(<TimerBar />)
      expect(screen.queryByRole('button', { name: 'Clear focus' })).toBeNull()
    })

    it('is visible when a task is focused and exists in the store', () => {
      const task = createTask()
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({ focusedTaskId: task.id })
      render(<TimerBar />)
      expect(
        screen.queryByRole('button', { name: 'Clear focus' }),
      ).not.toBeNull()
    })

    it('is visible when the focused task is stale (not in the store)', () => {
      useTimerStore.setState({ focusedTaskId: 'stale-task' })
      render(<TimerBar />)
      expect(
        screen.queryByRole('button', { name: 'Clear focus' }),
      ).not.toBeNull()
    })

    it('sets focusedTaskId to null when clicked', () => {
      const task = createTask()
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({ focusedTaskId: task.id })
      render(<TimerBar />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear focus' }))
      expect(useTimerStore.getState().focusedTaskId).toBeNull()
    })

    it('does not disturb timer state when clicked', () => {
      const task = createTask()
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({
        focusedTaskId: task.id,
        phase: 'focus',
        elapsed: 60000,
        isRunning: true,
        startedAt: Date.now() - 1000,
        sessionPomoCount: 2,
      })
      render(<TimerBar />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear focus' }))
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBeNull()
      expect(state.phase).toBe('focus')
      expect(state.elapsed).toBe(60000)
      expect(state.isRunning).toBe(true)
      expect(state.startedAt).toBeGreaterThan(0)
      expect(state.sessionPomoCount).toBe(2)
    })
  })

  describe('interval duration adjuster', () => {
    async function openAdjuster(user: ReturnType<typeof userEvent.setup>) {
      await user.click(
        screen.getByRole('button', { name: 'Adjust interval duration' }),
      )
    }

    function durationInput(): HTMLInputElement {
      const matches = screen
        .getAllByDisplayValue(
          String(useTimerStore.getState().settings.focusDuration),
        )
        .filter((el) => (el as HTMLInputElement).type !== 'hidden')
      return matches[0] as HTMLInputElement
    }

    it('opens when idle and sets duration via NumberInput', async () => {
      const user = userEvent.setup()
      render(<TimerBar />)
      await openAdjuster(user)
      expect(screen.getByText('This interval only')).toBeTruthy()
      const input = durationInput()
      await user.clear(input)
      await user.type(input, '45')
      expect(useTimerStore.getState().intervalDurationMin).toBe(45)
      expect(useTimerStore.getState().settings.focusDuration).toBe(25)
    })

    it('opens when paused', async () => {
      const user = userEvent.setup()
      useTimerStore.setState({
        elapsed: 60_000,
        isRunning: false,
        startedAt: null,
      })
      render(<TimerBar />)
      await openAdjuster(user)
      expect(screen.getByText('This interval only')).toBeTruthy()
    })

    it('does not expose adjuster while running', () => {
      useTimerStore.setState({
        isRunning: true,
        startedAt: Date.now(),
        elapsed: 0,
      })
      render(<TimerBar />)
      expect(
        screen.queryByRole('button', { name: 'Adjust interval duration' }),
      ).toBeNull()
    })

    it('clears override via Reset when custom', async () => {
      const user = userEvent.setup()
      useTimerStore.setState({ intervalDurationMin: 45 })
      render(<TimerBar />)
      await openAdjuster(user)
      await user.click(screen.getByRole('button', { name: 'Reset' }))
      expect(useTimerStore.getState().intervalDurationMin).toBeNull()
    })

    it('hides Reset when using default', async () => {
      const user = userEvent.setup()
      render(<TimerBar />)
      await openAdjuster(user)
      expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
      expect(screen.getByText(/Default is 25 min/)).toBeTruthy()
    })

    it('shows custom cue when override is active', () => {
      useTimerStore.setState({ intervalDurationMin: 45 })
      render(<TimerBar />)
      const clock = screen.getByRole('button', {
        name: 'Adjust interval duration',
      })
      expect(clock.className).toContain('text-accent')
    })

    it('shows default presentation without custom cue', () => {
      render(<TimerBar />)
      const clock = screen.getByRole('button', {
        name: 'Adjust interval duration',
      })
      expect(clock.className).not.toContain('text-accent')
    })

    it('uses override for displayed remaining time', () => {
      useTimerStore.setState({ intervalDurationMin: 10, elapsed: 0 })
      render(<TimerBar />)
      expect(screen.getByText('10:00')).toBeTruthy()
    })
  })

  it('does not replay an interval alarm after audio unlocks later', async () => {
    const audio = getAudioContextMock()
    await expect(unlockAudio()).resolves.toBe(true)
    const context = audio.instances[0]
    expect(context).toBeDefined()
    context!.state = 'suspended'
    audio.oscillatorBehavior = 'create'
    const task = createTask()
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(useTimerStore.getState().phase).toBe('shortBreak')
    const oscillatorCount = context?.oscillators.length ?? 0

    await expect(unlockAudio()).resolves.toBe(true)
    expect(context?.oscillators).toHaveLength(oscillatorCount)
  })
})
