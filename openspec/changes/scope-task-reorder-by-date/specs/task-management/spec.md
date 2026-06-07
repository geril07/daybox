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

#### Scenario: Drag-and-drop animation snaps the result

- **WHEN** the user drags a task to a new position in the list and releases
- **THEN** the dragged row lands in its new position instantly, with no slide or layout animation
- **AND** sibling rows that were displaced by the move likewise land instantly
- **AND** any subsequent re-render (e.g., a later store update from a delete) reverts to the smooth transition

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
