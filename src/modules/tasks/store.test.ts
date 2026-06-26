import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

import { useTimerStore } from '@/modules/timer'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { TaskSchema } from './schema'
import { useTaskStore } from './store'
import { compactAllBuckets } from './store.helpers'
import type { Task } from './types'

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'generated',
    title: 'test',
    groupId: 'default',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [t2.id, t1.id],
    })

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [t3.id, t1.id, t2.id],
    })

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [a.id],
    })

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [today2.id, today1.id],
    })

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
      date: '2026-06-08',
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

    useTaskStore
      .getState()
      .reorderTasks({ date: '2026-06-08', taskIds: [t2.id, t1.id] })

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [c.id, a.id],
    })

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [a.id],
    })

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

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [b.id, c.id, a.id],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    // survivingSortOrders = [0, 1, 2], B→0, C→1, A→2
    expect(byId[b.id].sortOrder).toBe(0)
    expect(byId[c.id].sortOrder).toBe(1)
    expect(byId[a.id].sortOrder).toBe(2)
  })

  it('warns when a taskId has a different date and leaves it untouched', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g1', '2026-06-09')
    if (!a || !b) throw new Error('addTask returned null')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [a.id, b.id],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    // 'a' is in the bucket, gets compacted sortOrder 0
    expect(byId[a.id].sortOrder).toBe(0)
    // 'b' is in a different bucket, completely untouched
    expect(byId[b.id].date).toBe('2026-06-09')
    expect(byId[b.id].sortOrder).toBe(b.sortOrder)
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })
})

describe('Task Store - addTask sortOrder (Section 2)', () => {
  it('adds task after a gap with sortOrder = max + 1', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
        makeTask({ id: 'b', date: '2026-06-08', sortOrder: 2 }),
      ],
    })
    const task = useTaskStore.getState().addTask('New', 'g1', '2026-06-08')
    expect(task).not.toBeNull()
    expect(task!.sortOrder).toBe(3)
  })

  it('first task in an empty bucket gets sortOrder 0', () => {
    const task = useTaskStore.getState().addTask('First', 'g1', '2026-06-10')
    expect(task).not.toBeNull()
    expect(task!.sortOrder).toBe(0)
  })

  it('undated bucket uses max + 1 rule', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', date: null, sortOrder: 0 }),
        makeTask({ id: 'b', date: null, sortOrder: 3 }),
      ],
    })
    const task = useTaskStore.getState().addTask('New')
    expect(task).not.toBeNull()
    expect(task!.sortOrder).toBe(4)
  })
})

describe('Task Store - updateTask date-change renumber (Section 3)', () => {
  it('move to empty target bucket gets sortOrder 0', () => {
    const src = useTaskStore.getState().addTask('Move me', 'g1', '2026-06-08')
    if (!src) throw new Error('addTask returned null')

    useTaskStore.getState().updateTask(src.id, { date: '2026-06-09' })

    const moved = useTaskStore.getState().tasks.find((t) => t.id === src.id)
    expect(moved).toBeDefined()
    expect(moved!.date).toBe('2026-06-09')
    expect(moved!.sortOrder).toBe(0)
  })

  it('move to non-empty target gets sortOrder = max + 1', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
        makeTask({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
        makeTask({ id: 'c', date: '2026-06-08', sortOrder: 3 }),
        makeTask({ id: 'd', date: '2026-06-09', sortOrder: 0 }),
      ],
    })
    useTaskStore.getState().updateTask('d', { date: '2026-06-08' })

    const moved = useTaskStore.getState().tasks.find((t) => t.id === 'd')
    expect(moved!.sortOrder).toBe(4)
  })

  it('source bucket is left with a gap after date-change move', () => {
    const a = useTaskStore.getState().addTask('A', 'g1', '2026-06-08')
    const b = useTaskStore.getState().addTask('B', 'g1', '2026-06-08')
    const c = useTaskStore.getState().addTask('C', 'g1', '2026-06-08')
    if (!a || !b || !c) throw new Error('addTask returned null')

    useTaskStore.getState().updateTask(b.id, { date: '2026-06-09' })

    const src = useTaskStore
      .getState()
      .tasks.filter((t) => t.date === '2026-06-08')
    const byId = Object.fromEntries(src.map((t) => [t.id, t]))
    expect(byId[a.id].sortOrder).toBe(0)
    expect(byId[c.id].sortOrder).toBe(2)
  })

  it('groupId-only update does not change sortOrder', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', groupId: 'g1', date: '2026-06-08', sortOrder: 5 }),
      ],
    })
    useTaskStore.getState().updateTask('a', { groupId: 'g2' })

    const task = useTaskStore.getState().tasks.find((t) => t.id === 'a')
    expect(task!.groupId).toBe('g2')
    expect(task!.sortOrder).toBe(5)
  })

  it('updateTask with both date and groupId applies both', () => {
    const src = useTaskStore.getState().addTask('Both', 'g1', '2026-06-08')
    if (!src) throw new Error('addTask returned null')

    useTaskStore
      .getState()
      .updateTask(src.id, { date: '2026-06-09', groupId: 'g2' })

    const task = useTaskStore.getState().tasks.find((t) => t.id === src.id)
    expect(task!.date).toBe('2026-06-09')
    expect(task!.groupId).toBe('g2')
    expect(task!.sortOrder).toBe(0)
  })

  it('title-only update does not modify sortOrder', () => {
    const src = useTaskStore.getState().addTask('Original', 'g1', '2026-06-08')
    if (!src) throw new Error('addTask returned null')
    const originalSortOrder = src.sortOrder

    useTaskStore.getState().updateTask(src.id, { title: 'Updated' })

    const task = useTaskStore.getState().tasks.find((t) => t.id === src.id)
    expect(task!.title).toBe('Updated')
    expect(task!.sortOrder).toBe(originalSortOrder)
  })
})

describe('Task Store - reorderTasks defensive compact (Section 4)', () => {
  it('defensive compact heals duplicate sortOrders in the bucket', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
        makeTask({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
        makeTask({ id: 'c', date: '2026-06-08', sortOrder: 1 }),
        makeTask({ id: 'd', date: '2026-06-08', sortOrder: 3 }),
      ],
    })

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: ['a', 'b', 'c', 'd'],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId['a'].sortOrder).toBe(0)
    expect(byId['b'].sortOrder).toBe(1)
    expect(byId['c'].sortOrder).toBe(2)
    expect(byId['d'].sortOrder).toBe(3)
  })

  it('empty taskIds still compacts the bucket (Phase 1 runs, Phase 2 skipped)', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
        makeTask({ id: 'b', date: '2026-06-08', sortOrder: 2 }),
      ],
    })

    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: [],
    })

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId['a'].sortOrder).toBe(0)
    expect(byId['b'].sortOrder).toBe(1)
  })

  it('tasks in a different bucket are completely untouched', () => {
    const other = makeTask({
      id: 'other',
      date: '2026-06-09',
      sortOrder: 99,
    })
    useTaskStore.setState({
      tasks: [
        makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
        makeTask({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
        other,
      ],
    })

    const refBefore = useTaskStore
      .getState()
      .tasks.find((t) => t.id === 'other')
    useTaskStore.getState().reorderTasks({
      date: '2026-06-08',
      taskIds: ['a', 'b'],
    })

    const refAfter = useTaskStore.getState().tasks.find((t) => t.id === 'other')
    expect(refAfter).toBe(refBefore)
    expect(refAfter!.sortOrder).toBe(99)
    expect(refAfter!.date).toBe('2026-06-09')
  })
})

describe('Task Store - reassignTasks compaction (Section 5)', () => {
  it('compacts affected date buckets after group merge', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({
          id: 'a',
          groupId: 'work',
          date: '2026-06-25',
          sortOrder: 0,
        }),
        makeTask({
          id: 'b',
          groupId: 'home',
          date: '2026-06-25',
          sortOrder: 0,
        }),
      ],
    })

    useTaskStore.getState().reassignTasks('work', 'home')

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    expect(byId['a'].groupId).toBe('home')
    expect(byId['b'].groupId).toBe('home')
    const bucket = useTaskStore
      .getState()
      .tasks.filter((t) => t.date === '2026-06-25')
    expect(bucket.map((t) => t.sortOrder).sort((a, b) => a - b)).toEqual([0, 1])
  })

  it('does not compact buckets with no moved tasks, even with pre-existing duplicates', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({
          id: 'a',
          groupId: 'work',
          date: '2026-06-30',
          sortOrder: 0,
        }),
        makeTask({
          id: 'b',
          groupId: 'work',
          date: '2026-06-30',
          sortOrder: 1,
        }),
        makeTask({
          id: 'c',
          groupId: 'work',
          date: '2026-06-30',
          sortOrder: 1,
        }),
      ],
    })

    useTaskStore.getState().reassignTasks('home', 'work')

    const byId = Object.fromEntries(
      useTaskStore.getState().tasks.map((t) => [t.id, t]),
    )
    // No tasks had groupId 'home', so nothing moved, no compaction
    expect(byId['a'].sortOrder).toBe(0)
    expect(byId['b'].sortOrder).toBe(1)
    expect(byId['c'].sortOrder).toBe(1)
  })
})

describe('Task Store - rehydrate compaction (Section 7)', () => {
  it('afterValidate heals duplicate sortOrders on rehydrate', () => {
    const TaskStateSchema = z.object({
      tasks: z.array(TaskSchema),
    })
    const onRehydrate = createValidatedRehydrate<{ tasks: Task[] }>({
      name: 'test',
      schema: TaskStateSchema,
      init: { tasks: [] },
      afterValidate: (state) => {
        state.tasks = compactAllBuckets(state.tasks)
      },
    })
    const postRehydrate = onRehydrate(undefined as unknown as { tasks: Task[] })

    const corrupted: Task[] = [
      makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      makeTask({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
      makeTask({ id: 'c', date: '2026-06-08', sortOrder: 1 }),
      makeTask({ id: 'd', date: '2026-06-08', sortOrder: 3 }),
    ]
    const state = { tasks: corrupted }
    postRehydrate!(state, undefined)

    const bucket = state.tasks.filter((t) => t.date === '2026-06-08')
    expect(bucket.map((t) => t.sortOrder).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3,
    ])
  })

  it('clean data stays in the same order after rehydrate compaction', () => {
    const TaskStateSchema = z.object({
      tasks: z.array(TaskSchema),
    })
    const onRehydrate = createValidatedRehydrate<{ tasks: Task[] }>({
      name: 'test',
      schema: TaskStateSchema,
      init: { tasks: [] },
      afterValidate: (state) => {
        state.tasks = compactAllBuckets(state.tasks)
      },
    })
    const postRehydrate = onRehydrate(undefined as unknown as { tasks: Task[] })

    const clean: Task[] = [
      makeTask({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      makeTask({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
      makeTask({ id: 'c', date: '2026-06-09', sortOrder: 0 }),
    ]
    const state = { tasks: clean }
    postRehydrate!(state, undefined)

    expect(state.tasks.map((t) => t.sortOrder)).toEqual([0, 1, 0])
  })

  it('compacts the undated (null) bucket on rehydrate', () => {
    const TaskStateSchema = z.object({
      tasks: z.array(TaskSchema),
    })
    const onRehydrate = createValidatedRehydrate<{ tasks: Task[] }>({
      name: 'test',
      schema: TaskStateSchema,
      init: { tasks: [] },
      afterValidate: (state) => {
        state.tasks = compactAllBuckets(state.tasks)
      },
    })
    const postRehydrate = onRehydrate(undefined as unknown as { tasks: Task[] })

    const corrupted: Task[] = [
      makeTask({ id: 'a', date: null, sortOrder: 0 }),
      makeTask({ id: 'b', date: null, sortOrder: 0 }),
    ]
    const state = { tasks: corrupted }
    postRehydrate!(state, undefined)

    const undated = state.tasks.filter((t) => t.date === null)
    expect(undated.map((t) => t.sortOrder).sort((a, b) => a - b)).toEqual([
      0, 1,
    ])
  })

  it('schema validation failure does not invoke afterValidate', () => {
    const afterValidate = vi.fn()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const StrictSchema = z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string().max(5),
        }),
      ),
    })
    const onRehydrate = createValidatedRehydrate<{
      tasks: { id: string; title: string }[]
    }>({
      name: 'test',
      schema: StrictSchema,
      init: { tasks: [] },
      afterValidate,
    })
    const postRehydrate = onRehydrate(
      undefined as unknown as { tasks: { id: string; title: string }[] },
    )

    const invalid = {
      tasks: [{ id: 'a', title: 'too long title' }],
    }
    postRehydrate!(invalid, undefined)

    expect(afterValidate).not.toHaveBeenCalled()
    expect(invalid.tasks).toEqual([])
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
