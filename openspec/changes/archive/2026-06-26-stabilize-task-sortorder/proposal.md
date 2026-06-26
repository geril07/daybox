## Why

`sortOrder` is documented as a per-date-bucket rank, but the store has never enforced uniqueness within a bucket. Three code paths can create duplicate sortOrders inside a single date bucket: `addTask` using `.length` (collides after a deletion leaves a gap), `updateTask({ date })` carrying a stale sortOrder into the new bucket, and `reassignTasks` leaving moved tasks on their old ranks. The recent `ae3f53c` refactor of `reorderTasks` then made things worse: the new "redistribute surviving sortOrders" algorithm can permute a subset of duplicate values but cannot repair duplicates, and it silently leaves hidden tasks untouched — so a corrupted bucket stays corrupted until the next reload. Result: non-deterministic sort order, especially visible when the user switches a group filter on and off.

This change establishes a single invariant — `sortOrder` is **unique within a date bucket** — and makes it self-repairing rather than fragile, so future bugs in adjacent paths can't silently reintroduce the problem.

## What Changes

- **`addTask` computes sortOrder as `max(bucket.sortOrder) + 1`** instead of `bucket.length`, so a new task can never collide with a surviving task after a deletion left a gap. (Bug fix.)
- **`updateTask` rewrites sortOrder when a task's `date` changes**: the moved task is appended at `max(targetBucket.sortOrder) + 1` in its new date bucket. The source bucket is left with a gap (allowed under the uniqueness-only invariant). (Bug fix.)
- **`reorderTasks` runs a defensive compact before redistributing**: for the touched date bucket, it stable-sorts by existing sortOrder (with `id` as a deterministic tiebreaker) and reassigns `0..N-1`, then redistributes the subset's now-dense sortOrders to the reordered `taskIds`. Self-heals duplicate or gapped buckets on every drag.
- **`reassignTasks` compacts every affected date bucket after bulk group reassignment**, so a merge of groups that previously had same-date tasks with overlapping sortOrders does not leave a duplicate window open until the next drag. (Belt-and-suspenders; the defensive compact in `reorderTasks` would heal it on next drag anyway.)
- **Rehydrate migration compacts every date bucket on app load**: stable-sort by existing sortOrder (with `id` as tiebreaker), reassign `0..N-1` per bucket. Heals legacy/corrupted data in one pass. Defense-in-depth; the defensive compact in `reorderTasks` would heal buckets through normal use anyway.
- **`updateTask` does NOT renumber on `groupId`-only changes.** Under the per-date-bucket invariant, group is cosmetic for sort domain. A group reassignment moves the task in the view's filter but not in the sort domain; its existing sortOrder is preserved. (Confirmed choice, locks Option B.)
- **Removes the `debugger` statement** left in `reorderTasks` and the `console.log('ASD', ...)` left in `TaskList.handleDragEnd` from the refactor.

Non-goals (explicitly out of scope):

- No change to the read sites (`selectForDate`, `selectOverdue`, `selectInRange`, `selectUndated`, planner queries). They already sort by `sortOrder` after filtering by date; the invariant makes that deterministic without touching them.
- No schema bump to `Task` or `Group`. `sortOrder` stays `z.number()`.
- No change to `reorderTasks`'s signature `(date: string | null, taskIds: string[]) => void` as specified in `task-management`. The refactor's `({ taskIds })` shape is rolled back to match the spec.
- No change to DnD group key (`tasks:${date ?? 'undated'}`), to `TaskList` props, or to the `filterByGroup` cosmetic-filter behavior.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `task-management`: tighten the reorder requirement with the uniqueness invariant, the defensive compact, the `addTask` and `updateTask({ date })` sortOrder-computation rules, and the `reassignTasks` compaction. Roll back the `reorderTasks` signature to the spec'd `(date, taskIds)` form.
- `data-persistence`: add a rehydrate normalization requirement for the tasks store that compacts every date bucket on load, layered on top of the existing rehydrate-validate-and-reset policy.

## Impact

- `src/modules/tasks/store.ts` — `addTask`, `updateTask`, `reorderTasks` (signature + body), `reassignTasks`, debugger removal.
- `src/modules/tasks/components/TaskList.tsx` — `handleDragEnd` passes `date` back into `reorderTasks`; removes `console.log('ASD', ...)`.
- `src/shared/utils/persistence.ts` — no change to the helper itself; the tasks store's `afterValidate` hook (passed via `createValidatedRehydrate`) performs the bucket compaction. This is a new use of the already-supported `afterValidate` field.
- `src/modules/tasks/store.test.ts` — existing reorder tests assert against the old `({ taskIds })` signature and need updating to `(date, taskIds)`; new tests cover `addTask` after a deletion, `updateTask({ date })` renumbering, `reassignTasks` compaction, and the rehydrate migration.
- `src/modules/tasks/components/TaskList.sortable.test.tsx` — minor; the call site passes `date` again.
- No schema migrations on disk; the rehydrate compaction is an in-memory normalization on every load, not a versioned `daybox-tasks` blob rewrite. (The next successful store write will persist the normalized values as a side effect, but no explicit migration step is required.)
