## MODIFIED Requirements

### Requirement: Focused task id is cascade-cleared by destructive task actions

When a tasks-store action causes a task to **cease to exist** and that task is the currently focused task in the timer store, the action SHALL clear `useTimerStore.focusedTaskId` to `null` as part of the same store call. The cascade lives in the action body, not in any component, so the invariant holds regardless of caller (UI, import, test, migration).

The actions that trigger the cascade are:

- `deleteTask(id)` — cascade if `id === useTimerStore.focusedTaskId`
- `deleteTasksByGroupId(groupId)` — cascade if the focused task's `groupId` equals `groupId` _before_ the deletion

Reassigning a task to a different group is **not** a cascade trigger. A reassigned task still exists with the same `id` and remains a valid focus target. Specifically:

- `reassignTasks(fromGroupId, toGroupId)` SHALL NOT clear focus, even when the focused task's `groupId` equals `fromGroupId`. The task continues to exist; its `groupId` updates and `useTimerStore.focusedTaskId` is preserved.
- `updateTask(id, updates)` SHALL NOT clear focus (even when `updates.groupId` is set). This was already the case and remains so.
- `reorderTasks` SHALL NOT trigger the cascade (reordering preserves task identity).

The cascade SHALL use `useTimerStore.getState().setFocusedTaskId(null)`. The action SHALL NOT mutate the timer store in any other way.

#### Scenario: Deleting the focused task clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and `useTaskStore.deleteTask('t-1')` is called
- **THEN** the task is removed from `useTaskStore.tasks`
- **AND** `useTimerStore.focusedTaskId` becomes `null` after the call returns

#### Scenario: Deleting a non-focused task leaves focus alone

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and `useTaskStore.deleteTask('t-2')` is called
- **THEN** the task is removed from `useTaskStore.tasks`
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Reassigning the focused task's group preserves focus

- **WHEN** task `'t-1'` has `groupId: 'work'` and `useTimerStore.focusedTaskId` is `'t-1'`
- **AND** `useTaskStore.reassignTasks('work', 'general')` is called
- **THEN** task `'t-1'` now has `groupId: 'general'`
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Reassigning an unrelated group leaves focus alone

- **WHEN** task `'t-1'` has `groupId: 'work'` and `useTimerStore.focusedTaskId` is `'t-1'`
- **AND** `useTaskStore.reassignTasks('home', 'general')` is called
- **THEN** task `'t-1'` is unchanged
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Deleting a group that contains the focused task clears focus

- **WHEN** task `'t-1'` has `groupId: 'work'` and `useTimerStore.focusedTaskId` is `'t-1'`
- **AND** `useTaskStore.deleteTasksByGroupId('work')` is called
- **THEN** task `'t-1'` is removed
- **AND** `useTimerStore.focusedTaskId` becomes `null`

#### Scenario: Reordering tasks never clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'`
- **AND** `useTaskStore.reorderTasks([…reorderedTasks])` is called
- **THEN** the tasks are reordered
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`
