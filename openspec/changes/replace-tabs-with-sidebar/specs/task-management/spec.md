## MODIFIED Requirements

### Requirement: User can create a task

The system SHALL allow users to create tasks with a title, group assignment, optional date, and optional pomodoro estimate. The add-task row SHALL submit through a native form submit path instead of relying solely on an input `keydown` handler for `Enter`.

When the active sidebar group lens is a concrete group id and the user does not provide an explicit `#group` suffix, quick-add SHALL assign the new task to that active group. When the active sidebar group lens is `All groups`, quick-add SHALL use the existing sticky/default group behavior. Explicit `#group` syntax SHALL continue to override the sidebar group lens.

#### Scenario: Create task via quick-add

- **WHEN** user types a title in the add-task input and presses Enter
- **THEN** a new task is created with the typed title, assigned to the default or sticky group, with no date and 0 pomodoro estimate

#### Scenario: Create task with active sidebar group lens

- **WHEN** the active sidebar group lens is `Work`
- **AND** user types `Write report` in the add-task input and presses Enter
- **THEN** the new task is assigned to `Work`

#### Scenario: Create task with #group syntax

- **WHEN** user types "Write report #work" in the add-task input
- **THEN** the task is created with group "work" (created if not exists)
- **AND** the `#group` assignment is used even when a different sidebar group lens is active

#### Scenario: Native form submit creates a task

- **WHEN** the user types a task title into the add-task input
- **AND** the browser dispatches a form submit event for the row
- **THEN** the task is created using the existing title, active sidebar group lens, and `#group` parsing rules

#### Scenario: Mobile submit button creates a task

- **WHEN** the user types a task title into the add-task input on a coarse-pointer device
- **AND** taps the `Add task` submit button
- **THEN** the task is created
- **AND** the input is cleared

#### Scenario: Empty mobile submit is disabled

- **WHEN** the add-task input is empty or only whitespace
- **THEN** the coarse-pointer `Add task` submit button is disabled

## ADDED Requirements

### Requirement: Specific group lens renders date buckets as static lists

The system SHALL preserve existing date-bucket drag reorder behavior when the active group lens is `All groups`. When the active group lens is a concrete group id, task lists filtered by that group SHALL render without drag-and-drop wiring and SHALL NOT call `useTaskStore.reorderTasks`.

This applies to single-date sections, undated sections, and per-date sections in multi-section views. Overdue sections remain non-sortable as before.

#### Scenario: All groups keeps date-bucket reorder

- **WHEN** the active group lens is `All groups`
- **AND** the user views a sortable date bucket such as `Today`
- **THEN** the task list preserves the existing drag-and-drop reorder behavior

#### Scenario: Concrete group lens disables date-bucket reorder

- **WHEN** the active group lens is `Work`
- **AND** the user views `Today`
- **THEN** the task rows are not registered for drag-and-drop sorting
- **AND** no reorder action is available for that filtered list

#### Scenario: Concrete group lens does not reorder hidden tasks

- **WHEN** the active group lens is `Work`
- **AND** the visible list is filtered to `Work` tasks
- **AND** tasks from other groups exist in the same date bucket
- **THEN** the system does not call `useTaskStore.reorderTasks` from that filtered list
- **AND** hidden tasks keep their existing sort order
