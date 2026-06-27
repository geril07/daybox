import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_GROUP_ID, GROUP_COLORS, useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'
import { useTimerStore } from '@/modules/timer'

import { Sidebar } from './Sidebar'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        name: 'General',
        color: GROUP_COLORS[0],
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

function rowFor(name: string): HTMLElement {
  const el = screen.getByText(name)
  const row = el.closest('[role="button"]')
  if (!row) throw new Error(`row for "${name}" not found`)
  return row as HTMLElement
}

function menuButtonFor(name: string): HTMLButtonElement {
  const row = rowFor(name)
  const button = row.querySelector('[aria-label="Group actions"]')
  if (!button) throw new Error(`menu button for "${name}" not found`)
  return button as HTMLButtonElement
}

async function openMenuFor(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
): Promise<HTMLButtonElement> {
  const button = menuButtonFor(name)
  await user.hover(rowFor(name))
  fireEvent.click(button)
  return button
}

function colorDotFor(name: string): HTMLElement {
  const row = rowFor(name)
  const dot = row.querySelector('[aria-label="Change group color"]')
  if (!dot) throw new Error(`color dot for "${name}" not found`)
  return dot as HTMLElement
}

describe('Sidebar navigation', () => {
  it('shows the Groups section with the single group and add affordance when only one group exists', () => {
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    expect(screen.getByText('Groups')).toBeTruthy()
    expect(screen.queryByText('All groups')).toBeNull()
    expect(screen.getByText('General')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add group' })).toBeTruthy()
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
  })

  it('shows the Groups section with All groups and user groups when two or more groups exist', () => {
    useGroupStore.setState({
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: GROUP_COLORS[0],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work',
          name: 'Work',
          color: GROUP_COLORS[1],
          createdAt: new Date().toISOString(),
        },
      ],
    })

    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    expect(screen.getByText('Groups')).toBeTruthy()
    expect(screen.getByText('All groups')).toBeTruthy()
    expect(screen.getByText('General')).toBeTruthy()
    expect(screen.getByText('Work')).toBeTruthy()
  })

  it('highlights the active group lens', () => {
    useGroupStore.setState({
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: GROUP_COLORS[0],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work',
          name: 'Work',
          color: GROUP_COLORS[1],
          createdAt: new Date().toISOString(),
        },
      ],
    })

    render(<Sidebar selectedGroupId="work" onSelectGroup={() => {}} />)

    const allBtn = screen.getByText('All groups').closest('button')!
    const workRow = rowFor('Work')

    expect(allBtn.className).toMatch(/(^|\s)text-muted-foreground($|\s)/)
    expect(workRow.className).toMatch(/(^|\s)bg-muted($|\s)/)
    expect(workRow.className).toMatch(/(^|\s)text-foreground($|\s)/)
  })

  it('calls onSelectGroup when a group item is clicked', async () => {
    const user = userEvent.setup()
    useGroupStore.setState({
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: GROUP_COLORS[0],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work',
          name: 'Work',
          color: GROUP_COLORS[1],
          createdAt: new Date().toISOString(),
        },
      ],
    })

    let selected: string | null = 'initial'
    render(
      <Sidebar
        selectedGroupId={null}
        onSelectGroup={(id) => {
          selected = id
        }}
      />,
    )

    await user.click(screen.getByText('All groups'))
    expect(selected).toBe(null)

    await user.click(screen.getByText('Work'))
    expect(selected).toBe('work')
  })

  it('renders the group color dot and actions menu button', () => {
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    expect(colorDotFor('Work')).toBeTruthy()
    expect(menuButtonFor('Work')).toBeTruthy()
  })
})

describe('Sidebar group CRUD', () => {
  it('shows the add input and buttons when clicking the title-row +', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))

    const input = screen.getByPlaceholderText('Add group...')
    expect(input).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Confirm add group' }),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input)
  })

  it('creates a group from the add input on Enter', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))
    const input = screen.getByPlaceholderText('Add group...')
    await user.type(input, 'Work')
    await user.keyboard('{Enter}')

    expect(screen.getByText('Work')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
  })

  it('creates a group from the add input on blur when non-empty', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))
    const input = screen.getByPlaceholderText('Add group...')
    await user.type(input, 'Work')
    await user.click(document.body)

    expect(screen.getByText('Work')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
  })

  it('does not create a group on blur when the name is empty', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))
    const input = screen.getByPlaceholderText('Add group...')
    await user.type(input, '   ')
    await user.click(document.body)

    expect(useGroupStore.getState().groups).toHaveLength(1)
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
  })

  it('closes the add input on Escape without creating a group', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))
    const input = screen.getByPlaceholderText('Add group...')
    await user.type(input, 'Work')
    await user.keyboard('{Escape}')

    expect(useGroupStore.getState().groups).toHaveLength(1)
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
    expect(screen.queryByText('Work')).toBeNull()
  })

  it('creates a group when clicking the success button', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))
    const input = screen.getByPlaceholderText('Add group...')
    await user.type(input, 'Work')

    await user.click(screen.getByRole('button', { name: 'Confirm add group' }))

    expect(screen.getByText('Work')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
  })

  it('closes without creating when clicking the cancel button', async () => {
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add group' }))
    const input = screen.getByPlaceholderText('Add group...')
    await user.type(input, 'Work')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(useGroupStore.getState().groups).toHaveLength(1)
    expect(screen.queryByPlaceholderText('Add group...')).toBeNull()
    expect(screen.queryByText('Work')).toBeNull()
  })

  it('opens the color popover when clicking the color dot', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(colorDotFor('Work'))

    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
  })

  it('changes group color when clicking a swatch', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await user.click(colorDotFor('Work'))

    const newColor = GROUP_COLORS[3]
    const swatch = document.querySelector(
      `button[aria-label='Color ${newColor}']`,
    ) as HTMLButtonElement
    expect(swatch).toBeTruthy()
    await user.click(swatch)

    const updated = useGroupStore
      .getState()
      .groups.find((g) => g.id === work.id)
    expect(updated?.color).toBe(newColor)
  })

  it('opens the actions menu and turns rename into an inline input', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Work')
    expect(input).toBeTruthy()
    expect(input.tagName).toBe('INPUT')
    expect(screen.getByRole('button', { name: 'Cancel rename' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm rename' })).toBeTruthy()

    await user.clear(input)
    await user.type(input, 'Workstream')
    await user.keyboard('{Enter}')

    expect(screen.getByText('Workstream')).toBeTruthy()
    expect(
      useGroupStore.getState().groups.find((g) => g.name === 'Workstream'),
    ).toBeTruthy()
  })

  it('saves rename when clicking the confirm button', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Work')
    await user.clear(input)
    await user.type(input, 'Workstream')

    await user.click(screen.getByRole('button', { name: 'Confirm rename' }))

    expect(screen.getByText('Workstream')).toBeTruthy()
    expect(
      useGroupStore.getState().groups.find((g) => g.name === 'Workstream'),
    ).toBeTruthy()
  })

  it('cancels rename when clicking the cancel button', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Work')
    await user.clear(input)
    await user.type(input, 'Renamed')

    await user.click(screen.getByRole('button', { name: 'Cancel rename' }))

    expect(screen.queryByText('Renamed')).toBeNull()
    expect(screen.getByText('Work')).toBeTruthy()
    expect(
      useGroupStore.getState().groups.find((g) => g.name === 'Renamed'),
    ).toBeUndefined()
  })

  it('cancels rename on Escape', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Work')
    await user.clear(input)
    await user.type(input, 'Renamed')
    await user.keyboard('{Escape}')

    expect(screen.queryByText('Renamed')).toBeNull()
    expect(screen.getByText('Work')).toBeTruthy()
    expect(
      useGroupStore.getState().groups.find((g) => g.name === 'Renamed'),
    ).toBeUndefined()
  })

  it('saves rename on blur when name changed', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Rename'))

    const input = screen.getByDisplayValue('Work')
    await user.clear(input)
    await user.type(input, 'Workstream')
    await user.click(document.body)

    expect(screen.getByText('Workstream')).toBeTruthy()
    expect(
      useGroupStore.getState().groups.find((g) => g.name === 'Workstream'),
    ).toBeTruthy()
  })

  it('does not change the lens when clicking the color dot, actions menu, or Rename', async () => {
    const user = userEvent.setup()
    seedGroup('Work')
    let selected: string | null = 'before-test'
    render(
      <Sidebar
        selectedGroupId={null}
        onSelectGroup={(id) => {
          selected = id
        }}
      />,
    )

    await user.click(colorDotFor('Work'))
    expect(selected).toBe('before-test')

    await user.keyboard('{Escape}')
    selected = 'before-test'
    await openMenuFor(user, 'Work')
    expect(selected).toBe('before-test')

    await user.click(screen.getByText('Rename'))
    expect(selected).toBe('before-test')
  })
})

describe('Sidebar group delete flow', () => {
  it('deletes an empty group immediately without opening a popover', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))

    expect(
      useGroupStore.getState().groups.find((g) => g.id === work.id),
    ).toBeUndefined()
    expect(screen.queryByText(/has \d+ tasks?/)).toBeNull()
    expect(screen.queryByText('Move tasks to General')).toBeNull()
  })

  it('opens the resolve popover with task count and three actions when group has tasks', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    seedTask('Task A', work.id)
    seedTask('Task B', work.id)
    seedTask('Task C', work.id)
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))

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
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))

    expect(screen.getByText('This group has 1 task.')).toBeTruthy()
  })

  it('"Move tasks to General" reassigns tasks and deletes the group', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Task A', work.id)
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
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
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
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
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
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

  it('routes group deletion through the bulk task helpers exactly once', async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    seedTask('Task A', work.id)
    const reassignSpy = vi.spyOn(useTaskStore.getState(), 'reassignTasks')
    const deleteByGroupSpy = vi.spyOn(
      useTaskStore.getState(),
      'deleteTasksByGroupId',
    )
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
    await user.click(
      screen.getByRole('button', { name: 'Move tasks to General' }),
    )

    expect(reassignSpy).toHaveBeenCalledTimes(1)
    expect(reassignSpy).toHaveBeenCalledWith(work.id, DEFAULT_GROUP_ID)
    expect(deleteByGroupSpy).not.toHaveBeenCalled()

    reassignSpy.mockRestore()
    deleteByGroupSpy.mockRestore()
  })

  it('does not delete the default group when Delete is selected', async () => {
    seedGroup('Work')
    const user = userEvent.setup()
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'General')
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' })
    fireEvent.click(deleteItem)

    expect(
      useGroupStore.getState().groups.find((g) => g.id === DEFAULT_GROUP_ID),
    ).toBeDefined()
  })
})

describe('Sidebar group delete — focused-task cascade', () => {
  it("preserves focus when moving the focused task's group to General", async () => {
    const user = userEvent.setup()
    const work = seedGroup('Work')
    const task = seedTask('Focus me', work.id)
    useTimerStore.getState().setFocusedTaskId(task.id)
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
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
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
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
    render(<Sidebar selectedGroupId={null} onSelectGroup={() => {}} />)

    await openMenuFor(user, 'Work')
    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByRole('button', { name: 'Delete all tasks' }))

    expect(useTimerStore.getState().focusedTaskId).toBe(focused.id)
  })
})
