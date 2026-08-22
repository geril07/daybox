## Purpose

Create, edit, delete, reorder, and complete tasks. Each task has a title, group assignment, optional date, pomodoro estimate, and completion status.

## Requirements

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

### Requirement: TaskRow exposes Focus and Delete on coarse pointers

On a device whose primary pointer is coarse (touch), the task row SHALL render a `⋯` (more) button that opens a bottom-side sheet containing a header with the task's title and two action rows: `Focus this task` and `Delete`. On a device whose primary pointer is fine (mouse, trackpad, pen), the row SHALL NOT render the `⋯` button; the existing hover-revealed `Focus` and `Delete` icons SHALL continue to be the only path to those actions.

The sheet's `Focus this task` row SHALL call `useTimerStore.focusTask(task.id)` and then close the sheet. The sheet's `Delete` row SHALL call `useTaskStore.deleteTask(task.id)` and then close the sheet. Both rows SHALL be plain buttons; neither SHALL require a confirmation step. The sheet is the existing `Sheet` primitive at `shared/ui/sheet.tsx` with `side="bottom"`.

The `⋯` button itself SHALL carry `title="More actions"`. The sheet header SHALL be a non-interactive element displaying the task's title; it SHALL NOT be a button.

#### Scenario: Coarse-pointer row shows the kebab

- **WHEN** the user views any task list on a coarse-pointer device
- **THEN** each `TaskRow` renders a `⋯` button in the action area
- **AND** the existing hover-revealed `Focus` and `Delete` icons are not rendered

#### Scenario: Fine-pointer row does not show the kebab

- **WHEN** the user views any task list on a fine-pointer device
- **THEN** no `TaskRow` renders a `⋯` button
- **AND** the existing hover-revealed `Focus` and `Delete` icons are present and unchanged

#### Scenario: Kebab opens the bottom sheet

- **WHEN** the user taps the `⋯` button on a task row
- **THEN** a sheet appears at the bottom of the viewport
- **AND** the sheet's header displays the task's title
- **AND** the sheet contains exactly two action rows: `Focus this task` and `Delete`

#### Scenario: Sheet Focus row binds the timer

- **WHEN** the sheet is open on a task row and the user taps `Focus this task`
- **THEN** `useTimerStore.focusTask(task.id)` is called
- **AND** the sheet closes

#### Scenario: Sheet Delete row removes the task

- **WHEN** the sheet is open on a task row and the user taps `Delete`
- **THEN** `useTaskStore.deleteTask(task.id)` is called
- **AND** the sheet closes
- **AND** the row is removed from the list immediately with no animation

#### Scenario: Sheet dismisses on Escape

- **WHEN** the sheet is open and the user presses Escape
- **THEN** the sheet closes
- **AND** the task is not modified

### Requirement: TaskRow drag handle is visible on coarse pointers

On a device whose primary pointer is coarse, the `TaskRow` drag handle (the `⋮` glyph in a `GripVertical` icon) SHALL be permanently visible. On a fine-pointer device, the existing hover-revealed behavior SHALL be preserved: the handle is `opacity: 0` until the row receives a mouse-enter, at which point it transitions to `opacity: 1`.

The mechanism for distinguishing pointer types SHALL be the CSS media query `(pointer: coarse)` / `(pointer: fine)` via Tailwind v4's `pointer-coarse:` and `pointer-fine:` variants; no JavaScript media-query hook or React state SHALL be required to drive the visibility. The existing `useState(hovering)` / `onMouseEnter` / `onMouseLeave` logic that exists solely to toggle the handle's opacity SHALL be removed.

#### Scenario: Coarse-pointer row shows the drag handle at rest

- **WHEN** the user views a sortable task list on a coarse-pointer device
- **THEN** the `⋮` handle on every row is fully visible without any user interaction
- **AND** the row's appearance is identical at rest, after a tap, and after a scroll

#### Scenario: Fine-pointer row hides the handle until hover

- **WHEN** the user views a sortable task list on a fine-pointer device
- **THEN** the `⋮` handle is `opacity: 0` at rest
- **AND** the handle transitions to `opacity: 1` while the row is hovered
- **AND** the handle returns to `opacity: 0` when the row is no longer hovered

### Requirement: User can reorder tasks

The system SHALL allow users to reorder tasks within a single date bucket by drag-and-drop, and SHALL NOT modify tasks outside that bucket as a side effect of a reorder.

A **date bucket** is identified by a `date: string | null` key — either a YYYY-MM-DD string or `null` for the undated bucket. The buckets correspond to the views that render a single date's tasks: `today`, `tomorrow`, `unscheduled`, the browsed date in `date` view, and each per-day section of `week` view. Multi-date lists (the Overdue section in any view, the week range as a whole) are not buckets.

`useTaskStore.reorderTasks` SHALL have the signature `(date: string | null, taskIds: string[]) => void` and SHALL perform two phases inside a single atomic `set` call:

**Phase 1 — Defensive compact of the named bucket.** Collect every task in the store whose `date` equals the bucket key. Stable-sort those tasks by `(sortOrder, id)` and reassign `sortOrder = 0..N-1` in that order. This heals any duplicate or gapped sortOrders in the bucket before redistribution, so a corrupted bucket converges to a clean state through normal use.

**Phase 2 — Redistribute the subset's sortOrders.** From the compacted bucket, take the tasks whose `id` appears in `taskIds` (in the order they appear in `taskIds`), collect their now-unique sortOrders, sort those sortOrders ascending, and assign them positionally back to the `taskIds` in order. Tasks whose `id` is not in `taskIds` SHALL keep their compacted `sortOrder` untouched.

The action SHALL additionally:

- Silently ignore any id in `taskIds` whose corresponding task does not exist in the bucket (either the task does not exist at all, or its `date` differs from the bucket key), and emit a single `console.warn` for the call when any ids are ignored. Ignored ids do not participate in Phase 2's redistribution.
- Leave every task whose `date` differs from the bucket key completely untouched — no `sortOrder`, `groupId`, `date`, or object identity change.
- When `taskIds` contains zero valid ids for the bucket, skip Phase 2 (Phase 1's compaction still runs and heals the bucket).

`TaskList` SHALL accept a `date?: string | null` prop:

- When `date` is `string` or `null`, the list SHALL wire `DragDropProvider` and call each row's `useSortable` with `group: \`tasks:${date ?? 'undated'}\``. On drag end, the list SHALL call `useTaskStore.reorderTasks(date, reorderedIds)`.
- When `date` is `undefined` (or absent), the list SHALL render rows without `DragDropProvider` and without `useSortable`. Rows are read-only with respect to drag-and-drop.

Per-bucket `group` keys SHALL prevent dnd-kit from indicating valid drops across sections (e.g., a Monday row cannot show a drop indicator over the Tuesday list in `WeekView`).

On drag end, the reorder SHALL be applied immediately via store update. The dropped row and displaced sibling rows SHALL appear in their new positions instantly with no layout animation, snap mechanism, or motion library involvement.

On a coarse-pointer device, the `useSortable` instance SHALL be configured with a `PointerSensor` whose `activationConstraints` is a function returning `[PointerActivationConstraints.Delay(250, 5)]` when the triggering `PointerEvent` has `pointerType === 'touch'`, and `undefined` (default no-delay behavior) otherwise. The 250 ms press delay SHALL NOT apply to fine-pointer inputs; a mouse drag SHALL begin on the same frame as the mouse press, with no perceptible delay.

#### Scenario: Reorder within a single date bucket

- **WHEN** the user views Today with tasks `['t-1', 't-2', 't-3']` (in that order) and drags `'t-3'` to the top
- **THEN** `useTaskStore.reorderTasks('<today>', ['t-3', 't-1', 't-2'])` is called
- **AND** after the call, those three tasks have `sortOrder` `0`, `1`, `2` respectively
- **AND** the visible order in Today becomes `'t-3', 't-1', 't-2'`

#### Scenario: Reordering one bucket does not affect other buckets

- **WHEN** the store contains tasks for today (`'t-today-1'`, `'t-today-2'`) and for tomorrow (`'t-tom-1'`)
- **AND** the user reorders today's tasks by calling `useTaskStore.reorderTasks('<today>', ['t-today-2', 't-today-1'])`
- **THEN** `'t-tom-1'` is still present in `useTaskStore.tasks` with its original `date`, `groupId`, and `sortOrder` unchanged

#### Scenario: Ids not in the bucket are ignored with a warning

- **WHEN** `useTaskStore.reorderTasks('<today>', ['t-today-1', 't-tom-1'])` is called where `'t-tom-1'` has `date` set to tomorrow
- **THEN** `'t-today-1'` has its `sortOrder` updated as part of the redistribute phase
- **AND** `'t-tom-1'` is unchanged (its `date` and `sortOrder` remain)
- **AND** a single `console.warn` is emitted referencing the ignored id(s)

#### Scenario: Ids that do not exist in the store are ignored with a warning

- **WHEN** `useTaskStore.reorderTasks('<today>', ['t-today-1', 't-does-not-exist'])` is called
- **THEN** `'t-today-1'` has its `sortOrder` updated as part of the redistribute phase
- **AND** `useTaskStore.tasks` contains no task with id `'t-does-not-exist'`
- **AND** a single `console.warn` is emitted referencing the ignored id(s)

#### Scenario: Defensive compact heals a duplicate bucket before redistribute

- **WHEN** a bucket for `date: '2026-06-25'` contains tasks with sortOrders `[0, 1, 1, 3]` (a pre-existing duplicate at position 1)
- **AND** `reorderTasks('2026-06-25', <all four ids in their current visible order>)` is called
- **THEN** Phase 1 stable-sorts the bucket by `(sortOrder, id)`, reassigns `0..3`
- **AND** Phase 2 redistributes the subset's now-unique sortOrders in the requested order
- **AND** after the call, the bucket has no duplicate sortOrders

#### Scenario: Defensive compact heals the bucket even when taskIds is empty

- **WHEN** a bucket contains duplicate sortOrders
- **AND** `reorderTasks(date, [])` is called (zero valid ids for the bucket)
- **THEN** Phase 1 compacts the bucket to a dense `0..N-1` sequence
- **AND** Phase 2 is skipped (no ids to redistribute)
- **AND** the bucket's duplicates are healed

#### Scenario: Reorder survives a re-render via selectForDate

- **WHEN** the user reorders today's tasks from `['t-1', 't-2']` to `['t-2', 't-1']`
- **AND** the `TaskList` re-renders by reading `useTaskStore` and applying `selectForDate(tasks, '<today>')`
- **THEN** the rendered order is `'t-2', 't-1'`

#### Scenario: TaskList without a date prop does not wire drag-and-drop

- **WHEN** a `TaskList` is rendered without a `date` prop (e.g., the Overdue list in `DayView` or `WeekView`)
- **THEN** no `DragDropProvider` is mounted in the subtree
- **AND** task rows in that list are not registered with `useSortable`

#### Scenario: Per-bucket sortable group isolates WeekView sections

- **WHEN** `WeekView` renders one `TaskList` per day with each list passing its own `dateStr` as the `date` prop
- **THEN** each list's `useSortable` calls use distinct `group` keys of the form `tasks:<dateStr>`
- **AND** dnd-kit does not show a valid-drop indicator when a row from one day is dragged over another day's list

#### Scenario: Touch drag requires a 250 ms press

- **WHEN** the user touches the `⋮` handle on a sortable task row on a coarse-pointer device
- **AND** releases the touch within 250 ms without exceeding a 5 px movement tolerance
- **THEN** the drag is not initiated
- **AND** no `reorderTasks` call results from the gesture
- **AND** the row's list is unaffected (no snap, no animation)

#### Scenario: Touch drag after the press delay proceeds

- **WHEN** the user touches the `⋮` handle on a sortable task row on a coarse-pointer device
- **AND** continues pressing for at least 250 ms
- **THEN** the drag is initiated per dnd-kit's normal behavior
- **AND** on release over a different position, `useTaskStore.reorderTasks` is called with the resulting order

### Requirement: User can set pomodoro estimate

The system SHALL display a task's pomodoro progress as an `X/Y` text label (where `X` is `pomoCompleted` and `Y` is `pomoEstimate`) with a thin progress bar directly below the number whose width is proportional to `pomoCompleted / pomoEstimate`. The system SHALL allow the user to set or change `pomoEstimate` via a popup containing a `NumberInput` bounded to `[0, 99]`. `pomoEstimate` SHALL accept any finite number in that range, including non-integers (fractional pomodoros). The system SHALL NOT modify `pomoCompleted` as a side effect of changing `pomoEstimate`; the two fields are independent. Lowering `pomoEstimate` below `pomoCompleted` is allowed and leaves `pomoCompleted` unchanged.

#### Scenario: Display shows X/Y with a progress bar

- **WHEN** a task has `pomoEstimate = 5` and `pomoCompleted = 2`
- **THEN** the pomo trigger on the task row displays the text `2/5`
- **AND** a progress bar is rendered below the number whose width corresponds to `2/5`

#### Scenario: Display shows X/Y for an estimate above the legacy 9 cap

- **WHEN** a task has `pomoEstimate = 12` and `pomoCompleted = 7`
- **THEN** the pomo trigger on the task row displays the text `7/12`
- **AND** a progress bar is rendered below the number whose width corresponds to `7/12`

#### Scenario: Display shows X/Y for a fractional estimate

- **WHEN** a task has `pomoEstimate = 1.5` and `pomoCompleted = 1`
- **THEN** the pomo trigger on the task row displays text reflecting `1` and `1.5`
- **AND** a progress bar is rendered below the number whose width corresponds to `1/1.5`

#### Scenario: Open pomodoro editor

- **WHEN** user clicks the pomo trigger on a task row
- **THEN** a popup appears containing two `NumberInput`s: one labelled for `pomoEstimate` and one for `pomoCompleted`

#### Scenario: Increase estimate above completed

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user increases `pomoEstimate` to `5` via the editor
- **THEN** the task's `pomoEstimate` is updated to `5`
- **AND** `pomoCompleted` remains `1`

#### Scenario: Increase estimate above the legacy 9 cap

- **WHEN** a task has `pomoEstimate = 9`, `pomoCompleted = 4`, and the user increases `pomoEstimate` to `25` via the editor
- **THEN** the task's `pomoEstimate` is updated to `25`
- **AND** `pomoCompleted` remains `4`

#### Scenario: Set a fractional estimate

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user sets `pomoEstimate` to `2.5` via the editor
- **THEN** the task's `pomoEstimate` is updated to `2.5`
- **AND** `pomoCompleted` remains `1`

#### Scenario: Lower estimate does not change completed

- **WHEN** a task has `pomoEstimate = 5`, `pomoCompleted = 5`, and the user lowers `pomoEstimate` to `3` via the editor
- **THEN** the task's `pomoEstimate` is updated to `3`
- **AND** `pomoCompleted` remains `5` (unaffected)

#### Scenario: Lowering a high estimate below completed does not change completed

- **WHEN** a task has `pomoEstimate = 20`, `pomoCompleted = 14`, and the user lowers `pomoEstimate` to `10` via the editor
- **THEN** the task's `pomoEstimate` is updated to `10`
- **AND** `pomoCompleted` remains `14` (unaffected)

#### Scenario: Progress bar animates on estimate change

- **WHEN** `pomoCompleted` or `pomoEstimate` changes for a rendered task
- **THEN** the progress bar transitions to its new width smoothly via CSS

### Requirement: Task schema accepts fractional pomoEstimate

`TaskSchema` SHALL validate `pomoEstimate` as a finite number in `[0, 99]` without requiring an integer. Integer values SHALL remain valid. `pomoCompleted` SHALL remain an integer in `[0, 99]`. Persisted or imported task state that includes a fractional `pomoEstimate` within bounds SHALL pass schema validation and SHALL NOT trigger tasks-store rehydrate reset solely for that reason.

#### Scenario: Fractional estimate parses

- **WHEN** a task object with `pomoEstimate = 1.5` (and otherwise valid fields) is validated with `TaskSchema`
- **THEN** validation succeeds

#### Scenario: Integer estimate still parses

- **WHEN** a task object with `pomoEstimate = 3` (and otherwise valid fields) is validated with `TaskSchema`
- **THEN** validation succeeds

#### Scenario: Out-of-range fractional estimate is rejected

- **WHEN** a task object with `pomoEstimate = 99.5` is validated with `TaskSchema`
- **THEN** validation fails

#### Scenario: Rehydrate keeps tasks when estimate is fractional

- **WHEN** the app loads and `localStorage` `daybox-tasks` contains a valid task list where at least one task has `pomoEstimate = 2.5`
- **THEN** the task store rehydrates to that persisted list
- **AND** no rehydrate-reset warning is emitted for that blob

### Requirement: User can edit pomodoro completed count

The system SHALL allow the user to set or change `pomoCompleted` via the same popup that edits `pomoEstimate`, using a `NumberInput` bounded to `[0, 99]` — the global cap, NOT the task's current `pomoEstimate`. Increment and decrement controls SHALL be disabled at `0` and `99` respectively. Editing `pomoCompleted` SHALL NOT toggle `task.completed`. Setting `pomoCompleted` to a value above `pomoEstimate` is allowed and is the user's explicit choice.

#### Scenario: Increase completed below estimate

- **WHEN** a task has `pomoEstimate = 5`, `pomoCompleted = 2`, and the user increases `pomoCompleted` to `4` via the editor
- **THEN** the task's `pomoCompleted` is updated to `4`
- **AND** `task.completed` remains its prior value

#### Scenario: Increase completed above estimate

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user increases `pomoCompleted` to `7` via the editor
- **THEN** the task's `pomoCompleted` is updated to `7`
- **AND** `pomoEstimate` remains `3`

#### Scenario: Completed input caps at the global limit

- **WHEN** a task has `pomoCompleted = 99`
- **THEN** the `+` control on the `pomoCompleted` `NumberInput` is disabled

#### Scenario: Completed input floors at zero

- **WHEN** a task has `pomoCompleted = 0`
- **THEN** the `−` control on the `pomoCompleted` `NumberInput` is disabled

#### Scenario: Manually reaching estimate does not complete the task

- **WHEN** an incomplete task has `pomoEstimate = 5`, `pomoCompleted = 3`, and the user sets `pomoCompleted` to `5` via the editor
- **THEN** the task's `pomoCompleted` is updated to `5`
- **AND** `task.completed` remains `false`

#### Scenario: Clearing the input is a no-op

- **WHEN** the user clears the value of either `NumberInput` in the popover (selects all, deletes) and the field becomes empty
- **THEN** the corresponding task field is NOT updated in the store
- **AND** the prior valid value is preserved

### Requirement: User can reschedule a task

The system SHALL allow users to change a task's date via a date-picker popup. The Today and Tomorrow quick presets SHALL use the effective planner date and the following planner date derived from the configured day-start preference. A date selected through the explicit date input SHALL be used unchanged.

#### Scenario: Open date picker

- **WHEN** user clicks the date action button on a task row
- **THEN** a popup appears with quick presets (Today, Tomorrow, Unscheduled) and a date input

#### Scenario: Reschedule with quick preset Today before the boundary

- **WHEN** the local time is `02:00` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** user clicks "Today" in the date picker
- **THEN** the task's date is set to `2026-06-09`

#### Scenario: Reschedule with quick preset Tomorrow

- **WHEN** the effective planner date is `2026-06-09`
- **AND** user clicks "Tomorrow" in the date picker
- **THEN** the task's date is set to `2026-06-10`

#### Scenario: Reschedule with quick preset Today at the boundary

- **WHEN** the local time is `02:30` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** user clicks "Today" in the date picker
- **THEN** the task's date is set to `2026-06-10`

#### Scenario: Reschedule with custom date

- **WHEN** user selects `2026-07-01` in the date input
- **THEN** the task's date is set to `2026-07-01`

### Requirement: Contextual quick-add uses the effective planner date

When the app supplies a default date to the quick-add row for a current-day-relative view, the default SHALL be derived from the same effective planner date used by the planner queries. The user-created task SHALL keep that date unless the user explicitly reschedules it.

#### Scenario: Quick-add from Today before the boundary

- **WHEN** the local time is `02:00` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** the user adds a task from Today without choosing another date
- **THEN** the new task is dated `2026-06-09`

#### Scenario: Quick-add from Tomorrow before the boundary

- **WHEN** the effective planner date is `2026-06-09`
- **AND** the user adds a task from Tomorrow without choosing another date
- **THEN** the new task is dated `2026-06-10`

### Requirement: Keyboard shortcuts for common actions

The system SHALL support keyboard shortcuts for the core loop.

#### Scenario: N focuses add-task

- **WHEN** user presses N
- **THEN** the add-task input is focused

#### Scenario: Escape closes popups

- **WHEN** a popup or settings drawer is open and user presses Escape
- **THEN** the popup/drawer closes and the edit is cancelled

### Requirement: User can focus on a task

The system SHALL allow users to bind the Pomodoro timer to a task by clicking its focus button. The rebind SHALL only change `focusedTaskId`; it SHALL NOT reset the timer, alter its phase, or auto-start it. The timer keeps doing whatever it was doing — running, paused, on focus, or on a break — with the new task id as the binding target. Clicking the focus button on the already-focused task SHALL toggle `focusedTaskId` to `null` and SHALL NOT mutate any other timer state.

#### Scenario: Focus on new task while idle

- **WHEN** user clicks the focus button on a task row and the timer is idle
- **THEN** `focusedTaskId` is set to that task
- **AND** the row is highlighted
- **AND** the timer state (`phase`, `elapsed`, `startedAt`, `isRunning`) is unchanged

#### Scenario: Focus on new task while running

- **WHEN** user clicks the focus button on a different task row and the timer is running
- **THEN** `focusedTaskId` is set to the new task
- **AND** the timer state (`phase`, `elapsed`, `startedAt`, `isRunning`) is unchanged
- **AND** the timer's running clock is not reset to full focus duration
- **AND** the timer does not auto-start as a result of the click

### Requirement: Group suggestions appear as a popover anchored to the add-task input

When the user types a `#` character anywhere in the add-task input, the system SHALL display a floating popover anchored to the input element containing up to 5 group suggestions that start with the typed prefix (or the first 5 groups when the prefix is empty). The popover SHALL be a real floating layer (not an inline layout child of the form), SHALL be dismissed on `Escape`, outside click, or selection of a suggestion, and SHALL NOT steal focus from the add-task input at any point (on open, on suggestion click, on accept, on dismiss). When the typed prefix has no matches, the popover SHALL contain a single non-interactive row reading `Press Enter to create group "<query>"`.

#### Scenario: Suggestions popover does not appear without a trailing hash

- **WHEN** the add-task input value is `Write report` (no trailing `#` character)
- **THEN** the suggestions popover is not rendered
- **AND** the form's vertical footprint is the same as it is when no `#` has been typed

#### Scenario: Suggestions popover appears on a trailing hash

- **WHEN** the user types `#` in the add-task input
- **THEN** a popover appears below the input (anchored to the input element, left-aligned with the input's text column)
- **AND** the popover contains up to 5 group suggestions that start with the prefix (or the first 5 groups when the prefix is empty)
- **AND** the suggestions popover does not push surrounding rows down — it overlays them as a floating layer

#### Scenario: Suggestions popover filters by prefix

- **WHEN** the user types `#wo` and a group named `Work` exists
- **THEN** the suggestions popover contains `Work` (assuming it is the only group whose name starts with `wo`)
- **AND** groups whose names do not start with `wo` are not in the popover

#### Scenario: Opening the popover does not move focus from the input

- **WHEN** the add-task input has focus and the user types `#`
- **THEN** the suggestions popover appears
- **AND** focus remains on the add-task input (`document.activeElement` is the input)

#### Scenario: Tab does not enter the suggestions popover

- **WHEN** the add-task input has focus and the suggestions popover is open
- **THEN** pressing `Tab` moves focus to the next focusable element in the page (e.g. the `GroupChip` on the right when 2+ groups exist, or otherwise out of the row)
- **AND** focus does not enter any suggestion inside the popover

#### Scenario: ArrowDown highlights the next suggestion

- **WHEN** the suggestions popover is open and the user presses `ArrowDown`
- **THEN** the highlight moves to the next suggestion in the list (wrapping from the last back to the first)
- **AND** the previously highlighted suggestion loses its visual highlight
- **AND** the newly highlighted suggestion gains a visual highlight
- **AND** focus remains on the add-task input

#### Scenario: ArrowUp highlights the previous suggestion

- **WHEN** the suggestions popover is open and the user presses `ArrowUp`
- **THEN** the highlight moves to the previous suggestion in the list (wrapping from the first back to the last)
- **AND** the previously highlighted suggestion loses its visual highlight
- **AND** the newly highlighted suggestion gains a visual highlight
- **AND** focus remains on the add-task input

#### Scenario: Enter on a highlighted suggestion accepts it

- **WHEN** the suggestions popover is open with a suggestion highlighted and the user presses `Enter`
- **THEN** the input value is rewritten to replace the trailing `#<prefix>` with `#<highlighted-name> ` (note the trailing space)
- **AND** the suggestions popover closes
- **AND** the highlight is cleared
- **AND** focus returns to the add-task input
- **AND** the form does NOT submit (no task is created by the accept)

#### Scenario: Enter with no highlighted suggestion submits the form

- **WHEN** the suggestions popover is open with no suggestion highlighted (e.g. the user has not pressed `ArrowDown`/`ArrowUp` since the popover opened) and the user presses `Enter`
- **THEN** the form submits (a task is created, with the `#<prefix>` parsed per the existing `Create task with #group syntax` requirement)
- **AND** the suggestions popover closes

#### Scenario: Enter with the popover closed submits the form

- **WHEN** the suggestions popover is closed (no trailing `#` in the input) and the user presses `Enter`
- **THEN** the form submits (a task is created)

#### Scenario: Clicking a suggestion rewrites the input and closes the popover

- **WHEN** the suggestions popover is open and the user clicks a suggestion `Work`
- **THEN** the input value is rewritten to replace the trailing `#<prefix>` with `#Work ` (note the trailing space)
- **AND** the suggestions popover closes
- **AND** focus returns to the add-task input

#### Scenario: Press Enter to create group hint

- **WHEN** the user types `#newgroup` and no group named `newgroup` exists
- **THEN** the suggestions popover contains a single non-interactive row reading `Press Enter to create group "newgroup"`
- **AND** clicking the row does nothing (it is not a button)

#### Scenario: Escape dismisses the popover

- **WHEN** the suggestions popover is open and the user presses `Escape`
- **THEN** the popover closes
- **AND** the highlight is cleared
- **AND** focus remains on the add-task input (is not moved to or from any other element)
- **AND** the input value is preserved unchanged (the typed `#<prefix>` is NOT removed)

#### Scenario: Outside click dismisses the popover

- **WHEN** the suggestions popover is open and the user clicks outside both the input and the popover
- **THEN** the popover closes
- **AND** the highlight is cleared
- **AND** focus moves to the clicked element (or is left where it is, per platform convention)
- **AND** the input value is preserved unchanged

#### Scenario: Removing the trailing hash closes the popover

- **WHEN** the suggestions popover is open and the user backspaces the trailing `#` out of the input
- **THEN** the popover closes
- **AND** focus remains on the add-task input
- **AND** the input value reflects the deletion

#### Scenario: Popover is anchored to the input element

- **WHEN** the suggestions popover is open
- **THEN** the popover's position is computed relative to the input element (not relative to the form or the document)
- **AND** the popover is positioned below the input, left-aligned with the input's text column, with a small vertical offset

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

When a tasks-store action causes a task to **cease to exist** and that task is the currently focused task in the timer store, the action SHALL clear `useTimerStore.focusedTaskId` to `null` as part of the same store call. The cascade lives in the action body, not in any component, so the invariant holds regardless of caller (UI, import, test, migration).

The actions that trigger the cascade are:

- `deleteTask(id)` — cascade if `id === useTimerStore.focusedTaskId`
- `deleteTasksByGroupId(groupId)` — cascade if the focused task's `groupId` equals `groupId` _before_ the deletion

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

- **WHEN** `useTimerStore.focusedTaskId` is `'t-1'` and task `'t-1'` has `date` set to today
- **AND** `useTaskStore.reorderTasks('<today>', ['t-1', 't-2'])` is called
- **THEN** the tasks are reordered within the today bucket
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

### Requirement: sortOrder is unique within a date bucket

The system SHALL maintain the invariant that `Task.sortOrder` values are **unique within a date bucket**. A date bucket is identified by a `date: string | null` key — either a YYYY-MM-DD string or `null` for the undated bucket, matching the bucket definition in the "User can reorder tasks" requirement. Uniqueness SHALL hold after every store mutation. Density (contiguous `0..N-1`) is NOT required; gaps left by deletions or date moves are acceptable.

Every store action that writes `sortOrder` SHALL preserve this invariant. The invariant is self-repairing: `reorderTasks` SHALL compact a bucket before redistributing (see "User can reorder tasks"), `reassignTasks` SHALL compact affected buckets (see "Bulk group reassignment compacts affected buckets"), and rehydration SHALL compact every bucket on load (see the `data-persistence` capability).

#### Scenario: No two tasks in the same date bucket share a sortOrder

- **WHEN** the store is in any state reachable through the public action surface
- **THEN** for every `date` key (including `null`), the set of `sortOrder` values among tasks with `t.date === date` contains no duplicates

#### Scenario: Gaps are permitted after a deletion

- **WHEN** a bucket contains tasks with sortOrders `[0, 1, 2]` and the task with `sortOrder: 1` is deleted
- **THEN** the surviving bucket has sortOrders `[0, 2]`
- **AND** no store action automatically compacts the bucket as a side effect of the deletion

#### Scenario: Gaps are permitted after a date move

- **WHEN** a task with `sortOrder: 1` in a source bucket is moved to a different date via `updateTask`
- **THEN** the source bucket has a gap at position `1`
- **AND** the source bucket is NOT compacted as a side effect of the move

### Requirement: addTask computes sortOrder as max-plus-one within the date bucket

The `useTaskStore.addTask` action SHALL compute the new task's `sortOrder` as `max(existing sortOrders in the new task's date bucket) + 1`, or `0` if the bucket is empty. The date bucket is determined by the `date` argument: `date` is a YYYY-MM-DD string or `null` (the undated bucket). The bucket membership test is `t.date === (date !== undefined ? date : null)`.

The action SHALL NOT use `bucket.length` as the new sortOrder. `bucket.length` can collide with a surviving task's sortOrder when a prior deletion left a gap.

#### Scenario: First task in a new bucket gets sortOrder 0

- **WHEN** `addTask('Task', 'g1', '2026-06-25')` is called and no tasks exist with `date: '2026-06-25'`
- **THEN** the created task has `sortOrder: 0`

#### Scenario: Second task in a bucket gets sortOrder 1

- **WHEN** a bucket for date `'2026-06-25'` contains one task with `sortOrder: 0`
- **AND** `addTask('Task', 'g1', '2026-06-25')` is called
- **THEN** the created task has `sortOrder: 1`

#### Scenario: Task added after a deletion does not collide with the surviving higher sortOrder

- **WHEN** a bucket for date `'2026-06-25'` contains tasks with sortOrders `[0, 2]` (a gap at `1` from a prior deletion)
- **AND** `addTask('Task', 'g1', '2026-06-25')` is called
- **THEN** the created task has `sortOrder: 3`
- **AND** the bucket now has sortOrders `[0, 2, 3]` with no duplicates

#### Scenario: Undated bucket uses the same rule

- **WHEN** a bucket for `date: null` contains tasks with sortOrders `[0, 1, 4]`
- **AND** `addTask('Task', 'g1', null)` is called
- **THEN** the created task has `sortOrder: 5`

### Requirement: updateTask rewrites sortOrder when a task's date changes

The `useTaskStore.updateTask` action SHALL detect when an update changes a task's `date` (`updates.date !== undefined && updates.date !== existingTask.date`). When the date changes, the action SHALL set the moved task's `sortOrder` to `max(existing sortOrders in the target date bucket) + 1`, or `0` if the target bucket is empty. The source date bucket SHALL NOT be compacted as a side effect of the move; the gap left by the moved task is acceptable under the uniqueness-only invariant.

When the update does NOT change `date` — including updates that change only `groupId`, `title`, `pomoEstimate`, `pomoCompleted`, or `completed` — the action SHALL NOT modify `sortOrder`. Group is cosmetic for the sort domain; a `groupId` change is not a sort-domain event.

When the update contains BOTH `date` and `groupId`, the date-change rule applies and the `groupId` update is applied alongside the renumber.

#### Scenario: Moving a task to an empty bucket gives it sortOrder 0

- **WHEN** a task has `date: '2026-06-25'` and `sortOrder: 1`
- **AND** no tasks exist with `date: '2026-06-30'`
- **AND** `updateTask(task.id, { date: '2026-06-30' })` is called
- **THEN** the task has `date: '2026-06-30'` and `sortOrder: 0`

#### Scenario: Moving a task to a non-empty bucket appends at the end

- **WHEN** a task has `date: '2026-06-25'` and `sortOrder: 0`
- **AND** the bucket for `date: '2026-06-30'` contains tasks with sortOrders `[0, 1, 3]`
- **AND** `updateTask(task.id, { date: '2026-06-30' })` is called
- **THEN** the task has `date: '2026-06-30'` and `sortOrder: 4`
- **AND** the target bucket now has sortOrders `[0, 1, 3, 4]` with no duplicates

#### Scenario: The source bucket is left with a gap

- **WHEN** a task with `date: '2026-06-25'` and `sortOrder: 1` is moved away
- **AND** the source bucket contained sortOrders `[0, 1, 2]`
- **THEN** the source bucket now contains sortOrders `[0, 2]`
- **AND** no compaction runs on the source bucket

#### Scenario: Group-only change does not modify sortOrder

- **WHEN** a task has `date: '2026-06-25'`, `groupId: 'work'`, and `sortOrder: 2`
- **AND** `updateTask(task.id, { groupId: 'home' })` is called
- **THEN** the task has `groupId: 'home'` and `sortOrder: 2` unchanged
- **AND** the task's `date` is unchanged

#### Scenario: Date and groupId changed in the same call applies the date rule

- **WHEN** a task has `date: '2026-06-25'`, `groupId: 'work'`, and `sortOrder: 1`
- **AND** the bucket for `date: '2026-06-30'` contains tasks with sortOrders `[0, 1]`
- **AND** `updateTask(task.id, { date: '2026-06-30', groupId: 'home' })` is called
- **THEN** the task has `date: '2026-06-30'`, `groupId: 'home'`, and `sortOrder: 2`

#### Scenario: Title-only change does not modify sortOrder

- **WHEN** a task has `sortOrder: 2`
- **AND** `updateTask(task.id, { title: 'New title' })` is called
- **THEN** the task has `title: 'New title'` and `sortOrder: 2` unchanged

### Requirement: Bulk group reassignment compacts affected buckets

The `useTaskStore.reassignTasks(fromGroupId, toGroupId)` action SHALL, after rewriting `groupId` on all matching tasks, run a per-bucket compaction on every date bucket that contains at least one moved task. Compaction for a bucket SHALL stable-sort the bucket's tasks by `(sortOrder, id)` and reassign `0..N-1` in that order.

This prevents a group merge from leaving duplicate sortOrders in a bucket when two tasks from different source groups happened to share the same sortOrder on the same date.

Buckets that contain no moved tasks SHALL NOT be compacted.

#### Scenario: Affected buckets are compacted after a group merge

- **WHEN** the store contains tasks `A` and `B` both with `date: '2026-06-25'` and `sortOrder: 0`, where `A.groupId === 'work'` and `B.groupId === 'home'`
- **AND** `reassignTasks('work', 'home')` is called
- **THEN** after the call, both `A` and `B` have `groupId: 'home'`
- **AND** the bucket for `date: '2026-06-25'` has no duplicate sortOrders
- **AND** the bucket's sortOrders are a dense `0..N-1` sequence

#### Scenario: Unaffected buckets are not touched

- **WHEN** the store contains tasks for `date: '2026-06-30'` with sortOrders `[0, 1, 1]` (a pre-existing duplicate)
- **AND** none of those tasks have `groupId` matching `fromGroupId`
- **AND** `reassignTasks('work', 'home')` is called
- **THEN** the bucket for `date: '2026-06-30'` still has sortOrders `[0, 1, 1]` (unchanged)
- **AND** only buckets containing moved tasks were compacted

### Requirement: Task titles auto-detect URLs and render them as clickable external links

The system SHALL render a task's title in the UI by passing the title string through a
linkification step. Any substring matching an `http://` or `https://` URL SHALL be
rendered as an anchor element (`<a>`) with `target="_blank"`, `rel="noopener
noreferrer"`, and visible underline styling. The non-URL portions of the title SHALL
render as plain text. URLs whose scheme is `javascript:`, `data:`, `vbscript:`, or
`file:` SHALL render as plain text (no anchor).

A URL candidate is a substring beginning with `http://` or `https://` and continuing
to the first whitespace or HTML-significant character. The string SHALL be validated
by passing it through the `URL` constructor; if construction throws, the candidate
SHALL render as plain text. Trailing punctuation characters (`.`, `,`, `;`, `:`, `!`,
`?`) and unbalanced trailing closing parentheses SHALL be stripped from the link's
display and `href` before rendering.

This requirement applies to every UI surface that displays a task's title text: the
planner list (`TaskRow`), the mobile action sheet header (`TaskActionSheet`), and the
timer bar's focused-task display (`TimerBar`). The `TaskRow` edit mode (an `<input>`
element) is NOT subject to this requirement — text-entry fields render plain text.

#### Scenario: A URL in a title renders as a clickable external link

- **WHEN** a task with title `Review https://github.com/owner/repo/pull/123` is
  displayed in the planner list
- **THEN** the rendered title contains exactly one anchor element
- **AND** the anchor's `href` is `https://github.com/owner/repo/pull/123`
- **AND** the anchor's `target` is `_blank`
- **AND** the anchor's `rel` is `noopener noreferrer`
- **AND** the surrounding text `Review ` and any text after the URL renders as a
  plain text run, not as an anchor

#### Scenario: A title with no URL renders as plain text

- **WHEN** a task with title `Write quarterly report` is displayed
- **THEN** the rendered title contains zero anchor elements
- **AND** the entire title renders as a plain text run

#### Scenario: A `javascript:` URL renders as plain text

- **WHEN** a task with title `click javascript:alert(1) now` is displayed
- **THEN** the rendered title contains zero anchor elements
- **AND** the entire title `click javascript:alert(1) now` renders as a plain text
  run

#### Scenario: A `data:` URL renders as plain text

- **WHEN** a task with title `download data:text/html,<script>...</script>` is
  displayed
- **THEN** the rendered title contains zero anchor elements
- **AND** the entire title renders as a plain text run

#### Scenario: Trailing punctuation is excluded from the link

- **WHEN** a task with title `See https://example.com.` is displayed
- **THEN** the rendered title contains exactly one anchor element
- **AND** the anchor's `href` is `https://example.com` (no trailing `.`)
- **AND** the visible link text is `https://example.com`
- **AND** the trailing `.` is rendered as a plain text run after the anchor

#### Scenario: Balanced parens inside a URL are kept; unbalanced trailing parens are not

- **WHEN** a task with title `(see https://en.wikipedia.org/wiki/Foo_(bar))` is
  displayed
- **THEN** the rendered title contains exactly one anchor element
- **AND** the anchor's `href` is `https://en.wikipedia.org/wiki/Foo_(bar)`
- **AND** the visible link text is `https://en.wikipedia.org/wiki/Foo_(bar)`
- **AND** the leading `(` and trailing `)` are rendered as plain text runs

#### Scenario: A click on a link inside a task row does not start inline title editing

- **WHEN** a task row is rendered with a link in the title
- **AND** the user clicks the link
- **THEN** the browser opens the link in a new tab
- **AND** the task row's inline edit mode is NOT activated
