import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useGroupStore } from '@/features/groups'
import { TaskRow, useTaskStore } from '@/features/tasks'
import { useTimerStore } from '@/features/timer'

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

function openPomoPopover() {
  const trigger = document.querySelector(
    '[data-slot="popover-trigger"]',
  ) as HTMLElement
  act(() => {
    fireEvent.click(trigger)
  })
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

  it('toggles completion on checkbox click', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const checkbox = document.querySelector(
      '.rounded-full.border',
    ) as HTMLButtonElement
    fireEvent.click(checkbox)
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.completed).toBe(true)
  })

  it('enters and exits edit mode', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const title = screen.getAllByText('Test Task')[0]
    fireEvent.click(title)
    const input = document.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'Edited' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.title).toBe('Edited')
  })

  it('deletes task on delete button click', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const deleteBtn = document.querySelector(
      '[title="Delete"]',
    ) as HTMLButtonElement
    fireEvent.click(deleteBtn)
    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
  })

  it('focuses task on focus button click', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const focusBtn = document.querySelector(
      '[title="Focus"]',
    ) as HTMLButtonElement
    fireEvent.click(focusBtn)
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

  it('popover contains two NumberInputs labelled for estimate and completed', () => {
    const task = createMockTask({ pomoEstimate: 3, pomoCompleted: 1 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    expect(screen.getByText('Estimate')).toBeTruthy()
    expect(screen.getByText('Completed')).toBeTruthy()
    expect(visibleInput('3')).toBeTruthy()
    expect(visibleInput('1')).toBeTruthy()
  })

  it('lowering estimate below completed clamps completed in a single store call', () => {
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 5 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    const estimateInput = visibleInput('5')
    act(() => {
      fireEvent.change(estimateInput, { target: { value: '3' } })
    })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(3)
    expect(updated?.pomoCompleted).toBe(3)
  })

  it('increasing completed does not affect estimate', () => {
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 2 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    const completedInput = visibleInput('2')
    act(() => {
      fireEvent.change(completedInput, { target: { value: '4' } })
    })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(5)
    expect(updated?.pomoCompleted).toBe(4)
  })

  it('disables the + control on completed when completed === estimate', () => {
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 5 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    const plusButtons = screen.getAllByText('+')
    const completedPlus = plusButtons[1] as HTMLButtonElement
    expect(completedPlus.disabled).toBe(true)
  })

  it('disables the − control on completed when completed === 0', () => {
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    const minusButtons = screen.getAllByText('−')
    const completedMinus = minusButtons[1] as HTMLButtonElement
    expect(completedMinus.disabled).toBe(true)
  })

  it('does not toggle task.completed when manually setting completed = estimate', () => {
    const task = createMockTask({
      pomoEstimate: 5,
      pomoCompleted: 3,
      completed: false,
    })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    const completedInput = visibleInput('3')
    act(() => {
      fireEvent.change(completedInput, { target: { value: '5' } })
    })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(5)
    expect(updated?.completed).toBe(false)
  })

  it('clearing the estimate input is a no-op (prior value preserved)', () => {
    const task = createMockTask({ pomoEstimate: 5, pomoCompleted: 2 })
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    openPomoPopover()
    const estimateInput = visibleInput('5')
    act(() => {
      fireEvent.change(estimateInput, { target: { value: '' } })
    })
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoEstimate).toBe(5)
  })
})
