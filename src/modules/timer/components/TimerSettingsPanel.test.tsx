import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '../store'
import { TimerSettingsPanel } from './TimerSettingsPanel'

type NotificationMock = typeof Notification & {
  permission: NotificationPermission
  requestPermission: ReturnType<typeof vi.fn>
}

const getNotificationMock = () => Notification as unknown as NotificationMock

beforeEach(() => {
  const mock = getNotificationMock()
  mock.permission = 'default'
  mock.requestPermission.mockReset()
  mock.requestPermission.mockResolvedValue('granted')
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
})

afterEach(() => {
  cleanup()
})

function notificationSwitch(): HTMLElement {
  return screen.getAllByRole('switch')[2]
}

describe('TimerSettingsPanel notifications', () => {
  it('renders the default permission state with notifications enabled', () => {
    render(<TimerSettingsPanel />)

    expect(screen.getByText('Notifications')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Enable notifications' }),
    ).toBeTruthy()
    expect(notificationSwitch().getAttribute('aria-checked')).toBe('true')
  })

  it('requests browser permission from the default state', async () => {
    const user = userEvent.setup()
    const mock = getNotificationMock()
    render(<TimerSettingsPanel />)

    await user.click(
      screen.getByRole('button', { name: 'Enable notifications' }),
    )

    expect(mock.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('renders granted permission and disables the in-app toggle from the button', async () => {
    const user = userEvent.setup()
    const mock = getNotificationMock()
    mock.permission = 'granted'
    render(<TimerSettingsPanel />)

    await user.click(
      screen.getByRole('button', { name: 'Disable notifications' }),
    )

    expect(useTimerStore.getState().settings.notificationsEnabled).toBe(false)
  })

  it('renders denied permission as a disabled browser-settings row', () => {
    const mock = getNotificationMock()
    mock.permission = 'denied'
    render(<TimerSettingsPanel />)

    const button = screen.getByRole('button', {
      name: 'Blocked in browser settings',
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText(/Use your browser site settings/)).toBeTruthy()
  })

  it('writes the notification switch preference to the timer store', async () => {
    const user = userEvent.setup()
    render(<TimerSettingsPanel />)

    await user.click(notificationSwitch())

    expect(useTimerStore.getState().settings.notificationsEnabled).toBe(false)
  })

  it('refreshes the permission label when the document becomes visible', () => {
    const mock = getNotificationMock()
    render(<TimerSettingsPanel />)
    expect(
      screen.getByRole('button', { name: 'Enable notifications' }),
    ).toBeTruthy()

    mock.permission = 'granted'
    fireEvent(document, new Event('visibilitychange'))

    expect(
      screen.getByRole('button', { name: 'Disable notifications' }),
    ).toBeTruthy()
  })
})
