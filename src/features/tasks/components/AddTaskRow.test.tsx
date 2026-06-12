import {
  render,
  screen,
  cleanup,
  within,
  fireEvent,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useGroupStore } from '@/features/groups'
import { useTaskStore } from '@/features/tasks'
import { AddTaskRow } from '@/features/tasks/components/AddTaskRow'

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

function getAddInput(): HTMLInputElement {
  return document.querySelector(
    'input[placeholder^="Add a task"]',
  ) as HTMLInputElement
}

function getAddForm(): HTMLFormElement {
  return document.querySelector('.add-task-wrap') as HTMLFormElement
}

function getAddButton(): HTMLButtonElement {
  return screen.getByTitle('Add task') as HTMLButtonElement
}

function getPopoverContent(): HTMLElement | null {
  return document.querySelector('[data-slot="popover-content"]')
}

function isPopoverOpen(): boolean {
  return (
    document.querySelector('[data-slot="popover-content"][data-open]') !== null
  )
}

describe('AddTaskRow', () => {
  it('does not render the suggestions popover when input has no trailing #', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Write report')
    expect(isPopoverOpen()).toBe(false)
  })

  it('renders the suggestions popover when input has a trailing #', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #')
    expect(isPopoverOpen()).toBe(true)
    const popover = getPopoverContent()!
    expect(within(popover).getByText('General')).toBeTruthy()
    expect(within(popover).getByText('Work')).toBeTruthy()
  })

  it('filters suggestions by the typed prefix', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    const popover = getPopoverContent()!
    expect(within(popover).getByText('Work')).toBeTruthy()
    expect(within(popover).queryByText('General')).toBeNull()
  })

  it('opening the popover does not move focus from the input', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #')
    expect(isPopoverOpen()).toBe(true)
    expect(document.activeElement).toBe(input)
  })

  it('Tab does not enter the suggestions popover', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    const popover = getPopoverContent()!
    const workButton = within(popover).getByText('Work').closest('button')!
    expect(workButton.tabIndex).toBe(-1)
  })

  it('ArrowDown highlights the first suggestion, then the second', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #')
    const popover = getPopoverContent()!
    await user.keyboard('{ArrowDown}')
    const firstHighlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(firstHighlighted).not.toBeNull()
    expect(firstHighlighted.textContent).toContain('General')
    await user.keyboard('{ArrowDown}')
    const secondHighlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(secondHighlighted.textContent).toContain('Work')
  })

  it('ArrowUp from no highlight sets the last suggestion; ArrowUp from first wraps to last', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #')
    const popover = getPopoverContent()!
    await user.keyboard('{ArrowUp}')
    let highlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(highlighted.textContent).toContain('Work')
    await user.keyboard('{ArrowUp}')
    highlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(highlighted.textContent).toContain('General')
  })

  it('Enter on a highlighted suggestion accepts it and does not submit', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(input.value).toBe('Buy milk #Work ')
    expect(isPopoverOpen()).toBe(false)
    expect(document.activeElement).toBe(input)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

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

  it('Enter with the popover open but no highlight submits the form', async () => {
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
    expect(isPopoverOpen()).toBe(false)
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

  it('clicking a suggestion rewrites the input, closes the popover, clears the highlight, and refocuses the input', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    const popover = getPopoverContent()!
    const workButton = within(popover).getByText('Work').closest('button')!
    await user.click(workButton)
    expect(input.value).toBe('Buy milk #Work ')
    expect(isPopoverOpen()).toBe(false)
    expect(document.activeElement).toBe(input)
  })

  it('shows the "Press Enter to create" hint when no group matches and the hint is not a button', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #brandnew')
    const popover = getPopoverContent()!
    const hint = within(popover).getByText(
      'Press Enter to create group "brandnew"',
    )
    expect(hint).toBeTruthy()
    expect(hint.closest('button')).toBeNull()
  })

  it('Escape closes the popover, clears the highlight, leaves the input value and focus intact', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    await user.keyboard('{ArrowDown}')
    expect(isPopoverOpen()).toBe(true)
    await user.keyboard('{Escape}')
    expect(isPopoverOpen()).toBe(false)
    expect(input.value).toBe('Buy milk #wo')
    expect(document.activeElement).toBe(input)
  })

  it('outside click closes the popover and clears the highlight; the input value is preserved', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <button data-testid="outside">outside</button>
        <AddTaskRow />
      </div>,
    )
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    await user.keyboard('{ArrowDown}')
    expect(isPopoverOpen()).toBe(true)
    await user.click(screen.getByTestId('outside'))
    expect(isPopoverOpen()).toBe(false)
    expect(input.value).toBe('Buy milk #wo')
  })

  it('removing the trailing # closes the popover and clears the highlight', async () => {
    const user = userEvent.setup()
    render(<AddTaskRow />)
    const input = getAddInput()
    await user.click(input)
    await user.type(input, 'Buy milk #wo')
    await user.keyboard('{ArrowDown}')
    await user.clear(input)
    await user.type(input, 'Buy milk #')
    const popover = getPopoverContent()!
    expect(popover.querySelector('[data-highlighted="true"]')).toBeNull()
    await user.clear(input)
    await user.type(input, 'Buy milk ')
    expect(isPopoverOpen()).toBe(false)
  })

  it('Enter on #unmatched with popover open and no highlight creates the group and the task', async () => {
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
