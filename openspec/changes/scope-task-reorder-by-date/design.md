## Context

`useTaskStore.reorderTasks` was written assuming the caller would pass the entire task array. In practice, every caller goes through `TaskList`, which receives a date-filtered subset from `useFilteredTasks` / `useWeekSections` / `selectForDate`. The action's `set({ tasks: subset })` therefore overwrites the global store with whatever slice the user happened to be looking at, deleting every other task and persisting that loss to localStorage.

The destruction is silent: `addTask`'s sortOrder seeding (`state.tasks.filter(date matches).length`) recovers cleanly after a wipe, so the only forensic trace is "I used to have tasks for tomorrow and now I don't". Within a single-date view the user-visible order does persist correctly, which is why this presents as a confusing "sometimes things vanish, sort itself seems fine" symptom rather than an obvious sort-not-persisting bug.

The change scopes reordering to one bucket — a bucket being identified by a `date: string | null` key (a YYYY-MM-DD date or `null` for the undated bucket). Drag-and-drop continues to work in every place that already targets a single bucket (today, tomorrow, a browsed date, each per-day section of week view). The multi-date Overdue list loses DnD because the question "where in a date+sortOrder ordering does this dragged row belong" has no meaningful answer.

## Goals / Non-Goals

**Goals:**

- Make `reorderTasks` non-destructive: tasks outside the named bucket are never touched.
- Encode the bucket key explicitly in both the store API and the `TaskList` props so that the "what bucket am I reordering" question has exactly one answer.
- Prevent cross-section drags in WeekView at the dnd-kit layer, so the store guard is defence-in-depth rather than the only line of defence.
- Cover the bug with a regression test that would have caught it (cross-date preservation).

**Non-Goals:**

- Cross-date drag (rescheduling via drag-and-drop). The existing reschedule popup remains the only way to move a task to a different date.
- Any visual affordance signalling that a list is read-only. Overdue rows look identical; they simply can't be picked up.
- Reordering across groups, keyboard reordering, or any other DnD surface change.
- Changing `selectOverdue` / `selectInRange` ordering or `addTask`'s sortOrder seeding.
- Schema migration. `Task.sortOrder` is unchanged; existing persisted state continues to load.

## Decisions

### 1. Bucket key is `date: string | null`, not a generic `bucketKey: string`

Single-bucket views are exactly the views keyed by a date (today, tomorrow, a browsed date, a single day in week view) plus the undated view. The undated view fits cleanly as `date: null` — that's already the shape of `Task.date` and `selectUndated` filters on `date === null`.

A generic `bucketKey: string` would future-proof for hypothetical "bucket by group" or "bucket by priority" views, but those don't exist and the YAGNI cost (callers stringifying keys, store re-parsing them) doesn't pay off today. If a non-date bucket ever shows up, widening the type is a smaller change than carrying generic plumbing forever.

### 2. `TaskList.date` is tristate (`string | null | undefined`), not `date` + `draggable`

```
date: string      → bucket = that date; DnD on; group = "tasks:<date>"
date: null        → bucket = undated;  DnD on; group = "tasks:undated"
date: undefined   → no single bucket;  DnD off; no DragDropProvider
```

A separate `draggable` flag would let `draggable=true` coexist with `date=undefined`, which is a bug shape we'd then have to either runtime-assert or accept. One prop eliminates the disagreement.

The DnD-off path skips both `DragDropProvider` and `useSortable` so non-draggable rows pay no dnd-kit cost at all.

### 3. `useSortable.group` is per-bucket (`tasks:<date>`), not a single `tasks` group

dnd-kit treats every sortable sharing a `group` as one big sortable area. WeekView renders seven (or more) `TaskList`s for one week's worth of days; if they all live in group `tasks`, dnd-kit will happily indicate a valid drop from Monday onto Wednesday. Even if the store guard catches it, the visual feedback would lie.

Per-bucket group keys make dnd-kit reject cross-bucket drops natively (no drop indicator across sections). The store guard is then a safety net for programmatic misuse, not the primary mechanism.

### 4. Out-of-bucket ids are warned + ignored, not thrown

`addTask` already follows the warn-and-no-op pattern for invalid input (`console.warn`, return `null`). Throwing in `reorderTasks` would crash drag interactions whenever the bucket is briefly stale (e.g., a task was rescheduled by another action between render and drop). Warn-and-ignore degrades to a no-op for those ids and lets the rest of the reorder proceed.

The warning is intentionally chatty in development. There's no production telemetry to consume it, but a developer testing in the browser console will see exactly which ids didn't match.

### 5. Merge by `Map<id, sortOrder>`, not by reconstructing the array

```ts
reorderTasks: (date, taskIds) =>
  set((state) => {
    const inBucket = new Set(
      state.tasks.filter((t) => t.date === date).map((t) => t.id),
    )
    const valid = taskIds.filter((id) => inBucket.has(id))
    if (valid.length !== taskIds.length) {
      console.warn('[daybox] reorderTasks: ignored ids not in bucket', {
        date,
        ignored: taskIds.length - valid.length,
      })
    }
    const newOrder = new Map(valid.map((id, i) => [id, i]))
    return {
      tasks: state.tasks.map((t) =>
        newOrder.has(t.id) ? { ...t, sortOrder: newOrder.get(t.id)! } : t,
      ),
    }
  })
```

Preserves identity of every task object outside the bucket (zustand's referential-equality selectors won't re-trigger for unrelated subscribers). Within the bucket only the reordered subset's `sortOrder` is touched.

### 6. Call site in `TaskList` uses dnd-kit's `isSortable` type guard, not `source.id`/`target.id`

In `@dnd-kit/react` v0.4, for sortable drags `event.operation.source` and `event.operation.target` both reference the **dragged sortable itself** — they share the same `id` for every drop. Code that bails on `source.id === target.id` (the shape the previous implementation used) short-circuits every drag, so the store action is never called.

The canonical pattern from the dnd-kit docs is to narrow `source` with the `isSortable` type guard and read `source.initialIndex` / `source.index` for the move:

```ts
const handleDragEnd = (event: DragEndEvent) => {
  if (date === undefined) return
  if (event.canceled) return

  const { source } = event.operation
  if (!source || !isSortable(source)) return

  const { initialIndex, index } = source
  if (initialIndex === index) return
  if (initialIndex < 0 || index < 0) return
  if (initialIndex >= tasks.length || index >= tasks.length) return

  const reorderedIds = arrayMove(tasks, initialIndex, index).map((t) => t.id)
  flushSync(() => {
    setSnapLayout(true)
    reorderTasks(date, reorderedIds)
  })
  requestAnimationFrame(() => setSnapLayout(false))
}
```

`arrayMove` from `@dnd-kit/helpers` is retained — it splices `tasks` by index so we can extract the new id ordering. The animation snap behaviour (`setSnapLayout` + `flushSync` + `requestAnimationFrame`) is preserved unchanged so the existing "Reordering a task via drag-and-drop snaps the result" spec scenario continues to pass.

The bounds checks (`< 0`, `>= tasks.length`) are defensive in case dnd-kit ever surfaces an out-of-range index during a cancelled or interrupted drag; without them an out-of-range `arrayMove` would produce a nonsense order and then the store's bucket guard would warn-and-ignore. Failing fast at the call site is cleaner.

## Risks / Trade-offs

- **Risk:** Overdue rows look draggable (no visual change) but silently refuse drag. → **Mitigation:** Acceptable for this change; the cursor stays as the default and there's no drag handle hover state to trigger because `useSortable` isn't wired. If users hit this, a follow-up can add a non-interactive variant of the row, but it's out of scope here.
- **Risk:** A consumer importing `useTaskStore.reorderTasks` outside this codebase (there are none today, but TypeScript will catch any future ones) will break on the signature change. → **Mitigation:** `BREAKING` flagged in the proposal; the call site count is small (one); the typecheck step in CI catches misuse.
- **Risk:** Per-bucket `group` keys interact with `@dnd-kit/react` in ways we haven't tested across many lists. → **Mitigation:** The implementation step includes a manual verification in WeekView (drag within Monday works, drag from Monday → Tuesday is rejected with no drop indicator).
- **Trade-off:** The guard's `console.warn` adds chatter for any caller passing stale ids. Acceptable — matches existing `addTask` validation style and only fires on programmer error or genuinely racing UI state.
- **Trade-off:** Tristate `date` prop means TypeScript can't statically prove "DnD is wired iff date is defined". A reader of `TaskList` has to follow the conditional in the body. Considered acceptable for a ~120-line component; the alternative (two props that must agree) introduces a different correctness burden.
