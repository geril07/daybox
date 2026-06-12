import { describe, it, expect, beforeEach } from 'vitest'

import { DEFAULT_GROUP_ID, useGroupStore, type Group } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { useTaskStore, type Task } from '@/features/tasks'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '@/features/timer'

import { buildSnapshot } from './build'
import { commitSnapshotImport, prepareSnapshotImport } from './import'
import {
  CurrentSnapshotSchema,
  type CurrentSnapshot,
  type PreparedSnapshot,
} from './schema'
import {
  CURRENT_SNAPSHOT_VERSION,
  SUPPORTED_SNAPSHOT_VERSIONS,
  readSnapshotVersion,
} from './version'

function createTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: 'Test',
    groupId: DEFAULT_GROUP_ID,
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: '2026-06-07T00:00:00.000Z',
    ...overrides,
  }
}

function createGroup(overrides: Partial<Group> & { id: string }): Group {
  return {
    name: 'General',
    color: 'oklch(0.545 0.185 28)',
    createdAt: '2026-06-07T00:00:00.000Z',
    ...overrides,
  }
}

function currentSnapshot(
  overrides: Partial<CurrentSnapshot> = {},
): CurrentSnapshot {
  return {
    version: CURRENT_SNAPSHOT_VERSION,
    exportedAt: '2026-06-07T00:00:00.000Z',
    tasks: [createTask({ id: 'task-1' })],
    groups: [createGroup({ id: DEFAULT_GROUP_ID })],
    timer: DEFAULT_TIMER_SETTINGS,
    planner: { weekStartDay: 1, browseDate: null },
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [createGroup({ id: DEFAULT_GROUP_ID })],
    stickyGroupId: null,
  })
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
  usePlannerStore.setState({ weekStartDay: 1, browseDate: null })
})

describe('readSnapshotVersion', () => {
  it('accepts only explicitly supported snapshot versions', () => {
    expect(SUPPORTED_SNAPSHOT_VERSIONS).toEqual([2, CURRENT_SNAPSHOT_VERSION])
    expect(readSnapshotVersion({ version: 2 })).toEqual({
      ok: true,
      version: 2,
    })
    expect(readSnapshotVersion({ version: CURRENT_SNAPSHOT_VERSION })).toEqual({
      ok: true,
      version: CURRENT_SNAPSHOT_VERSION,
    })
    expect(readSnapshotVersion({ version: 1 }).ok).toBe(false)
    expect(readSnapshotVersion({ version: 999 }).ok).toBe(false)
  })
})

describe('buildSnapshot', () => {
  it('builds a typed current snapshot and excludes theme', () => {
    const task = createTask({ id: 'task-1', title: 'Hello' })
    useTaskStore.setState({ tasks: [task] })
    useGroupStore.setState({
      groups: [createGroup({ id: DEFAULT_GROUP_ID, name: 'General' })],
    })
    useTimerStore.getState().setTimerSettings({ focusDuration: 45 })
    usePlannerStore.getState().setWeekStartDay(0)

    const snapshot = buildSnapshot()

    expect(snapshot.version).toBe(CURRENT_SNAPSHOT_VERSION)
    expect(Date.parse(snapshot.exportedAt)).not.toBeNaN()
    expect(snapshot.tasks).toEqual([task])
    expect(snapshot.groups.map((g) => g.id)).toEqual([DEFAULT_GROUP_ID])
    expect(snapshot.timer.focusDuration).toBe(45)
    expect(snapshot.planner.weekStartDay).toBe(0)
    expect('theme' in snapshot).toBe(false)
    expect(CurrentSnapshotSchema.safeParse(snapshot).success).toBe(true)
  })
})

describe('prepareSnapshotImport', () => {
  it('migrates v2 JSON into a current prepared snapshot and drops theme', () => {
    const result = prepareSnapshotImport(
      JSON.stringify({
        version: 2,
        exportedAt: '2025-12-01T00:00:00.000Z',
        tasks: [createTask({ id: 'task-1' })],
        groups: [createGroup({ id: DEFAULT_GROUP_ID })],
        settings: {
          timer: { ...DEFAULT_TIMER_SETTINGS, focusDuration: 35 },
          theme: 'dark',
          weekStartDay: 0,
        },
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.version).toBe(CURRENT_SNAPSHOT_VERSION)
    expect(result.snapshot.timer.focusDuration).toBe(35)
    expect(result.snapshot.planner).toEqual({
      weekStartDay: 0,
      browseDate: null,
    })
    expect('theme' in result.snapshot).toBe(false)
  })

  it('rejects malformed JSON without mutating stores', () => {
    useTaskStore.setState({ tasks: [createTask({ id: 'existing' })] })

    const result = prepareSnapshotImport('not json')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/corrupted/i)
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['existing'])
  })

  it('rejects unsupported versions and missing current fields without mutating stores', () => {
    useTaskStore.setState({ tasks: [createTask({ id: 'existing' })] })

    expect(
      prepareSnapshotImport(JSON.stringify({ version: 1, tasks: [] })).ok,
    ).toBe(false)
    expect(
      prepareSnapshotImport(
        JSON.stringify({
          version: CURRENT_SNAPSHOT_VERSION,
          exportedAt: '2026-06-07T00:00:00.000Z',
          tasks: [],
          groups: [],
          timer: DEFAULT_TIMER_SETTINGS,
        }),
      ).ok,
    ).toBe(false)
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['existing'])
  })

  it('rejects invalid current feature payloads without partial mutation', () => {
    useTaskStore.setState({ tasks: [createTask({ id: 'existing' })] })
    const invalid = {
      ...currentSnapshot(),
      tasks: [{ id: 'broken' }],
    }

    const result = prepareSnapshotImport(JSON.stringify(invalid))

    expect(result.ok).toBe(false)
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['existing'])
  })

  it('rejects duplicate task ids without mutating stores', () => {
    useTaskStore.setState({ tasks: [createTask({ id: 'existing' })] })
    const result = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          tasks: [
            createTask({ id: 'duplicate', title: 'First' }),
            createTask({ id: 'duplicate', title: 'Second' }),
          ],
        }),
      ),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/duplicate task id/i)
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['existing'])
  })

  it('rejects duplicate group ids without mutating stores', () => {
    useTaskStore.setState({ tasks: [createTask({ id: 'existing' })] })
    const result = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          groups: [
            createGroup({ id: DEFAULT_GROUP_ID }),
            createGroup({ id: 'work', name: 'Work' }),
            createGroup({ id: 'work', name: 'Work duplicate' }),
          ],
        }),
      ),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/duplicate group id/i)
    expect(useTaskStore.getState().tasks.map((t) => t.id)).toEqual(['existing'])
  })

  it('rejects duplicate default groups before normalization', () => {
    const result = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          groups: [
            createGroup({ id: DEFAULT_GROUP_ID, name: 'General' }),
            createGroup({ id: DEFAULT_GROUP_ID, name: 'General duplicate' }),
          ],
        }),
      ),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/duplicate/i)
  })

  it('repairs dangling task group references without mutating stores', () => {
    const result = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          tasks: [createTask({ id: 'task-1', groupId: 'missing-group' })],
        }),
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.tasks[0]?.groupId).toBe(DEFAULT_GROUP_ID)
    expect(result.warnings?.some((w) => w.includes('missing-group'))).toBe(true)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

  it('restores the default group when it is missing', () => {
    const result = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          groups: [createGroup({ id: 'work', name: 'Work' })],
          tasks: [createTask({ id: 'task-1', groupId: 'work' })],
        }),
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.groups.some((g) => g.id === DEFAULT_GROUP_ID)).toBe(
      true,
    )
    expect(result.warnings?.some((w) => w.includes('Default group'))).toBe(true)
  })
})

describe('commitSnapshotImport', () => {
  it('writes a prepared snapshot to every owning store', () => {
    const prepared = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          tasks: [createTask({ id: 'task-1', title: 'Imported' })],
          groups: [
            createGroup({ id: DEFAULT_GROUP_ID, name: 'Imported group' }),
          ],
          timer: { ...DEFAULT_TIMER_SETTINGS, focusDuration: 40 },
          planner: { weekStartDay: 0, browseDate: '2026-06-12' },
        }),
      ),
    )
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return

    commitSnapshotImport(prepared.snapshot)

    expect(useTaskStore.getState().tasks[0]?.title).toBe('Imported')
    expect(useGroupStore.getState().groups[0]?.name).toBe('Imported group')
    expect(useTimerStore.getState().settings.focusDuration).toBe(40)
    expect(usePlannerStore.getState().weekStartDay).toBe(0)
    expect(usePlannerStore.getState().browseDate).toBe('2026-06-12')
  })

  it('clears runtime references that are outside the snapshot', () => {
    useGroupStore.setState({
      groups: [
        createGroup({ id: DEFAULT_GROUP_ID }),
        createGroup({ id: 'stale-group', name: 'Stale group' }),
      ],
      stickyGroupId: 'stale-group',
    })
    useTimerStore.getState().setFocusedTaskId('stale-task')
    const prepared = prepareSnapshotImport(
      JSON.stringify(
        currentSnapshot({
          tasks: [createTask({ id: 'imported-task' })],
          groups: [createGroup({ id: DEFAULT_GROUP_ID })],
        }),
      ),
    )
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return

    commitSnapshotImport(prepared.snapshot)

    expect(useGroupStore.getState().stickyGroupId).toBeNull()
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })

  it('requires a prepared snapshot at compile time', () => {
    const snapshot = currentSnapshot()
    // @ts-expect-error CurrentSnapshot must be normalized before commit.
    const prepared: PreparedSnapshot = snapshot
    expect(prepared).toBe(snapshot)
  })
})
