import { describe, it, expect, beforeEach } from 'vitest'

import { useSettingsStore } from '@/app/settingsStore'

beforeEach(() => {
  useSettingsStore.setState({
    settings: {
      timer: {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        alarmSound: 'bell',
        alarmVolume: 0.5,
        alarmRepeat: 3,
      },
      theme: 'light',
      weekStartDay: 1,
    },
  })
})

describe('Settings Store', () => {
  it('updates settings', () => {
    useSettingsStore.getState().updateSettings({ theme: 'dark' })
    expect(useSettingsStore.getState().settings.theme).toBe('dark')
  })

  it('updates timer settings', () => {
    useSettingsStore.getState().updateTimerSettings({ focusDuration: 30 })
    expect(useSettingsStore.getState().settings.timer.focusDuration).toBe(30)
  })
})
