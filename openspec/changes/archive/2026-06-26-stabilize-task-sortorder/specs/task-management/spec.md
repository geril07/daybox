## ADDED Requirements

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

## MODIFIED Requirements

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
