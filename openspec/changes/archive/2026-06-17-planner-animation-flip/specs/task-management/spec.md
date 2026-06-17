## MODIFIED Requirements

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
- **THEN** the row visually travels from its source position to its destination position as a single continuous motion, with no observable gap where the row is absent from either section
- **AND** this continuous motion is scoped to a single view: switching the active view (Today → Tomorrow) does not bridge a task from the old view to the new view

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
