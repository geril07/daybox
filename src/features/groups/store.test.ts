import { describe, it, expect, beforeEach } from 'vitest'

import { useGroupStore } from '@/features/groups'
import { useTaskStore } from '@/features/tasks'

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
})

describe('Group Store - CRUD', () => {
  it('adds a group', () => {
    useGroupStore.getState().addGroup('Work')
    const groups = useGroupStore.getState().groups
    expect(groups).toHaveLength(2)
    expect(groups.some((g) => g.name === 'Work')).toBe(true)
  })

  it('renames a group', () => {
    const group = useGroupStore.getState().groups[0]
    useGroupStore.getState().renameGroup(group.id, 'Renamed')
    expect(useGroupStore.getState().groups[0].name).toBe('Renamed')
  })

  it('deletes a group and reassigns tasks', () => {
    const group = useGroupStore.getState().addGroup('Work')
    const task = useTaskStore.getState().addTask('Test', group.id)
    if (!task) throw new Error('addTask returned null')
    useGroupStore.getState().deleteGroup(group.id)
    useTaskStore
      .getState()
      .reassignTasks(group.id, useGroupStore.getState().getDefaultGroup()!.id)
    const storedTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storedTask?.groupId).toBe('default')
  })
})
