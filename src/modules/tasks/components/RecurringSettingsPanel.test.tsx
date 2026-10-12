import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useGroupStore } from '@/modules/groups'
import { usePlannerStore } from '@/modules/planner'

import { useTaskStore } from '../store'
import { RecurringSettingsPanel } from './RecurringSettingsPanel'

beforeEach(() => {
  useTaskStore.setState({ tasks: [], series: [] })
  usePlannerStore.setState({ weekStartDay: 1 })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'red',
        createdAt: new Date().toISOString(),
      },
    ],
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it.each(['blur', 'Enter'])(
  'renames upcoming matching tasks on %s',
  (commit) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 6, 12))
    usePlannerStore.setState({ dayStartMinutes: 0 })
    const store = useTaskStore.getState()
    store.addSeries({ title: 'Work', weekdays: [1, 2, 3, 4, 5] })
    store.ensureOccurrences('2026-10-06', 1)
    const original = useTaskStore.getState().tasks
    store.updateTask(original[1].id, { title: 'Work with Alex' })
    render(<RecurringSettingsPanel />)
    const input = screen.getByLabelText('Recurring task title')
    fireEvent.change(input, { target: { value: 'Job' } })
    if (commit === 'blur') fireEvent.blur(input)
    else {
      fireEvent.keyDown(input, { key: 'Enter' })
      fireEvent.blur(input)
    }

    expect(useTaskStore.getState().series[0].title).toBe('Job')
    expect(useTaskStore.getState().tasks).toEqual(
      original.map((task, index) => ({
        ...task,
        title: index === 1 ? 'Work with Alex' : 'Job',
      })),
    )
  },
)

it('creates, renames, changes weekdays, deactivates and reorders series', async () => {
  const user = userEvent.setup()
  render(<RecurringSettingsPanel />)
  fireEvent.change(screen.getByLabelText('New recurring task'), {
    target: { value: 'Work' },
  })
  await user.click(screen.getByRole('button', { name: 'Add recurring task' }))
  expect(useTaskStore.getState().tasks).toEqual([])
  let row = within(screen.getByRole('group', { name: 'Work' }))
  fireEvent.change(row.getByLabelText('Recurring task title'), {
    target: { value: 'Job' },
  })
  fireEvent.blur(row.getByLabelText('Recurring task title'))
  row = within(screen.getByRole('group', { name: 'Job' }))
  await user.click(row.getByRole('button', { name: 'Sun' }))
  expect(useTaskStore.getState().series[0].weekdays).not.toContain(0)
  await user.click(row.getByRole('switch', { name: 'Active' }))
  expect(useTaskStore.getState().series[0].active).toBe(false)
  fireEvent.change(screen.getByLabelText('New recurring task'), {
    target: { value: 'Exercise' },
  })
  await user.click(screen.getByRole('button', { name: 'Add recurring task' }))
  await user.click(
    within(screen.getByRole('group', { name: 'Exercise' })).getByRole(
      'button',
      { name: 'Move up' },
    ),
  )
  expect(
    useTaskStore.getState().series.find((series) => series.title === 'Exercise')
      ?.sortOrder,
  ).toBe(0)
})

it('shows removal count and waits for delete confirmation', async () => {
  const user = userEvent.setup()
  useTaskStore
    .getState()
    .addSeries({ title: 'Work', weekdays: [1, 2, 3, 4, 5] })
  useTaskStore.getState().ensureOccurrences('2026-10-06', 1)
  render(<RecurringSettingsPanel />)
  await user.click(
    screen.getByRole('button', { name: 'Delete recurring task' }),
  )
  expect(screen.getByText(/all 4 generated tasks/)).toBeTruthy()
  expect(useTaskStore.getState().series).toHaveLength(1)
  await user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Delete recurring task',
    }),
  )
  expect(useTaskStore.getState().series).toEqual([])
  expect(useTaskStore.getState().tasks).toEqual([])
})

it('displays Sunday first while storing absolute weekday numbers', async () => {
  const user = userEvent.setup()
  usePlannerStore.setState({ weekStartDay: 0 })
  render(<RecurringSettingsPanel />)
  const toggles = screen.getAllByRole('button', { pressed: true })
  expect(toggles.map((button) => button.textContent)).toEqual([
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ])
  for (const name of ['Mon', 'Wed', 'Thu', 'Fri', 'Sat'])
    await user.click(screen.getByRole('button', { name }))
  fireEvent.change(screen.getByLabelText('New recurring task'), {
    target: { value: 'Language' },
  })
  await user.click(screen.getByRole('button', { name: 'Add recurring task' }))
  expect(useTaskStore.getState().series[0].weekdays).toEqual([0, 2])
})

it('labels controls and preserves the full selected group name in the picker', async () => {
  const user = userEvent.setup()
  const name = 'Research and development planning team'
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: '#ff0000',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'long',
        name,
        color: '#8b5cf6',
        createdAt: new Date().toISOString(),
      },
    ],
  })
  useTaskStore.getState().addSeries({
    title: 'Weekly review',
    weekdays: [1],
    groupId: 'long',
    pomoEstimate: 3,
  })
  render(<RecurringSettingsPanel />)

  expect(screen.getByText('Group')).toBeVisible()
  expect(screen.getByText('Estimated pomodoros')).toBeVisible()
  expect(screen.getByLabelText('Estimated pomodoros')).toHaveValue('3')
  expect(screen.getByRole('combobox', { name: `Group: ${name}` })).toBeVisible()
  expect(screen.getByRole('switch', { name: 'Active' })).toBeChecked()
  expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled()
  await user.click(screen.getByRole('combobox', { name: `Group: ${name}` }))
  expect(screen.getByRole('option', { name })).toBeVisible()
  await user.click(screen.getByRole('option', { name: 'General' }))
  expect(useTaskStore.getState().series[0].groupId).toBe('default')
  expect(screen.getByRole('combobox', { name: 'Group: General' })).toBeVisible()
})

it('identifies enabled actions on keyboard focus and keeps reordering functional', async () => {
  const user = userEvent.setup()
  const store = useTaskStore.getState()
  store.addSeries({ title: 'Work', weekdays: [1] })
  store.addSeries({ title: 'Exercise', weekdays: [2] })
  render(<RecurringSettingsPanel />)
  const work = within(screen.getByRole('group', { name: 'Work' }))
  const down = work.getByRole('button', { name: 'Move down' })
  down.focus()
  expect(await screen.findByText('Move down', { exact: true })).toBeVisible()
  await user.keyboard('{Escape}')
  await user.click(down)
  expect(
    useTaskStore.getState().series.find((item) => item.title === 'Work')
      ?.sortOrder,
  ).toBe(1)
})
