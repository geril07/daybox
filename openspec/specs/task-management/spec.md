## Purpose

Create, edit, delete, reorder, and complete tasks. Each task has a title, group assignment, optional date, pomodoro estimate, and completion status.

## Requirements

### Requirement: User can create a task

The system SHALL allow users to create tasks with a title, group assignment, optional date, and optional pomodoro estimate.

#### Scenario: Create task via quick-add

- **WHEN** user types a title in the add-task input and presses Enter
- **THEN** a new task is created with the typed title, assigned to the default (or lens-active) group, with no date and 0 pomodoro estimate

#### Scenario: Create task with #group syntax

- **WHEN** user types "Write report #work" in the add-task input
- **THEN** the task is created with group "work" (created if not exists)

### Requirement: User can edit a task title

The system SHALL allow users to edit a task title inline by tapping the title text.

#### Scenario: Inline edit title

- **WHEN** user taps a task title
- **THEN** the title becomes an editable input field

#### Scenario: Save edited title

- **WHEN** user modifies the title and presses Enter or blurs the input
- **THEN** the task title is updated in the store

#### Scenario: Cancel edit

- **WHEN** user presses Escape while editing a title
- **THEN** the edit is cancelled and the original title is restored

### Requirement: User can complete a task

The system SHALL allow users to mark a task as complete by clicking its checkbox.

#### Scenario: Complete a task

- **WHEN** user clicks a task's checkbox
- **THEN** the task is marked complete, dimmed, and crossed out

#### Scenario: Uncomplete a task

- **WHEN** user clicks a completed task's checkbox
- **THEN** the task is marked incomplete again

### Requirement: User can delete a task

The system SHALL allow users to delete a task permanently.

#### Scenario: Delete a task

- **WHEN** user clicks the delete button on a task row
- **THEN** the task is removed from the store

### Requirement: User can reorder tasks

The system SHALL allow users to reorder tasks within a view by drag-and-drop.

#### Scenario: Reorder a task

- **WHEN** user drags a task to a new position in the list
- **THEN** the task's sortOrder is updated and the list re-renders in the new order

### Requirement: User can set pomodoro estimate

The system SHALL allow users to set or change a task's pomodoro estimate via a popup.

#### Scenario: Set estimate

- **WHEN** user clicks the pomodoro area on a task row
- **THEN** a popup appears with numbered buttons (0-8)
- **AND WHEN** user selects a number
- **THEN** the task's pomoEstimate is updated

### Requirement: User can reschedule a task

The system SHALL allow users to change a task's date via a date-picker popup.

#### Scenario: Open date picker

- **WHEN** user clicks the date action button on a task row
- **THEN** a popup appears with quick presets (Today, Tomorrow, Unscheduled) and a date input

#### Scenario: Reschedule with quick preset

- **WHEN** user clicks "Tomorrow" in the date picker
- **THEN** the task's date is set to tomorrow's date

#### Scenario: Reschedule with custom date

- **WHEN** user selects a date in the date input
- **THEN** the task's date is set to the selected date

### Requirement: Keyboard shortcuts for common actions

The system SHALL support keyboard shortcuts for the core loop.

#### Scenario: N focuses add-task

- **WHEN** user presses N
- **THEN** the add-task input is focused

#### Scenario: Escape closes popups

- **WHEN** a popup or settings drawer is open and user presses Escape
- **THEN** the popup/drawer closes and the edit is cancelled

### Requirement: User can focus on a task

The system SHALL allow users to bind the Pomodoro timer to a task by clicking its focus button. This resets the timer and, if the timer was running, auto-starts it on the new task.

#### Scenario: Focus on new task while idle

- **WHEN** user clicks the focus button on a task row and the timer is idle
- **THEN** the timer binds to that task, resets to full focus duration, and the row is highlighted

#### Scenario: Focus on new task while running

- **WHEN** user clicks the focus button on a different task row and the timer is running
- **THEN** the timer rebinds to the new task, resets to full focus duration, and auto-starts immediately

### Requirement: Task rows animate on enter, exit, and reorder

The system SHALL animate task rows when they are added, removed, or rearranged within a stable view, using the `motion` library's layout/FLIP system. View-switch transitions (e.g., Today → Tomorrow) SHALL NOT animate; within a stable view, all task mutations SHALL animate.

#### Scenario: Adding a task animates the row in

- **WHEN** user creates a task via the add-task input and presses Enter
- **THEN** the new row appears by fading in and sliding a small distance (≤ 8px) from its final position over a duration between 140ms and 200ms with a snappy ease-out curve

#### Scenario: Deleting a task animates the row out

- **WHEN** user clicks the delete button on a task row
- **THEN** the row fades out and slides upward by a small distance (≤ 8px) over a duration between 120ms and 180ms with an ease-in curve
- **AND** the rows below the deleted row glide upward to fill the gap

#### Scenario: Reordering a task via drag-and-drop snaps the result

- **WHEN** user drags a task to a new position in the list and releases
- **THEN** the dragged row lands in its new position instantly, with no slide or layout animation
- **AND** sibling rows that were displaced by the move likewise land instantly
- **AND** any subsequent re-render (e.g., a later store update from a delete) reverts to the smooth transition

#### Scenario: Rescheduling a task to a different section animates the cross-section move

- **WHEN** user changes a task's date such that it leaves one section of the current view (e.g., Overdue) and enters another (e.g., Today)
- **THEN** the row visually leaves the source section and arrives in the destination section rather than appearing in two places
- **AND** this behavior is achieved via a shared layout id keyed on the task's stable id

#### Scenario: Toggling a task complete animates the opacity change

- **WHEN** user clicks the complete checkbox on an uncompleted task
- **THEN** the row's opacity transitions smoothly from 1 to the dimmed completion value (0.52) over a duration between 120ms and 180ms
- **AND** uncompleting a task reverses the animation from 0.52 back to 1

#### Scenario: View switch is not animated

- **WHEN** user switches from one view to another (Today, Tomorrow, This Week, Backlog, Date)
- **THEN** the previous view's task list unmounts and the new view's task list mounts without any enter or exit animation
- **AND** this is the case even if a task was present in both views

#### Scenario: Reduced motion disables slide and layout animations

- **WHEN** the user's operating system reports `prefers-reduced-motion: reduce`
- **THEN** task rows still appear, disappear, and reorder, but the slide and FLIP/layout animations are disabled
- **AND** the opacity tween on toggle-complete MAY still play (or be collapsed to instant at the implementer's discretion)
- **AND** the system does not check the preference at the row level; the configuration is applied once at the task-list-area level

#### Scenario: First render of a rehydrated list does not animate

- **WHEN** the app loads with existing tasks in localStorage
- **THEN** the rendered list appears at its final layout instantly, with no enter animation playing on any row

#### Scenario: Empty list and adding the first task animates normally

- **WHEN** the task list is empty and the user adds a task
- **THEN** the new row animates in per the "Adding a task" scenario
- **AND** the empty-state placeholder is not shown during the animation (it has already been replaced by the new list with one row)
