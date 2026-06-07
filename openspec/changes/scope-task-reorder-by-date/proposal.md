## Why

`useTaskStore.reorderTasks` has two latent bugs that compound into the user-visible "DnD doesn't persist" symptom:

1. **The store action is destructive.** `TaskList` calls it with the **filtered subset** of tasks for the current view, but the store does `set({ tasks: subset })`, replacing the entire task array. Every task that isn't part of the visible subset (other dates, overdue, undated, the rest of the week) is silently deleted from the store and from localStorage on the next persistence flush.
2. **The `handleDragEnd` in `TaskList` never fires the action.** It bails on `source.id === target.id`, but in `@dnd-kit/react` v0.4 sortable items, `event.operation.source` and `event.operation.target` both reference the dragged sortable itself — they share the same `id` for every sortable drag. The guard short-circuits every drop, so `reorderTasks` was never actually called and the store was never mutated. The destructive set in (1) is therefore dormant in production but would have detonated the moment (2) was fixed.

The fix is to (a) scope reordering to a single date bucket in the store so it can never wipe other buckets, and (b) rewrite `handleDragEnd` to use the canonical dnd-kit v0.4 pattern (`isSortable` type guard + `source.initialIndex` / `source.index`) so drops actually trigger a reorder. `TaskList` also gains a `date` prop so it knows which bucket it's rendering, and dnd-kit's per-bucket `group` key keeps sortables isolated between sections in WeekView.

## What Changes

- **BREAKING** `useTaskStore.reorderTasks` signature changes from `(tasks: Task[]) => void` to `(date: string | null, taskIds: string[]) => void`. The action mutates `sortOrder` for tasks whose `id` is in `taskIds` **and** whose `date` matches the bucket key, and leaves every other task untouched.
- Ids passed to `reorderTasks` that do not belong to the bucket are ignored and emit a single `console.warn` (matching the style of `addTask`'s validation warning).
- `TaskList.handleDragEnd` is rewritten to use the dnd-kit v0.4 sortable pattern: it reads `source.initialIndex` and `source.index` via the `isSortable` type guard instead of comparing `source.id`/`target.id` (which are always equal for sortable drags and were causing every drop to no-op).
- `TaskList` gains a `date?: string | null` prop.
  - `string` or `null` → bucket key is defined; drag-and-drop is enabled; `useSortable` uses `group: \`tasks:${date ?? 'undated'}\`` so each bucket is an isolated sortable.
  - `undefined` (or absent) → drag-and-drop is not wired; the list renders as read-only rows.
- Multi-date `TaskList` callers (the Overdue section in DayView and WeekView) drop their drag-and-drop affordance. Week view sorting continues to work because WeekView already renders one `TaskList` per day.
- Regression test added for the data-loss bug: reordering one bucket must not delete tasks in any other bucket.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `task-management`: tighten the "User can reorder tasks" requirement to scope reorders to a single date bucket, change the `reorderTasks` API signature, define `TaskList`'s `date` prop and its DnD-on/off semantics, and update the focus-cascade scenario that references the old signature.

## Impact

- **Code**
  - `src/features/tasks/store.ts` — new `reorderTasks` signature and merge-not-replace implementation.
  - `src/features/tasks/components/TaskList.tsx` — new `date` prop, conditional `DragDropProvider`/`useSortable`, per-bucket `group` key.
  - `src/features/planner/components/DayView.tsx` — pass `date={today}` to the main list; omit `date` on the overdue list.
  - `src/features/planner/components/WeekView.tsx` — pass each section's `dateStr`; omit `date` on the overdue section.
  - `src/features/planner/components/DateBrowser.tsx` — pass `date={browseDate}`.
- **Tests**
  - `src/features/tasks/store.test.ts` — cross-date preservation, out-of-bucket ids no-op + warn, focus-cascade scenario updated to new signature.
- **Data / persistence** — no schema change; `Task.sortOrder` is unchanged and existing localStorage data needs no migration.
- **Dependencies** — none added or removed.
