import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useTaskStore } from '@/modules/tasks'
import { useTimerStore } from '@/modules/timer'

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

  it('reorderTasks never clears focus, even when the focused task is reordered', () => {
    const t1 = useTaskStore.getState().addTask('One', 'g1', '2026-06-08')
    const t2 = useTaskStore.getState().addTask('Two', 'g1', '2026-06-08')
    if (!t1 || !t2) throw new Error('addTask returned null')
    useTimerStore.getState().setFocusedTaskId(t1.id)

    useTaskStore.getState().reorderTasks({ taskIds: [t2.id, t1.id] })

    expect(useTimerStore.getState().focusedTaskId).toBe(t1.id)
  })
})

describe('Task Store - reorderTasks', () => {
  it('redistributes existing sortOrders to taskIds in the given order', () => {
    const t1 = useTaskStore.getState().addTask('One', 'g1', '2026-06-08')
    const t2 = useTaskStore.getState().addTask('Two', 'g1', '2026-06-08')
    const t3 = useTaskStore.getState().addTask('Three', 'g1', '2026-06-08')
    if (!t1 || !t2 || !t3) throw new Error('addTask returned null')
    // Initial sortOrders: t1=0, t2=1, t3=2

    useTaskStore.getState().reorderTasks({ taskIds: [t3.id, t1.id, t2.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[t3.id].sortOrder).toBe(0)
    expect(byId[t1.id].sortOrder).toBe(1)
    expect(byId[t2.id].sortOrder).toBe(2)
  })

  it('leaves tasks outside taskIds untouched', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g1', '2026-06-09')
    if (!a || !b) throw new Error('addTask returned null')
    const bOriginalSortOrder = useTaskStore
      .getState()
      .tasks.find((t) => t.id === b.id)!.sortOrder

    useTaskStore.getState().reorderTasks({ taskIds: [a.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[b.id].sortOrder).toBe(bOriginalSortOrder)
    expect(byId[b.id].date).toBe('2026-06-09')
  })

  it('does not delete tasks outside taskIds', () => {
    const today1 = useTaskStore
      .getState()
      .addTask('Today 1', 'g1', '2026-06-08')
    const today2 = useTaskStore
      .getState()
      .addTask('Today 2', 'g1', '2026-06-08')
    const tomorrow = useTaskStore
      .getState()
      .addTask('Tomorrow', 'g1', '2026-06-09')
    if (!today1 || !today2 || !tomorrow)
      throw new Error('addTask returned null')

    useTaskStore.getState().reorderTasks({ taskIds: [today2.id, today1.id] })

    const allTasks = useTaskStore.getState().tasks
    expect(allTasks).toHaveLength(3)
    const surviving = allTasks.find((t) => t.id === tomorrow.id)
    expect(surviving).toBeDefined()
    expect(surviving!.date).toBe('2026-06-09')
    expect(surviving!.sortOrder).toBe(tomorrow.sortOrder)
  })

  it('ignores unknown ids and emits a single warning', () => {
    const valid = useTaskStore.getState().addTask('Valid', 'g1', '2026-06-08')
    if (!valid) throw new Error('addTask returned null')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useTaskStore.getState().reorderTasks({
      taskIds: [valid.id, 'nonexistent-id'],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    // valid task gets its own sortOrder back (only one in the set)
    expect(byId[valid.id].sortOrder).toBe(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('does not warn when every id is valid', () => {
    const t1 = useTaskStore.getState().addTask('One', 'g1', '2026-06-08')
    const t2 = useTaskStore.getState().addTask('Two', 'g1', '2026-06-08')
    if (!t1 || !t2) throw new Error('addTask returned null')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useTaskStore.getState().reorderTasks({ taskIds: [t2.id, t1.id] })

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('preserves sortOrders of tasks not included in taskIds', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    const c = useTaskStore.getState().addTask('C', 'g1', '2026-06-08')
    const d = useTaskStore.getState().addTask('D', 'g2', '2026-06-08')
    if (!a || !b || !c || !d) throw new Error('addTask returned null')
    // Initial sortOrders: A=0, B=1, C=2, D=3

    useTaskStore.getState().reorderTasks({ taskIds: [c.id, a.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    // survivingSortOrders = [0, 2], C→0, A→2
    expect(byId[c.id].sortOrder).toBe(0)
    expect(byId[a.id].sortOrder).toBe(2)
    // B and D untouched
    expect(byId[b.id].sortOrder).toBe(1)
    expect(byId[d.id].sortOrder).toBe(3)
  })

  it('single task reorder is a no-op for sortOrder', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    if (!a || !b) throw new Error('addTask returned null')
    const bOriginalSortOrder = useTaskStore
      .getState()
      .tasks.find((t) => t.id === b.id)!.sortOrder

    useTaskStore.getState().reorderTasks({ taskIds: [a.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[a.id].sortOrder).toBe(0)
    expect(byId[b.id].sortOrder).toBe(bOriginalSortOrder)
  })

  it('redistributes sortOrders across groups within the same date', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    const c = useTaskStore.getState().addTask('C', 'g1', '2026-06-08')
    if (!a || !b || !c) throw new Error('addTask returned null')
    // Initial sortOrders: A=0, B=1, C=2

    useTaskStore.getState().reorderTasks({ taskIds: [b.id, c.id, a.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    // survivingSortOrders = [0, 1, 2], B→0, C→1, A→2
    expect(byId[b.id].sortOrder).toBe(0)
    expect(byId[c.id].sortOrder).toBe(1)
    expect(byId[a.id].sortOrder).toBe(2)
  })
})
