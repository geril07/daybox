## ADDED Requirements

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
- **AND** the row animates out per the existing delete animation requirement

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

### Requirement: AddTaskRow submits on coarse pointers

The add-task row SHALL submit through a native form submit path instead of relying solely on an input `keydown` handler for `Enter`. The row SHALL render a coarse-pointer submit button titled `Add task`; the button SHALL be disabled when the trimmed task title is empty and SHALL create a task using the same parsing rules as keyboard submission when the title is non-empty.

When the group typeahead is open and a suggestion is highlighted, pressing Enter SHALL accept the highlighted suggestion and SHALL NOT submit the task. When no suggestion is highlighted, submitting the form SHALL create the task as before, including existing `#group` parsing and group creation behavior.

#### Scenario: Mobile submit button creates a task

- **WHEN** the user types a task title into AddTaskRow on a coarse-pointer device
- **AND** taps the `Add task` submit button
- **THEN** the task is created
- **AND** the input is cleared

#### Scenario: Native form submit creates a task

- **WHEN** the user types a task title into AddTaskRow
- **AND** the browser dispatches a form submit event for the row
- **THEN** the task is created using the existing title and `#group` parsing rules

#### Scenario: Highlighted group Enter does not submit

- **WHEN** the group typeahead is open with a highlighted suggestion
- **AND** the user presses Enter
- **THEN** the highlighted group is accepted into the input
- **AND** no task is created

## MODIFIED Requirements

### Requirement: User can reorder tasks

The system SHALL allow users to reorder tasks within a single date bucket by drag-and-drop, and SHALL NOT modify tasks outside that bucket as a side effect of a reorder.

A **date bucket** is identified by a `date: string | null` key — either a YYYY-MM-DD string or `null` for the undated bucket. The buckets correspond to the views that render a single date's tasks: `today`, `tomorrow`, `unscheduled`, the browsed date in `date` view, and each per-day section of `week` view. Multi-date lists (the Overdue section in any view, the week range as a whole) are not buckets.

`useTaskStore.reorderTasks` SHALL have the signature `(date: string | null, taskIds: string[]) => void` and SHALL:

- Update `sortOrder` for each task whose `id` appears in `taskIds` AND whose `date` equals the bucket key, assigning sortOrders `0..n-1` in the order ids appear in `taskIds`.
- Leave every other task (different `date`, or `id` not present in `taskIds`) untouched, including its `sortOrder` and object identity.
- Silently ignore any id in `taskIds` whose corresponding task does not exist in the bucket, and emit a single `console.warn` for the call when any ids are ignored.

`TaskList` SHALL accept a `date?: string | null` prop:

- When `date` is `string` or `null`, the list SHALL wire `DragDropProvider` and call each row's `useSortable` with `group: \`tasks:${date ?? 'undated'}\``. On drag end, the list SHALL call `useTaskStore.reorderTasks(date, reorderedIds)`.
- When `date` is `undefined` (or absent), the list SHALL render rows without `DragDropProvider` and without `useSortable`. Rows are read-only with respect to drag-and-drop.

Per-bucket `group` keys SHALL prevent dnd-kit from indicating valid drops across sections (e.g., a Monday row cannot show a drop indicator over the Tuesday list in `WeekView`).

The existing reorder animation behaviour — `flushSync` + `setSnapLayout(true)` + `requestAnimationFrame(() => setSnapLayout(false))` around the `reorderTasks` call — SHALL be preserved so that the dragged row lands without a layout animation.

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
- **THEN** `'t-today-1'` has its `sortOrder` updated to `0`
- **AND** `'t-tom-1'` is unchanged (its `date` and `sortOrder` remain)
- **AND** a single `console.warn` is emitted referencing the ignored id(s)

#### Scenario: Ids that do not exist in the store are ignored with a warning

- **WHEN** `useTaskStore.reorderTasks('<today>', ['t-today-1', 't-does-not-exist'])` is called
- **THEN** `'t-today-1'` has its `sortOrder` updated to `0`
- **AND** `useTaskStore.tasks` contains no task with id `'t-does-not-exist'`
- **AND** a single `console.warn` is emitted referencing the ignored id(s)

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
