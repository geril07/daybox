import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useGroupStore } from '@/features/groups'
import { useTimerStore } from '@/features/timer'

import { useTaskStore } from '../store'
import { TaskRow } from './TaskRow'

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
})

afterEach(() => {
  cleanup()
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

describe('TaskRow', () => {
  it('renders task title', () => {
    render(<TaskRow task={createMockTask()} />)
    const titles = screen.getAllByText('Test Task')
    expect(titles.length).toBeGreaterThanOrEqual(1)
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

  it('enters and exits edit mode', async () => {
    const user = userEvent.setup()
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const title = screen.getAllByText('Test Task')[0]
    await user.click(title)
    const input = document.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    await user.clear(input)
    await user.type(input, 'Edited')
    await user.keyboard('{Enter}')
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.title).toBe('Edited')
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
