import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  act,
} from '@testing-library/react'
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

function getPopoverContent(): HTMLElement | null {
  return document.querySelector('[data-slot="popover-content"]')
}

function isPopoverOpen(): boolean {
  return (
    document.querySelector('[data-slot="popover-content"][data-open]') !== null
  )
}

function type(value: string) {
  const input = getAddInput()
  act(() => {
    fireEvent.change(input, { target: { value } })
  })
}

describe('AddTaskRow', () => {
  it('does not render the suggestions popover when input has no trailing #', () => {
    render(<AddTaskRow />)
    type('Write report')
    expect(isPopoverOpen()).toBe(false)
  })

  it('renders the suggestions popover when input has a trailing #', () => {
    render(<AddTaskRow />)
    type('Buy milk #')
    expect(isPopoverOpen()).toBe(true)
    const popover = getPopoverContent()!
    expect(within(popover).getByText('General')).toBeTruthy()
    expect(within(popover).getByText('Work')).toBeTruthy()
  })

  it('filters suggestions by the typed prefix', () => {
    render(<AddTaskRow />)
    type('Buy milk #wo')
    const popover = getPopoverContent()!
    expect(within(popover).getByText('Work')).toBeTruthy()
    expect(within(popover).queryByText('General')).toBeNull()
  })

  it('opening the popover does not move focus from the input', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #')
    expect(isPopoverOpen()).toBe(true)
    expect(document.activeElement).toBe(input)
  })

  it('Tab does not enter the suggestions popover', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #wo')
    const popover = getPopoverContent()!
    const workButton = within(popover).getByText('Work').closest('button')!
    expect(workButton.tabIndex).toBe(-1)
  })

  it('ArrowDown highlights the first suggestion, then the second', () => {
    render(<AddTaskRow />)
    type('Buy milk #')
    const popover = getPopoverContent()!
    const input = getAddInput()
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const firstHighlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(firstHighlighted).not.toBeNull()
    expect(firstHighlighted.textContent).toContain('General')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const secondHighlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(secondHighlighted.textContent).toContain('Work')
  })

  it('ArrowUp from no highlight sets the last suggestion; ArrowUp from first wraps to last', () => {
    render(<AddTaskRow />)
    type('Buy milk #')
    const popover = getPopoverContent()!
    const input = getAddInput()
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    let highlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(highlighted.textContent).toContain('Work')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    highlighted = popover.querySelector(
      '[data-highlighted="true"]',
    ) as HTMLElement
    expect(highlighted.textContent).toContain('General')
  })

  it('Enter on a highlighted suggestion accepts it and does not submit', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #wo')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    expect(input.value).toBe('Buy milk #Work ')
    expect(isPopoverOpen()).toBe(false)
    expect(document.activeElement).toBe(input)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

  it('Enter with the popover open but no highlight submits the form', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #work')
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Buy milk')
    expect(tasks[0]?.groupId).toBe('work')
    expect(isPopoverOpen()).toBe(false)
  })

  it('Enter with the popover closed submits the form', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Write report')
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Write report')
  })

  it('clicking a suggestion rewrites the input, closes the popover, clears the highlight, and refocuses the input', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #wo')
    const popover = getPopoverContent()!
    const workButton = within(popover).getByText('Work').closest('button')!
    act(() => {
      fireEvent.click(workButton)
    })
    expect(input.value).toBe('Buy milk #Work ')
    expect(isPopoverOpen()).toBe(false)
    expect(document.activeElement).toBe(input)
  })

  it('shows the "Press Enter to create" hint when no group matches and the hint is not a button', () => {
    render(<AddTaskRow />)
    type('Buy milk #brandnew')
    const popover = getPopoverContent()!
    const hint = within(popover).getByText(
      'Press Enter to create group "brandnew"',
    )
    expect(hint).toBeTruthy()
    expect(hint.closest('button')).toBeNull()
  })

  it('Escape closes the popover, clears the highlight, leaves the input value and focus intact', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #wo')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    expect(isPopoverOpen()).toBe(true)
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })
    expect(isPopoverOpen()).toBe(false)
    expect(input.value).toBe('Buy milk #wo')
    expect(document.activeElement).toBe(input)
  })

  it('outside click closes the popover and clears the highlight; the input value is preserved', () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <AddTaskRow />
      </div>,
    )
    const input = getAddInput()
    input.focus()
    type('Buy milk #wo')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    expect(isPopoverOpen()).toBe(true)
    act(() => {
      fireEvent.mouseDown(screen.getByTestId('outside'))
      fireEvent.click(screen.getByTestId('outside'))
    })
    expect(isPopoverOpen()).toBe(false)
    expect(input.value).toBe('Buy milk #wo')
  })

  it('removing the trailing # closes the popover and clears the highlight', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #wo')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    type('Buy milk #')
    const popover = getPopoverContent()!
    expect(popover.querySelector('[data-highlighted="true"]')).toBeNull()
    type('Buy milk ')
    expect(isPopoverOpen()).toBe(false)
  })

  it('Enter on #unmatched with popover open and no highlight creates the group and the task', () => {
    render(<AddTaskRow />)
    const input = getAddInput()
    input.focus()
    type('Buy milk #brandnew')
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    const groups = useGroupStore.getState().groups
    const brandnew = groups.find((g) => g.name === 'brandnew')
    expect(brandnew).toBeDefined()
    const tasks = useTaskStore.getState().tasks
    const task = tasks.find((t) => t.title === 'Buy milk')
    expect(task).toBeDefined()
    expect(task?.groupId).toBe(brandnew?.id)
  })
})
