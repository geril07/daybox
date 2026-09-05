import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useGroupStore } from '@/modules/groups'
import { usePlannerStore } from '@/modules/planner'
import { useTimerStore } from '@/modules/timer'
import { addDaysToDate, getPlannerDate } from '@/shared/dates'
import { installCoarsePointerMatchMediaStub } from '@/test-utils/matchMedia'

import { useTaskStore } from '../store'
import { TaskRow } from './TaskRow'

let restoreMatchMedia: (() => void) | null = null

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
  usePlannerStore.setState({
    weekStartDay: 1,
    browseDate: null,
    dayStartMinutes: 0,
  })
})

afterEach(() => {
  cleanup()
  restoreMatchMedia?.()
  restoreMatchMedia = null
})

function createMockTask(overrides = {}) {
  return {
    id: 'test-1',
    title: 'Test Task',
    groupId: 'default',
    date: null,
    pomoEstimate: 3,
    pomoCompleted: 1,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

async function openPomoPopover(user: ReturnType<typeof userEvent.setup>) {
  const trigger = document.querySelector(
    '[data-slot="popover-trigger"]',
  ) as HTMLElement
  await user.click(trigger)
}

function visibleInput(value: string): HTMLInputElement {
  const matches = screen
    .getAllByDisplayValue(value)
    .filter((el) => (el as HTMLInputElement).type !== 'hidden')
  return matches[0] as HTMLInputElement
}

function dragHandle(): HTMLElement {
  return document.querySelector('.cursor-grab') as HTMLElement
}

function finePointerActions(): HTMLElement {
  return document.querySelector('[title="Focus"]')?.parentElement as HTMLElement
}

function coarsePointerActions(): HTMLElement {
  return document.querySelector('[title="More actions"]')
    ?.parentElement as HTMLElement
}

describe('TaskRow', () => {
  it('renders task title', () => {
    render(<TaskRow task={createMockTask()} />)
    const titles = screen.getAllByText('Test Task')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('preserves multiline title display and clickable links', async () => {
    const task = createMockTask({
      title: 'Review proposal\nhttps://example.com/proposal',
    })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)

    const link = screen.getByRole('link', {
      name: 'https://example.com/proposal',
    })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.closest('span')?.className).toContain('whitespace-pre-wrap')
    expect(link.closest('span')?.textContent).toContain(
      'Review proposal\nhttps://example.com/proposal',
    )
    await userEvent.setup().click(link)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('preserves multiline text and links in the action sheet', async () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    render(
      <TaskRow
        task={createMockTask({ title: 'Review\nhttps://example.com' })}
      />,
    )
    await userEvent.setup().click(screen.getByTitle('More actions'))
    const heading = await screen.findByRole('heading', { name: /Review/ })
    expect(heading.textContent).toBe('Review\nhttps://example.com')
    expect(heading).toHaveClass('whitespace-pre-wrap', 'break-words')
    expect(heading.querySelector('a')).toHaveAttribute(
      'href',
      'https://example.com/',
    )
  })

  it('uses the effective planner date for Today and Tomorrow presets', async () => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dayStartMinutes =
      currentMinutes > 30 ? currentMinutes - 30 : currentMinutes + 30
    const expectedToday = getPlannerDate(now, dayStartMinutes)
    const expectedTomorrow = addDaysToDate(expectedToday, 1)
    const user = userEvent.setup()
    const task = createMockTask({ date: expectedTomorrow })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} dayStartMinutes={dayStartMinutes} />)

    await user.click(screen.getByTitle('Schedule'))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(useTaskStore.getState().tasks[0]?.date).toBe(expectedToday)

    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
    expect(useTaskStore.getState().tasks[0]?.date).toBe(expectedTomorrow)
  })

  it('toggles completion on checkbox click', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const checkbox = document.querySelector(
      '.rounded-full.border',
    ) as HTMLButtonElement
    await user.click(checkbox)
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.completed).toBe(true)
  })

  it('places the caret near the clicked text when editing starts', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)

    const display = document.querySelector('span.cursor-text')
    expect(display).not.toBeNull()
    const textNode = display?.querySelector('span')?.firstChild
    expect(textNode).toBeInstanceOf(Text)

    const range = document.createRange()
    range.setStart(textNode!, 5)
    range.collapse(true)
    const documentWithCaretApi = document as Document & {
      caretRangeFromPoint?: () => Range | null
    }
    const originalCaretRangeFromPoint = documentWithCaretApi.caretRangeFromPoint
    documentWithCaretApi.caretRangeFromPoint = vi.fn(() => range)

    try {
      fireEvent.click(display!, { clientX: 100, clientY: 100 })
      const input = document.querySelector(
        'textarea[aria-label^="Edit task title"]',
      ) as HTMLTextAreaElement
      expect(input.selectionStart).toBe(5)
      expect(input.selectionEnd).toBe(5)
    } finally {
      if (originalCaretRangeFromPoint) {
        documentWithCaretApi.caretRangeFromPoint = originalCaretRangeFromPoint
      } else {
        Reflect.deleteProperty(documentWithCaretApi, 'caretRangeFromPoint')
      }
    }
  })

  it('enters and exits edit mode', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const title = screen.getAllByText('Test Task')[0]
    await user.click(title)
    const input = document.querySelector(
      'textarea[aria-label^="Edit task title"]',
    ) as HTMLTextAreaElement
    expect(input).not.toBeNull()
    await user.clear(input)
    await user.type(input, 'Edited')
    await user.keyboard('{Enter}')
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.title).toBe('Edited')
  })

  it('edits a task with an explicit line break', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await user.click(screen.getByText('Test Task'))
    const input = document.querySelector(
      'textarea[aria-label^="Edit task title"]',
    ) as HTMLTextAreaElement

    await user.clear(input)
    await user.type(input, 'Review proposal')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'https://example.com/proposal')
    expect(useTaskStore.getState().tasks[0]?.title).toBe('Test Task')

    await user.keyboard('{Enter}')
    expect(useTaskStore.getState().tasks[0]?.title).toBe(
      'Review proposal\nhttps://example.com/proposal',
    )
  })

  it('does not save while IME composition is active', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await user.click(screen.getByText('Test Task'))
    const input = document.querySelector(
      'textarea[aria-label^="Edit task title"]',
    ) as HTMLTextAreaElement
    await user.clear(input)
    await user.type(input, '入力')
    fireEvent.keyDown(input, {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    })

    expect(useTaskStore.getState().tasks[0]?.title).toBe('Test Task')
    expect(input.value).toBe('入力')
  })

  it('cancelling a multiline edit does not save on blur', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await user.click(screen.getByText('Test Task'))
    const input = document.querySelector(
      'textarea[aria-label^="Edit task title"]',
    ) as HTMLTextAreaElement
    await user.clear(input)
    await user.type(input, 'Changed')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'line')
    await user.keyboard('{Escape}')
    fireEvent.blur(input)

    expect(useTaskStore.getState().tasks[0]?.title).toBe('Test Task')
    expect(screen.getByText('Test Task')).toBeTruthy()
  })

  it('keeps an invalid multiline edit open for correction', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await user.click(screen.getByText('Test Task'))
    const input = document.querySelector(
      'textarea[aria-label^="Edit task title"]',
    ) as HTMLTextAreaElement
    await user.clear(input)
    await user.paste('a'.repeat(281))
    await user.keyboard('{Enter}')

    expect(
      document.querySelector('textarea[aria-label^="Edit task title"]'),
    ).toBeTruthy()
    expect(useTaskStore.getState().tasks[0]?.title).toBe('Test Task')
  })

  it('deletes task on delete button click', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const deleteBtn = document.querySelector(
      '[title="Delete"]',
    ) as HTMLButtonElement
    await user.click(deleteBtn)
    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
  })

  it('focuses task on focus button click', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const focusBtn = document.querySelector(
      '[title="Focus"]',
    ) as HTMLButtonElement
    await user.click(focusBtn)
    expect(useTimerStore.getState().focusedTaskId).toBe('test-1')
  })

  it('preserves the grip space but hides the icon when dragHandleRef is omitted', () => {
    render(<TaskRow task={createMockTask()} />)
    const container = document.querySelector('.p-0\\.5.shrink-0')
    expect(container).not.toBeNull()
    expect(container!.querySelector('svg')).toBeNull()
    expect(document.querySelector('.cursor-grab')).toBeNull()
  })

  it('renders the drag handle with proper classes when dragHandleRef is provided', () => {
    const handleRef = () => {}
    render(<TaskRow task={createMockTask()} dragHandleRef={handleRef} />)
    expect(dragHandle().className).toContain('opacity-0')
    expect(dragHandle().className).toContain('group-hover:opacity-100')
  })

  it('shows the drag handle at rest on coarse pointers', () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    const handleRef = () => {}
    render(<TaskRow task={createMockTask()} dragHandleRef={handleRef} />)
    expect(dragHandle().className).toContain('pointer-coarse:opacity-100')
  })

  it('keeps focus and delete query selectors available on fine pointers', () => {
    render(<TaskRow task={createMockTask()} />)
    expect(document.querySelector('[title="Focus"]')).toBeTruthy()
    expect(document.querySelector('[title="Delete"]')).toBeTruthy()
  })

  it('uses CSS to hide the coarse actions on fine pointers', () => {
    render(<TaskRow task={createMockTask()} />)
    expect(screen.getByTitle('More actions')).toBeTruthy()
    expect(coarsePointerActions().className).toContain('pointer-fine:hidden')
  })

  it('uses CSS to hide the hover actions on coarse pointers', () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    render(<TaskRow task={createMockTask()} />)
    expect(screen.getByTitle('More actions')).toBeTruthy()
    expect(finePointerActions().className).toContain('pointer-coarse:hidden')
  })

  it('opens a bottom sheet from the coarse-pointer more actions button', async () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    const user = userEvent.setup()
    const task = createMockTask()
    render(<TaskRow task={task} />)

    await user.click(screen.getByTitle('More actions'))

    expect(screen.getAllByText('Test Task').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Focus this task')).toBeTruthy()
    expect(screen.getAllByText('Delete').length).toBeGreaterThanOrEqual(1)
  })

  it('focuses the task from the action sheet and closes it', async () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)

    await user.click(screen.getByTitle('More actions'))
    await user.click(screen.getByText('Focus this task'))

    expect(useTimerStore.getState().focusedTaskId).toBe(task.id)
    await waitFor(() =>
      expect(screen.queryByText('Focus this task')).toBeNull(),
    )
  })

  it('deletes the task from the action sheet and closes it', async () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)

    await user.click(screen.getByTitle('More actions'))
    await user.click(screen.getAllByText('Delete')[0])

    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
    await waitFor(() =>
      expect(screen.queryByText('Focus this task')).toBeNull(),
    )
  })

  it('closes the action sheet on Escape without modifying the task', async () => {
    restoreMatchMedia = installCoarsePointerMatchMediaStub()
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)

    await user.click(screen.getByTitle('More actions'))
    await user.keyboard('{Escape}')

    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeTruthy()
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
    await waitFor(() =>
      expect(screen.queryByText('Focus this task')).toBeNull(),
    )
  })

  it('renders X/Y text on the pomo trigger when both fields are set', () => {
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 2 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    expect(screen.getByText('2/5')).toBeTruthy()
  })

  it('renders 0/0 on the pomo trigger when both fields are zero', () => {
    const task = createMockTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    expect(screen.getByText('0/0')).toBeTruthy()
  })

  it('popover contains two NumberInputs labelled for estimate and completed', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 3, pomoCompleted: 1 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    expect(screen.getByText('Estimate')).toBeTruthy()
    expect(screen.getByText('Completed')).toBeTruthy()
    expect(visibleInput('3')).toBeTruthy()
    expect(visibleInput('1')).toBeTruthy()
  })

  it('lowering estimate below completed does not change completed', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 5 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const estimateInput = visibleInput('5')
    await user.clear(estimateInput)
    await user.type(estimateInput, '3')
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(3)
    expect(updated?.pomoCompleted).toBe(5)
  })

  it('increasing estimate above the legacy 9 cap preserves pomoCompleted', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 9, pomoCompleted: 4 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const estimateInput = visibleInput('9')
    await user.clear(estimateInput)
    fireEvent.change(estimateInput, { target: { value: '25' } })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(25)
    expect(updated?.pomoCompleted).toBe(4)
  })

  it('setting a fractional estimate preserves pomoCompleted', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 3, pomoCompleted: 1 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const estimateInput = visibleInput('3')
    await user.clear(estimateInput)
    fireEvent.change(estimateInput, { target: { value: '2.5' } })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(2.5)
    expect(updated?.pomoCompleted).toBe(1)
  })

  it('lowering a high estimate does not change pomoCompleted', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 20, pomoCompleted: 14 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const estimateInput = visibleInput('20')
    await user.clear(estimateInput)
    fireEvent.change(estimateInput, { target: { value: '10' } })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(10)
    expect(updated?.pomoCompleted).toBe(14)
  })

  it('increasing completed does not affect estimate', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 2 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const completedInput = visibleInput('2')
    await user.clear(completedInput)
    await user.type(completedInput, '4')
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(5)
    expect(updated?.pomoCompleted).toBe(4)
  })

  it('increasing completed above estimate is accepted', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 3, pomoCompleted: 1 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const completedInput = visibleInput('1')
    await user.clear(completedInput)
    fireEvent.change(completedInput, { target: { value: '7' } })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(7)
    expect(updated?.pomoEstimate).toBe(3)
  })

  it('disables the + control on completed at the global cap of 99', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 99, pomoCompleted: 99 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const plusButtons = screen.getAllByText('+')
    const completedPlus = plusButtons[1] as HTMLButtonElement
    expect(completedPlus.disabled).toBe(true)
  })

  it('disables the − control on completed when completed === 0', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const minusButtons = screen.getAllByText('−')
    const completedMinus = minusButtons[1] as HTMLButtonElement
    expect(completedMinus.disabled).toBe(true)
  })

  it('does not toggle task.completed when manually setting completed = estimate', async () => {
    const user = userEvent.setup()
    const task = createMockTask({
      pomoEstimate: 5,
      pomoCompleted: 3,
      completed: false,
    })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const completedInput = visibleInput('3')
    await user.clear(completedInput)
    await user.type(completedInput, '5')
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(5)
    expect(updated?.completed).toBe(false)
  })

  it('clearing the estimate input is a no-op (prior value preserved)', async () => {
    const user = userEvent.setup()
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 2 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    await openPomoPopover(user)
    const estimateInput = visibleInput('5')
    await user.clear(estimateInput)
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(5)
  })
})
