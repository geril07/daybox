import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it } from 'vitest'

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
afterEach(cleanup)

it('creates, renames, changes weekdays, deactivates and reorders series', async () => {
  const user = userEvent.setup()
  render(<RecurringSettingsPanel />)
  fireEvent.change(screen.getByLabelText('New recurring task'), {
    target: { value: 'Work' },
  })
  await user.click(screen.getByRole('button', { name: 'Add series' }))
  expect(useTaskStore.getState().tasks).toEqual([])
  let row = within(screen.getByRole('group', { name: 'Work' }))
  fireEvent.change(row.getByLabelText('Series title'), {
    target: { value: 'Job' },
  })
  fireEvent.blur(row.getByLabelText('Series title'))
  row = within(screen.getByRole('group', { name: 'Job' }))
  await user.click(row.getByRole('button', { name: 'Sun' }))
  expect(useTaskStore.getState().series[0].weekdays).not.toContain(0)
  await user.click(row.getByRole('switch', { name: 'Active' }))
  expect(useTaskStore.getState().series[0].active).toBe(false)
  fireEvent.change(screen.getByLabelText('New recurring task'), {
    target: { value: 'Exercise' },
  })
  await user.click(screen.getByRole('button', { name: 'Add series' }))
  await user.click(
    within(screen.getByRole('group', { name: 'Exercise' })).getByRole(
      'button',
      { name: 'Move series up' },
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
  await user.click(screen.getByRole('button', { name: 'Delete series' }))
  expect(screen.getByText(/4 occurrences/)).toBeTruthy()
  expect(useTaskStore.getState().series).toHaveLength(1)
  await user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Delete series',
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
  await user.click(screen.getByRole('button', { name: 'Add series' }))
  expect(useTaskStore.getState().series[0].weekdays).toEqual([0, 2])
})
