import { describe, it, expect, beforeEach } from 'vitest'

import { DEFAULT_GROUP_ID, useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'

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

  it('refuses to delete the default group when other groups exist', () => {
    useGroupStore.getState().addGroup('Work')
    useGroupStore.getState().addGroup('Home')
    expect(useGroupStore.getState().groups).toHaveLength(3)

    useGroupStore.getState().deleteGroup(DEFAULT_GROUP_ID)

    const groups = useGroupStore.getState().groups
    expect(groups).toHaveLength(3)
    expect(groups.some((g) => g.id === DEFAULT_GROUP_ID)).toBe(true)
  })

  it('does not throw when asked to delete the default group', () => {
    useGroupStore.getState().addGroup('Work')
    expect(() =>
      useGroupStore.getState().deleteGroup(DEFAULT_GROUP_ID),
    ).not.toThrow()
  })
})
