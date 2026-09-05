import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'
import { AddTaskRow } from '@/modules/tasks/components/AddTaskRow'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'work',
        name: 'Work',
        color: 'oklch(0.7 0.15 200)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
})

afterEach(() => {
  cleanup()
})

function getAddInput(): HTMLTextAreaElement {
  return document.querySelector(
    'textarea[placeholder^="Add a task"]',
  ) as HTMLTextAreaElement
}

function getAddForm(): HTMLFormElement {
  return document.querySelector('.add-task-wrap') as HTMLFormElement
}

function getAddButton(): HTMLButtonElement {
  return screen.getByTitle('Add task') as HTMLButtonElement
}

describe('AddTaskRow', () => {
  it('native form submit creates a task', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.type(input, 'Write report')

    fireEvent.submit(getAddForm())

    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Write report')
    expect(input.value).toBe('')
  })

  it('renders a coarse-pointer submit button that creates a task', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    const addButton = getAddButton()

    expect(addButton.className).toContain('pointer-fine:hidden')
    expect(addButton.disabled).toBe(true)

    await user.type(input, 'Write report')
    expect(addButton.disabled).toBe(false)
    await user.click(addButton)

    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Write report')
  })

  it('Shift+Enter inserts a line break and Enter submits the multiline task', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.type(input, 'Review proposal')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'https://example.com/proposal')

    expect(input.value).toBe('Review proposal\nhttps://example.com/proposal')
    expect(useTaskStore.getState().tasks).toHaveLength(0)

    await user.keyboard('{Enter}')

    expect(useTaskStore.getState().tasks[0]?.title).toBe(
      'Review proposal\nhttps://example.com/proposal',
    )
    expect(input.value).toBe('')
  })

  it('does not submit while IME composition is active', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.type(input, '入力')
    fireEvent.keyDown(input, {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    })

    expect(useTaskStore.getState().tasks).toHaveLength(0)
    expect(input.value).toBe('入力')
  })

  it('accepts multiline title content before a trailing #group suffix', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.type(input, 'Review proposal')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'Check examples #work')
    await user.keyboard('{Enter}')

    const task = useTaskStore.getState().tasks[0]
    expect(task?.title).toBe('Review proposal\nCheck examples')
    expect(task?.groupId).toBe('work')
  })

  it('keeps an overlong draft after rejected submission', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.paste('a'.repeat(281))
    fireEvent.submit(getAddForm())

    expect(useTaskStore.getState().tasks).toHaveLength(0)
    expect(input.value).toBe('a'.repeat(281))
  })

  it('Enter with #group syntax submits the form', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #work')
    await user.keyboard('{Enter}')
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Buy milk')
    expect(tasks[0]?.groupId).toBe('work')
  })

  it('Enter with the popover closed submits the form', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Write report')
    await user.keyboard('{Enter}')
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Write report')
  })

  it('Enter on #unmatched creates the group and the task', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #brandnew')
    await user.keyboard('{Enter}')
    const groups = useGroupStore.getState().groups
    const brandnew = groups.find((g) => g.name === 'brandnew')
    expect(brandnew).toBeDefined()
    const tasks = useTaskStore.getState().tasks
    const task = tasks.find((t) => t.title === 'Buy milk')
    expect(task).toBeDefined()
    expect(task?.groupId).toBe(brandnew?.id)
  })
})

describe('AddTaskRow with defaultGroupId', () => {
  it('assigns task to defaultGroupId when provided and no #group syntax', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow defaultGroupId="work" />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Write report')
    await user.keyboard('{Enter}')

    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.groupId).toBe('work')
  })

  it('#group syntax overrides defaultGroupId', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow defaultGroupId="work" />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #General')
    await user.keyboard('{Enter}')

    const tasks = useTaskStore.getState().tasks
    expect(tasks[0]?.groupId).toBe('default')
  })

  it('falls back to stickyGroupId when defaultGroupId is null', async () => {
    useGroupStore.setState({ stickyGroupId: 'work' })
    const user = userEvent.setup()
    render(<AddTaskRow defaultGroupId={null} />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Write report')
    await user.keyboard('{Enter}')

    const tasks = useTaskStore.getState().tasks
    expect(tasks[0]?.groupId).toBe('work')
  })
})
