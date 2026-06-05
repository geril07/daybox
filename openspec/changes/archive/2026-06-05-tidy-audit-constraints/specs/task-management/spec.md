## ADDED Requirements

### Requirement: addTask returns null on validation failure

The `useTaskStore.addTask` action SHALL return `Task | null`. When the supplied title fails validation (empty after trim, or longer than 280 characters), the action SHALL return `null` and SHALL NOT mutate the store, after emitting a `console.warn` describing the reason. When the title passes validation, the action SHALL return the created `Task` (the same shape as today) and append it to the store. The action SHALL NOT return a placeholder object on failure.

#### Scenario: Valid title creates a task

- **WHEN** `addTask('Write report', 'general', '2026-06-05')` is called
- **THEN** the returned value is a `Task` with `title: 'Write report'`, `groupId: 'general'`, `date: '2026-06-05'`
- **AND** the task is appended to `useTaskStore.tasks`

#### Scenario: Empty title is rejected

- **WHEN** `addTask('   ', undefined, null)` is called
- **THEN** the returned value is `null`
- **AND** no task is appended to `useTaskStore.tasks`
- **AND** a `console.warn` is emitted

#### Scenario: Overlong title is rejected

- **WHEN** `addTask` is called with a 281-character string
- **THEN** the returned value is `null`
- **AND** no task is appended to `useTaskStore.tasks`
- **AND** a `console.warn` is emitted

### Requirement: Focused task id is cascade-cleared by destructive task actions

When a tasks-store action removes or reassigns a task that is the currently focused task in the timer store, the action SHALL clear `useTimerStore.focusedTaskId` to `null` as part of the same store call. The cascade lives in the action body, not in any component, so the invariant holds regardless of caller (UI, import, test, migration).

The actions that trigger the cascade are:

- `deleteTask(id)` — cascade if `id === useTimerStore.focusedTaskId`
- `reassignTasks(fromGroupId, toGroupId)` — cascade if the focused task's `groupId` equals `fromGroupId` _before_ the reassignment
- `deleteTasksByGroupId(groupId)` — cascade if the focused task's `groupId` equals `groupId` _before_ the deletion

`reorderTasks` SHALL NOT trigger the cascade (reordering preserves task identity).

The cascade SHALL use `useTimerStore.getState().setFocusedTaskId(null)`. The action SHALL NOT mutate the timer store in any other way.

#### Scenario: Deleting the focused task clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and `useTaskStore.deleteTask('t-1')` is called
- **THEN** the task is removed from `useTaskStore.tasks`
- **AND** `useTimerStore.focusedTaskId` becomes `null` after the call returns

#### Scenario: Deleting a non-focused task leaves focus alone

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and `useTaskStore.deleteTask('t-2')` is called
- **THEN** the task is removed from `useTaskStore.tasks`
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Reassigning the focused task's group clears focus

- **WHEN** task `'t-1'` has `groupId: 'work'` and `useTimerStore.focusedTaskId` is `'t-1'`
- **AND** `useTaskStore.reassignTasks('work', 'general')` is called
- **THEN** task `'t-1'` now has `groupId: 'general'`
- **AND** `useTimerStore.focusedTaskId` becomes `null`

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
