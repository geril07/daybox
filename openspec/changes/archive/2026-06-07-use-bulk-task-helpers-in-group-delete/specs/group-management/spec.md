## ADDED Requirements

### Requirement: Group deletion routes through the bulk task helpers

The system SHALL resolve a group's tasks during deletion by invoking the canonical bulk helpers in `task-management`, never by iterating per-task. Specifically:

- If the user chooses to move tasks to the default group, the implementation SHALL invoke `useTaskStore.reassignTasks(groupId, DEFAULT_GROUP_ID)` exactly once.
- If the user chooses to delete all tasks in the group, the implementation SHALL invoke `useTaskStore.deleteTasksByGroupId(groupId)` exactly once.

The implementation SHALL NOT iterate per-task to call `updateTask` or `deleteTask` for these resolutions. This rule exists because the bulk helpers carry the focused-task cascade behavior defined in `task-management`, and per-task callers would bypass it.

#### Scenario: Move uses `reassignTasks` exactly once

- **WHEN** the user deletes a group with tasks and chooses "Move tasks to General"
- **THEN** `useTaskStore.reassignTasks(groupId, DEFAULT_GROUP_ID)` is invoked exactly once
- **AND** no per-task `updateTask` calls occur for the moved tasks

#### Scenario: Delete-all uses `deleteTasksByGroupId` exactly once

- **WHEN** the user deletes a group with tasks and chooses "Delete all tasks"
- **THEN** `useTaskStore.deleteTasksByGroupId(groupId)` is invoked exactly once
- **AND** no per-task `deleteTask` calls occur for the deleted tasks

### Requirement: Group deletion preserves focus on moved tasks and clears focus on deleted tasks

The system SHALL surface the focused-task cascade defined in `task-management` at the user-visible group-deletion boundary with the following guarantees:

- When the user moves the tasks of the focused group to the default group during deletion, `useTimerStore.focusedTaskId` SHALL remain pointing at the (relocated) focused task.
- When the user deletes all tasks of the focused group during deletion, `useTimerStore.focusedTaskId` SHALL become `null` because the focused task no longer exists.
- When the user deletes a group that does not contain the focused task, `useTimerStore.focusedTaskId` SHALL remain unchanged.

#### Scenario: Moving the focused task's group preserves focus

- **WHEN** the focused task is `'t-1'` with `groupId: 'work'`
- **AND** the user deletes group `'work'` choosing "Move tasks to General"
- **THEN** task `'t-1'` now has `groupId: DEFAULT_GROUP_ID`
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Deleting the focused task's group clears focus

- **WHEN** the focused task is `'t-1'` with `groupId: 'work'`
- **AND** the user deletes group `'work'` choosing "Delete all tasks"
- **THEN** task `'t-1'` no longer exists
- **AND** `useTimerStore.focusedTaskId` is `null`

#### Scenario: Deleting an unfocused group leaves focus alone

- **WHEN** the focused task is `'t-1'` with `groupId: 'home'`
- **AND** the user deletes group `'work'` (which does not contain `'t-1'`)
- **THEN** `useTimerStore.focusedTaskId` remains `'t-1'`
