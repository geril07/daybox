import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlannerStore } from '@/modules/planner'
import { useTaskStore } from '@/modules/tasks'

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
  useTaskStore.setState({ tasks: [], series: [] })
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

describe('SettingsDrawer recurring section', () => {
  it('hides the entire block and expands all editors and the add form together', async () => {
    const user = userEvent.setup()
    useTaskStore.getState().addSeries({ title: 'Work', weekdays: [1] })
    useTaskStore.getState().addSeries({ title: 'Exercise', weekdays: [5] })
    render(<SettingsDrawer open onClose={vi.fn()} />)
    const trigger = screen.getByRole('button', {
      name: 'Recurring',
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Series title')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('New recurring task'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Day starts at')).toBeVisible()
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus())
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByLabelText('Series title')).toHaveLength(2)
    expect(screen.getByLabelText('New recurring task')).toBeVisible()
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Series title')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('New recurring task'),
    ).not.toBeInTheDocument()
  })

  it('saves edits on collapse and keeps newly created series visible on reopen', async () => {
    const user = userEvent.setup()
    useTaskStore.getState().addSeries({ title: 'Work', weekdays: [1] })
    render(<SettingsDrawer open onClose={vi.fn()} />)
    const trigger = screen.getByRole('button', {
      name: 'Recurring',
    })
    await user.click(trigger)
    const title = screen.getByLabelText('Series title')
    await user.clear(title)
    await user.type(title, 'Job')
    await user.click(trigger)
    expect(useTaskStore.getState().series[0].title).toBe('Job')
    await user.click(trigger)
    expect(screen.getByLabelText('Series title')).toHaveValue('Job')
    await user.type(screen.getByLabelText('New recurring task'), 'Exercise')
    await user.click(screen.getByRole('button', { name: 'Add series' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByLabelText('Series title')).toHaveLength(2)
    await user.click(trigger)
    await user.click(trigger)
    expect(
      screen
        .getAllByLabelText('Series title')
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['Job', 'Exercise'])
  })
})
