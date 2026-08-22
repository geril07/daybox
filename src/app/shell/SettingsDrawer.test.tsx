import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlannerStore } from '@/modules/planner'

import { SettingsDrawer } from './SettingsDrawer'

vi.mock('@/app/theme', () => ({
  setThemeWithViewTransition: vi.fn(),
  useTheme: () => ({
    settings: { mode: 'system', preset: 'default' },
    presets: [],
    availableModes: [],
    setMode: vi.fn(),
    setPreset: vi.fn(),
  }),
}))

vi.mock('@/modules/google-drive', () => ({
  GoogleDrivePanel: () => null,
}))

vi.mock('@/modules/timer', async (importOriginal) => ({
  ...(await importOriginal()),
  TimerSettingsPanel: () => null,
}))

beforeEach(() => {
  usePlannerStore.setState({
    weekStartDay: 1,
    browseDate: null,
    dayStartMinutes: 0,
  })
})

afterEach(() => {
  cleanup()
})

describe('SettingsDrawer day-start preference', () => {
  it('shows midnight by default', () => {
    render(<SettingsDrawer open onClose={vi.fn()} />)

    expect(screen.getByLabelText('Day starts at')).toHaveValue('00:00')
  })

  it('stores minute-precision day-start values', () => {
    render(<SettingsDrawer open onClose={vi.fn()} />)
    const input = screen.getByLabelText('Day starts at')

    fireEvent.change(input, { target: { value: '02:30' } })
    expect(usePlannerStore.getState().dayStartMinutes).toBe(150)
    expect(input).toHaveValue('02:30')

    fireEvent.change(input, { target: { value: '02:31' } })
    expect(usePlannerStore.getState().dayStartMinutes).toBe(151)
    expect(input).toHaveValue('02:31')
  })
})
