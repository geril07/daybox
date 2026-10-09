## MODIFIED Requirements

### Requirement: User can delete a task

The system SHALL allow users to delete a task permanently.

When the task carries a `seriesId`, the system SHALL NOT delete it in one step. Instead the user SHALL be offered a choice between skipping that occurrence and deleting the whole series, as defined by the `recurring-tasks` capability. Skipping SHALL append the task's `occurrenceDate` to the series' `skipDates` and SHALL remove the task. Deleting the series SHALL remove the series and every task carrying that `seriesId`. Tasks without a `seriesId` SHALL be deleted in one step with no series state modified.

#### Scenario: Delete an ordinary task

- **WHEN** user clicks the delete button on a task row whose `seriesId` is `null`
- **THEN** the task is removed from the store
- **AND** no series state is modified

#### Scenario: Delete offers a choice for an occurrence

- **WHEN** user activates the delete control on a task row whose `seriesId` is set
- **THEN** the user is asked whether to skip this occurrence or delete the whole series
- **AND** the task is not removed until the user chooses

#### Scenario: Skipping removes only that occurrence

- **WHEN** the user chooses to skip the occurrence
- **THEN** that task is removed from the store
- **AND** the task's `occurrenceDate` is appended to that series' `skipDates`
- **AND** other occurrences of the same series remain in the store

### Requirement: Focused task id is cascade-cleared by destructive task actions

When a tasks-store action causes a task to **cease to exist** and that task is the currently focused task in the timer store, the action SHALL clear `useTimerStore.focusedTaskId` to `null` as part of the same store call. The cascade lives in the action body, not in any component, so the invariant holds regardless of caller (UI, import, test, migration).

The actions that trigger the cascade are:

- `deleteTask(id)` — cascade if `id === useTimerStore.focusedTaskId`
- `deleteTasksByGroupId(groupId)` — cascade if the focused task's `groupId` equals `groupId` _before_ the deletion
- Skipping a generated occurrence — cascade if the skipped task's id is the focused task
- Deleting a series — cascade if any removed occurrence is the focused task

Reassigning a task to a different group is **not** a cascade trigger. A reassigned task still exists with the same `id` and remains a valid focus target. Specifically:

- `reassignTasks(fromGroupId, toGroupId)` SHALL NOT clear focus, even when the focused task's `groupId` equals `fromGroupId`. The task continues to exist; its `groupId` updates and `useTimerStore.focusedTaskId` is preserved.
- `updateTask(id, updates)` SHALL NOT clear focus (even when `updates.groupId` is set). This was already the case and remains so.
- `reorderTasks(date, taskIds)` SHALL NOT trigger the cascade. Reordering only mutates `sortOrder` on tasks in the named bucket; task identity is preserved and no task ceases to exist.

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

#### Scenario: Deleting a group that contains the focused task clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and task `'t-1'` has `groupId: 'work'`
- **AND** `useTaskStore.deleteTasksByGroupId('work')` is called
- **THEN** task `'t-1'` is removed
- **AND** `useTimerStore.focusedTaskId` becomes `null`

#### Scenario: Reordering tasks never clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and task `'t-1'` has `date` set to today
- **AND** `useTaskStore.reorderTasks('<today>', ['t-1', 't-2'])` is called
- **THEN** the tasks are reordered within the today bucket
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Skipping the focused occurrence clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and task `'t-1'` is a generated occurrence
- **AND** the user skips that occurrence
- **THEN** task `'t-1'` is removed from the store
- **AND** `useTimerStore.focusedTaskId` becomes `null`

#### Scenario: Deleting the focused task's series clears focus

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and task `'t-1'` carries a `seriesId`
- **AND** the user deletes that whole series
- **THEN** task `'t-1'` is removed from the store
- **AND** `useTimerStore.focusedTaskId` becomes `null`

## ADDED Requirements

### Requirement: A task carries its recurrence identity

The `Task` schema SHALL include `seriesId` and `occurrenceDate`, both nullable `YYYY-MM-DD`-compatible strings — `seriesId` a generated identifier, `occurrenceDate` a `YYYY-MM-DD` date. Both fields SHALL be present together or absent together; a task with exactly one of them SHALL fail validation.

These fields identify which recurrence produced a task. They SHALL NOT change any existing task behaviour: the group lens, drag reorder, inline title edit, date reschedule, pomodoro estimate and completed-count editing, completion toggle, and focus binding SHALL treat a generated occurrence exactly as they treat any other task. The recurring marker SHALL be the only user-visible difference.

#### Scenario: A task created by the user carries no recurrence identity

- **WHEN** a task is added through the quick-add row
- **THEN** its `seriesId` is `null` and its `occurrenceDate` is `null`

#### Scenario: An occurrence validates

- **WHEN** a task with `seriesId: 's1'` and `occurrenceDate: '2026-10-06'` is validated with `TaskSchema`
- **THEN** validation succeeds

#### Scenario: A half-populated identity is rejected

- **WHEN** a task with `seriesId: 's1'` and `occurrenceDate: null` is validated with `TaskSchema`
- **THEN** validation fails

#### Scenario: An occurrence supports the normal task affordances

- **WHEN** a generated occurrence is rendered as a task row
- **THEN** it shows a checkbox, an editable title, its group tag, its pomodoro progress, a date control, and the existing focus and delete controls
- **AND** it participates in drag reorder inside its date bucket

#### Scenario: An occurrence can be focused

- **WHEN** the user clicks the focus control on a generated occurrence
- **THEN** `useTimerStore.focusedTaskId` is set to that task's id
- **AND** completing a pomodoro increments that task's `pomoCompleted`

### Requirement: The group lens filters occurrences like any other task

The group lens SHALL filter generated occurrences by their `groupId` exactly as it filters ordinary tasks. A series whose `groupId` is outside the active lens SHALL have all of its occurrences hidden by that lens, and the view's empty state SHALL be evaluated after this filtering.

#### Scenario: A lens hides a series' occurrences

- **WHEN** the group lens is `Work`
- **AND** a series with `groupId` `Personal` has an occurrence on today
- **THEN** that occurrence is not visible in Today

#### Scenario: A lens shows a matching series' occurrences

- **WHEN** the group lens is `Work`
- **AND** a series with `groupId` `Work` has an occurrence on today
- **THEN** that occurrence is visible in Today and is drag-sortable
