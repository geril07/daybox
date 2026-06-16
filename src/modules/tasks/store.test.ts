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

    useTaskStore
      .getState()
      .reorderTasks({ date: '2026-06-08', taskIds: [t2.id, t1.id] })

    expect(useTimerStore.getState().focusedTaskId).toBe(t1.id)
  })
})

describe('Task Store - reorderTasks bucket scope', () => {
  it('reorders tasks within a single date bucket and assigns sortOrder 0..n-1', () => {
    const t1 = useTaskStore.getState().addTask('One', 'g1', '2026-06-08')
    const t2 = useTaskStore.getState().addTask('Two', 'g1', '2026-06-08')
    const t3 = useTaskStore.getState().addTask('Three', 'g1', '2026-06-08')
    if (!t1 || !t2 || !t3) throw new Error('addTask returned null')

    useTaskStore
      .getState()
      .reorderTasks({ date: '2026-06-08', taskIds: [t3.id, t1.id, t2.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[t3.id].sortOrder).toBe(0)
    expect(byId[t1.id].sortOrder).toBe(1)
    expect(byId[t2.id].sortOrder).toBe(2)
  })

  it('reorders an undated (date: null) bucket without affecting dated tasks', () => {
    const u1 = useTaskStore.getState().addTask('Undated 1', 'g1', null)
    const u2 = useTaskStore.getState().addTask('Undated 2', 'g1', null)
    const dated = useTaskStore.getState().addTask('Dated', 'g1', '2026-06-08')
    if (!u1 || !u2 || !dated) throw new Error('addTask returned null')
    const originalDatedSortOrder = useTaskStore
      .getState()
      .tasks.find((t) => t.id === dated.id)!.sortOrder

    useTaskStore
      .getState()
      .reorderTasks({ date: null, taskIds: [u2.id, u1.id] })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[u2.id].sortOrder).toBe(0)
    expect(byId[u1.id].sortOrder).toBe(1)
    // The dated task is untouched in every observable way.
    expect(byId[dated.id].date).toBe('2026-06-08')
    expect(byId[dated.id].sortOrder).toBe(originalDatedSortOrder)
  })

  it('does not delete tasks in other buckets when reordering one bucket', () => {
    // Regression test for the destructive `set({ tasks: subset })` bug.
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

    useTaskStore
      .getState()
      .reorderTasks({ date: '2026-06-08', taskIds: [today2.id, today1.id] })

    const allTasks = useTaskStore.getState().tasks
    expect(allTasks).toHaveLength(3)
    const surviving = allTasks.find((t) => t.id === tomorrow.id)
    expect(surviving).toBeDefined()
    expect(surviving!.date).toBe('2026-06-09')
    expect(surviving!.sortOrder).toBe(tomorrow.sortOrder)
  })

  it('ignores ids that are not in the bucket and emits a single warning', () => {
    const inBucket = useTaskStore.getState().addTask('In', 'g1', '2026-06-08')
    const otherBucket = useTaskStore
      .getState()
      .addTask('Other', 'g1', '2026-06-09')
    if (!inBucket || !otherBucket) throw new Error('addTask returned null')
    const originalOtherSortOrder = useTaskStore
      .getState()
      .tasks.find((t) => t.id === otherBucket.id)!.sortOrder

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [inBucket.id, otherBucket.id, 'nonexistent-id'],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[inBucket.id].sortOrder).toBe(0)
    expect(byId[otherBucket.id].sortOrder).toBe(originalOtherSortOrder)
    expect(byId[otherBucket.id].date).toBe('2026-06-09')
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('does not warn when every id is in the bucket', () => {
    const t1 = useTaskStore.getState().addTask('One', 'g1', '2026-06-08')
    const t2 = useTaskStore.getState().addTask('Two', 'g1', '2026-06-08')
    if (!t1 || !t2) throw new Error('addTask returned null')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useTaskStore
      .getState()
      .reorderTasks({ date: '2026-06-08', taskIds: [t2.id, t1.id] })

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('Task Store - reorderTasks group scope', () => {
  it('swaps sortOrders within group, preserves other groups', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    const c = useTaskStore.getState().addTask('C', 'g1', '2026-06-08')
    const d = useTaskStore.getState().addTask('D', 'g2', '2026-06-08')
    if (!a || !b || !c || !d) throw new Error('addTask returned null')

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [c.id, a.id],
      groupId: 'g1',
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[c.id].sortOrder).toBe(0)
    expect(byId[a.id].sortOrder).toBe(2)
    expect(byId[b.id].sortOrder).toBe(1)
    expect(byId[d.id].sortOrder).toBe(3)
  })

  it('preserves other groups sortOrders unchanged', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    if (!a || !b) throw new Error('addTask returned null')
    const bOriginalSortOrder = useTaskStore
      .getState()
      .tasks.find((t) => t.id === b.id)!.sortOrder

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [a.id],
      groupId: 'g1',
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[b.id].sortOrder).toBe(bOriginalSortOrder)
  })

  it('reorders undated bucket with groupId', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', null)
    const b = useTaskStore.getState().addTask('B', 'g2', null)
    const c = useTaskStore.getState().addTask('C', 'g1', null)
    if (!a || !b || !c) throw new Error('addTask returned null')

    useTaskStore.getState().reorderTasks({
      date: null,
      taskIds: [c.id, a.id],
      groupId: 'g1',
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[c.id].sortOrder).toBe(0)
    expect(byId[a.id].sortOrder).toBe(2)
    expect(byId[b.id].sortOrder).toBe(1)
  })

  it('warns and aborts on slot mismatch', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    if (!a || !b) throw new Error('addTask returned null')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [a.id, b.id],
      groupId: 'g1',
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('without groupId assigns sortOrders 0..n-1 as before', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g2', '2026-06-08')
    const c = useTaskStore.getState().addTask('C', 'g1', '2026-06-08')
    if (!a || !b || !c) throw new Error('addTask returned null')

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [c.id, b.id, a.id],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId[c.id].sortOrder).toBe(0)
    expect(byId[b.id].sortOrder).toBe(1)
    expect(byId[a.id].sortOrder).toBe(2)
  })
})
