## ADDED Requirements

### Requirement: Group deletion preserves the focused-task cascade

The system SHALL ensure that deleting a group never bypasses the focused-task cascade defined by the `task-management` capability (see "Focused task id is cascade-cleared by destructive task actions"). Specifically, when the user resolves a group's tasks during deletion:

- If the user chooses to move tasks to the default group, the implementation SHALL invoke `useTaskStore.reassignTasks(groupId, DEFAULT_GROUP_ID)` exactly once.
- If the user chooses to delete all tasks in the group, the implementation SHALL invoke `useTaskStore.deleteTasksByGroupId(groupId)` exactly once.

The implementation SHALL NOT iterate per-task to call `updateTask` or `deleteTask` for these resolutions, because the per-task path does not trigger the focused-task cascade defined in `task-management`.

The user-observable guarantee is: after a group is deleted, `useTimerStore.focusedTaskId` is `null` whenever the previously focused task lived in the deleted group, regardless of which resolution the user chose.

#### Scenario: Moving tasks of the focused group clears focus

- **WHEN** the focused task is `'t-1'` with `groupId: 'work'`
- **AND** the user deletes group `'work'` choosing "Move tasks to General"
- **THEN** task `'t-1'` now has `groupId: DEFAULT_GROUP_ID`
- **AND** `useTimerStore.focusedTaskId` is `null`

#### Scenario: Deleting tasks of the focused group clears focus

- **WHEN** the focused task is `'t-1'` with `groupId: 'work'`
- **AND** the user deletes group `'work'` choosing "Delete all tasks"
- **THEN** task `'t-1'` no longer exists
- **AND** `useTimerStore.focusedTaskId` is `null`

#### Scenario: Deleting an unfocused group leaves focus alone

- **WHEN** the focused task is `'t-1'` with `groupId: 'home'`
- **AND** the user deletes group `'work'` (which does not contain `'t-1'`)
- **THEN** `useTimerStore.focusedTaskId` remains `'t-1'`
