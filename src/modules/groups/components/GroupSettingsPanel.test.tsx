import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { DEFAULT_GROUP_ID, useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'
import { useTimerStore } from '@/modules/timer'

import { GroupSettingsPanel } from './GroupSettingsPanel'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
  })
})

afterEach(() => {
  cleanup()
})

function seedGroup(name: string) {
  return useGroupStore.getState().addGroup(name)
}

function seedTask(title: string, groupId: string) {
  const task = useTaskStore.getState().addTask(title, groupId)
  if (!task) throw new Error('addTask returned null')
  return task
}

function trashButtonFor(groupName: string): HTMLButtonElement {
  const row = screen.getByText(groupName).closest('div.flex.items-center')
  if (!row) throw new Error(`row for "${groupName}" not found`)
  const buttons = row.querySelectorAll('button')
  return buttons[buttons.length - 1] as HTMLButtonElement
}

describe('GroupSettingsPanel — delete flow', () => {
  it('deletes an empty group immediately without opening a popover', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))

    expect(
      useGroupStore.getState().groups.find((g) => g.id === work.id),
    ).toBeUndefined()
    expect(screen.queryByText(/has \d+ tasks?/)).toBeNull()
    expect(screen.queryByText('Move tasks to General')).toBeNull()
  })

  it('opens the popover with task count and three actions when group has tasks', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    seedTask('Task A', work.id)
    seedTask('Task B', work.id)
    seedTask('Task C', work.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))

    expect(screen.getByText('Delete "Work"')).toBeTruthy()
    expect(screen.getByText('This group has 3 tasks.')).toBeTruthy()
    const moveBtn = screen.getByRole('button', {
      name: 'Move tasks to General',
    })
    const deleteAllBtn = screen.getByRole('button', {
      name: 'Delete all tasks',
    })
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    expect(moveBtn).toBeTruthy()
    expect(deleteAllBtn).toBeTruthy()
    expect(cancelBtn).toBeTruthy()

    // Order: Move → Delete all → Cancel
    const buttons = [moveBtn, deleteAllBtn, cancelBtn]
    for (let i = 0; i < buttons.length - 1; i++) {
      const pos = buttons[i].compareDocumentPosition(buttons[i + 1])
      expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('uses singular microcopy when the group has exactly one task', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    seedTask('Solo', work.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))

    expect(screen.getByText('This group has 1 task.')).toBeTruthy()
  })

  it('"Move tasks to General" reassigns tasks and deletes the group', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Task A', work.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))
    await user.click(
      screen.getByRole('button', { name: 'Move tasks to General' }),
    )

    expect(
      useGroupStore.getState().groups.find((g) => g.id === work.id),
    ).toBeUndefined()
    const moved = useTaskStore.getState().tasks.find((t) => t.id === task.id)
    expect(moved?.groupId).toBe(DEFAULT_GROUP_ID)
  })

  it('"Delete all tasks" removes the tasks and deletes the group', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Task A', work.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))
    await user.click(screen.getByRole('button', { name: 'Delete all tasks' }))

    expect(
      useGroupStore.getState().groups.find((g) => g.id === work.id),
    ).toBeUndefined()
    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
  })

  it('"Cancel" closes the popover without mutating state', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Task A', work.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      useGroupStore.getState().groups.find((g) => g.id === work.id),
    ).toBeDefined()
    const preserved = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(preserved?.groupId).toBe(work.id)
    expect(screen.queryByText('This group has 1 task.')).toBeNull()
  })

  it('disables the trash button on the default group when other groups exist', () => {
    seedGroup('Work')
    render(<GroupSettingsPanel />)

    const defaultTrash = trashButtonFor('General')
    expect(defaultTrash.disabled).toBe(true)
  })
})

describe('GroupSettingsPanel — focused-task cascade', () => {
  it("preserves focus when moving the focused task's group to General", async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Focus me', work.id)
    useTimerStore.getState().setFocusedTaskId(task.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))
    await user.click(
      screen.getByRole('button', { name: 'Move tasks to General' }),
    )

    const moved = useTaskStore.getState().tasks.find((t) => t.id === task.id)
    expect(moved?.groupId).toBe(DEFAULT_GROUP_ID)
    expect(useTimerStore.getState().focusedTaskId).toBe(task.id)
  })

  it('clears focus when deleting all tasks of the focused group', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Focus me', work.id)
    useTimerStore.getState().setFocusedTaskId(task.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))
    await user.click(screen.getByRole('button', { name: 'Delete all tasks' }))

    expect(useTimerStore.getState().focusedTaskId).toBeNull()
    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
  })

  it('leaves focus alone when deleting an unrelated group', async () => {
    const user = userEvent.setup()
    const home = seedGroup('Home')
    const work = seedGroup('Work')
    const focused = seedTask('Stay focused', home.id)
    seedTask('Other task', work.id)
    useTimerStore.getState().setFocusedTaskId(focused.id)
    render(<GroupSettingsPanel />)

    await user.click(trashButtonFor('Work'))
    await user.click(screen.getByRole('button', { name: 'Delete all tasks' }))

    expect(useTimerStore.getState().focusedTaskId).toBe(focused.id)
  })
})
