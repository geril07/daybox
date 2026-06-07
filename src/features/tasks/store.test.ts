import { describe, it, expect, beforeEach } from 'vitest'

import { useTaskStore } from '@/features/tasks'
import { useTimerStore } from '@/features/timer'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
  })
})

describe('Task Store - CRUD', () => {
  it('adds a task', () => {
    useTaskStore.getState().addTask('Test task')
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Test task')
  })

  it('updates a task', () => {
    const task = useTaskStore.getState().addTask('Test')
    if (!task) throw new Error('addTask returned null')
    useTaskStore.getState().updateTask(task.id, { title: 'Updated' })
    expect(useTaskStore.getState().tasks[0].title).toBe('Updated')
  })

  it('deletes a task', () => {
    const task = useTaskStore.getState().addTask('Test')
    if (!task) throw new Error('addTask returned null')
    useTaskStore.getState().deleteTask(task.id)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

  it('toggles task completion', () => {
    const task = useTaskStore.getState().addTask('Test')
    if (!task) throw new Error('addTask returned null')
    useTaskStore.getState().toggleTask(task.id)
    expect(useTaskStore.getState().tasks[0].completed).toBe(true)
    useTaskStore.getState().toggleTask(task.id)
    expect(useTaskStore.getState().tasks[0].completed).toBe(false)
  })
})

describe('Task Store - focused-task cascade', () => {
  it('reassignTasks preserves focus when the focused task is in the from-group', () => {
    const task = useTaskStore.getState().addTask('Focus me', 'work')
    if (!task) throw new Error('addTask returned null')
    useTimerStore.getState().setFocusedTaskId(task.id)

    useTaskStore.getState().reassignTasks('work', 'general')

    const moved = useTaskStore.getState().tasks.find((t) => t.id === task.id)
    expect(moved?.groupId).toBe('general')
    expect(useTimerStore.getState().focusedTaskId).toBe(task.id)
  })

  it('reassignTasks leaves focus alone when the focused task is in an unrelated group', () => {
    const task = useTaskStore.getState().addTask('Focus me', 'home')
    if (!task) throw new Error('addTask returned null')
    useTimerStore.getState().setFocusedTaskId(task.id)

    useTaskStore.getState().reassignTasks('work', 'general')

    expect(useTimerStore.getState().focusedTaskId).toBe(task.id)
  })

  it('deleteTasksByGroupId clears focus when the focused task is in the deleted group', () => {
    const task = useTaskStore.getState().addTask('Focus me', 'work')
    if (!task) throw new Error('addTask returned null')
    useTimerStore.getState().setFocusedTaskId(task.id)

    useTaskStore.getState().deleteTasksByGroupId('work')

    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })

  it('deleteTasksByGroupId leaves focus alone when the focused task is in an unrelated group', () => {
    const focused = useTaskStore.getState().addTask('Stay focused', 'home')
    if (!focused) throw new Error('addTask returned null')
    useTaskStore.getState().addTask('Other', 'work')
    useTimerStore.getState().setFocusedTaskId(focused.id)

    useTaskStore.getState().deleteTasksByGroupId('work')

    expect(useTimerStore.getState().focusedTaskId).toBe(focused.id)
  })

  it('deleteTask clears focus when the deleted task is focused', () => {
    const task = useTaskStore.getState().addTask('Focus me')
    if (!task) throw new Error('addTask returned null')
    useTimerStore.getState().setFocusedTaskId(task.id)

    useTaskStore.getState().deleteTask(task.id)

    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })
})
