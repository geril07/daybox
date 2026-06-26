## Context

`Task.sortOrder` is a single integer per task, persisted in the `daybox-tasks` localStorage key. It is used as a per-date-bucket rank: every read site (`selectForDate`, `selectOverdue`, `selectInRange`, `selectUndated`, and the planner's week/later section sorts) filters by `date` first and then sorts by `sortOrder` ascending. The comparator `(a, b) => a.sortOrder - b.sortOrder` is only deterministic when sortOrders are **unique within the filtered bucket**. The store has never enforced that uniqueness, and three write paths can violate it.

Recent history: commit `ae3f53c` ("refactor: reorderTasks simplify to taskIds only") removed the `date` and `groupId` parameters from `reorderTasks` and switched the algorithm from "assign dense `0..N-1` to the bucket" to "permute the surviving subset's existing sortOrders among themselves." That patch was trying to stop `reorderTasks` from disturbing tasks outside `taskIds`, but it had two side effects:

1. The signature moved off the `task-management` spec, which still says `(date: string | null, taskIds: string[]) => void`.
2. The new algorithm can't repair duplicates — it reuses the (possibly colliding) values it was handed.

This change re-aligns the code with the spec, adds the missing uniqueness invariant, and makes it self-repairing via a defensive compact in `reorderTasks` plus a one-pass rehydrate normalization.

## Goals / Non-Goals

**Goals:**

- Establish one invariant: `sortOrder` is unique within a date bucket. Density is a nice-to-have, not required (gaps after a move or delete are acceptable; the comparator doesn't care).
- Make the invariant self-repairing: a corrupted bucket converges to a clean state through either (a) any drag in that bucket, or (b) the next app reload. No single point of failure.
- Close the three known duplicate-creation vectors: `addTask` after a gap, `updateTask({ date })` carrying a stale rank, and `reassignTasks` after a group merge.
- Bring `reorderTasks` back on-spec for its signature and bucket-scoped behavior.

**Non-Goals:**

- Per-`(date, group)` slice semantics (Option A). We explicitly keep group as cosmetic for the sort domain. Unfiltered views stay flat/interleaved, not group-clustered.
- A schema bump to `Task` or `Group`. `sortOrder` stays `z.number()`.
- Touching read sites. They are already correct under the invariant.
- Touching DnD group keys, `TaskList` props, or `filterByGroup` behavior.
- Persisting a "migration version" for `daybox-tasks`. The rehydrate compaction runs on every load as an in-memory normalization (via `afterValidate`), not as a versioned on-disk migration. The next ordinary store write persists the normalized values as a side effect.

## Decisions

### D1 — Per-date-bucket invariant, not per-(date, group) slice

**Choice:** `sortOrder` is unique within a date bucket (or within the undated bucket). Group is cosmetic for sort domain.

**Rationale:**

- Every read site already filters by `date` before sorting. Adopting per-(date, group) would require a comparator change at every read site (`(groupOrder, sortOrder)`) and a group ordering source, plus a schema bump to add `Group.sortOrder`. That's a much larger change.
- The unfiltered view stays flat/interleaved (familiar), which the user confirmed they want. Per-(date, group) would force group-clustered unfiltered views.
- The existing `reorderTasks` "redistribute surviving sortOrders" trick is already the correct algorithm for per-bucket semantics, once the invariant holds.

**Alternatives considered:**

- **Option A (per-(date, group) slice).** Rejected by the user: forces group-clustered unfiltered views and a group schema bump.
- **Per-bucket density, not just uniqueness.** Rejected: density forces compaction on every `deleteTask` and on every `updateTask({ date })` source bucket. Uniqueness-only permits gaps, which the comparator doesn't care about. Fewer write sites, smaller change.

### D2 — `addTask` uses `max(bucket.sortOrder) + 1`, not `.length`

**Choice:** For the new task's `(date || null)` bucket, compute `sortOrder = max(existing sortOrders in bucket) + 1`, or `0` if the bucket is empty.

**Rationale:** `.length` collides after a deletion leaves a gap. Example: bucket `[W1:0, W3:2]` (gap at 1 after `deleteTask(W2)`), then `addTask` with `.length = 2` collides with `W3`. `max + 1 = 3` is always unique.

**Alternatives considered:**

- **Compact the bucket on every `deleteTask`, then use `.length`.** Rejected: more write sites, more churn. Uniqueness-only lets gaps persist; density is not required.

### D3 — `updateTask` rewrites sortOrder only when `date` changes, not on `groupId`-only changes

**Choice:** Inside `updateTask(id, updates)`, detect `updates.date !== undefined && updates.date !== existingTask.date`. If so, the moved task's new `sortOrder = max(targetBucket.sortOrder) + 1` (or `0` if empty target). Source bucket is left untouched (a gap is fine). If `updates.date` is undefined or equals the existing date, `sortOrder` is never modified by `updateTask` — even if `groupId` changes.

**Rationale:**

- Carrying a stale sortOrder into the new bucket is one of the three duplicate vectors. Pinning the moved task to the end of its new bucket closes it.
- Group-only changes do not change the sort domain under D1, so renumbering on them would be Option-A thinking. A user who reassigns a task from `work` to `home` will see it stay at its existing position in the flat order; if a duplicate exists in the new group's slice (it can't, by invariant, but defensively), the next drag in that bucket heals it.

**Edge case:** when `updates` contains BOTH `date` and `groupId`, the date branch wins and `groupId` is applied alongside the renumber. There is no scenario where `groupId` alone should trigger a renumber.

**Alternatives considered:**

- **Renumber on group change too.** Rejected: drifts toward Option A.
- **Compact the source bucket after a move.** Rejected: gaps are allowed; compaction is extra churn for no correctness benefit.

### D4 — `reorderTasks` defensive compact + redistribute

**Choice:** `reorderTasks(date, taskIds)` runs two phases:

1. **Defensive compact** of the entire bucket identified by `date`: collect all tasks with `t.date === date`, stable-sort by `(sortOrder, id)`, reassign `0..N-1` in that order. This heals duplicates and gaps in the bucket before any redistribution.
2. **Redistribute** the subset's now-dense sortOrders to the reordered `taskIds`: take `survivingSortOrders = [0, 1, …, subset.length - 1]` (after compact, the subset's sortOrders are a contiguous prefix of `0..N-1` IF the subset is a prefix of the bucket — but in general it's the subset's _own_ sortOrders, now dense and unique, sorted ascending), and assign them in order to `taskIds`.

Phase 2's algorithm is unchanged from `ae3f53c` in spirit — it permutes the subset's own sortOrders among themselves — but it now operates on a guaranteed-unique, dense input thanks to phase 1. Tasks outside `taskIds` keep their (now-compacted) sortOrders untouched.

**Rationale:** Two layers of defense:

- If a future bug or a partial write reintroduces duplicates, the very next drag in that bucket heals it. The invariant is self-repairing through normal use, not fragile.
- The rehydrate migration (D6) is the other layer; either alone is sufficient, both together is belt-and-suspenders.

**Alternatives considered:**

- **Trust the invariant, no compact.** Rejected by the user ("defensive compact"). The compact is cheap (O(N log N) per bucket per drag) and makes the invariant self-healing rather than single-point-of-failure.

### D5 — `reassignTasks` compacts every affected date bucket

**Choice:** After `reassignTasks(fromGroupId, toGroupId)` rewrites `groupId` on the moved tasks, run the same defensive compact as D4 on every date bucket that contains at least one moved task.

**Rationale:** A group merge can bring two tasks with the same `sortOrder` on the same date into the same bucket (they were in different groups before, so the duplicate was invisible). Without compaction, the duplicate persists until the next drag in that bucket or the next reload. Compacting here closes the window immediately.

This is the one place where we pay for belt-and-suspenders: `reassignTasks` grows from a one-liner to a per-bucket compaction. It's still cheap — `reassignTasks` is rare (group rename/merge) and the per-bucket sort is small.

**Alternatives considered:**

- **Don't compact; rely on D4 + D6 to heal later.** Rejected: leaves a visible-but-rare duplicate window. The cost of compaction here is small enough to justify closing the window.

### D6 — Rehydrate compaction via `afterValidate`

**Choice:** The tasks store's `createValidatedRehydrate` call passes an `afterValidate(state)` hook that runs the same per-bucket compact as D4 over every date bucket (including the undated bucket, keyed by `null`).

**Rationale:**

- Existing users with corrupted data from the pre-fix bugs get healed on next load, no explicit "migration" UX required.
- The `afterValidate` field already exists on `ValidatedRehydrateOptions` (`persistence.ts:15`) and fires only after successful schema validation (`persistence.ts:39`), so the compact never runs on a blob that's about to be reset to defaults.
- This is defense-in-depth, not a single point of failure: D4 heals buckets through normal use even if D6 never runs (e.g., a corruption introduced after load).

**Alternatives considered:**

- **A versioned on-disk migration (`TaskV2Schema`).** Rejected: would require a version bump, a migration pipeline, and a persisted marker. The `afterValidate` hook achieves the same repair without any on-disk schema change. The next ordinary store write persists the normalized values as a side effect; no explicit "migration complete" flag is needed because the invariant is structural, not versioned.

### D7 — `reorderTasks` signature rolled back to `(date, taskIds)`

**Choice:** Revert the `ae3f53c` signature change. `reorderTasks` takes `{ date: string | null, taskIds: string[] }` (or `(date: string | null, taskIds: string[])` — the spec uses the positional form; the implementation may keep the destructured-object form as long as the field set matches). The bucket `date` is required.

**Rationale:** The `ae3f53c` refactor dropped `date` on the grounds that the surviving-sortOrders algorithm didn't need it — but with D4's defensive compact, the function must know which bucket to compact, so `date` is load-bearing again. And the `task-management` spec never stopped requiring it; the refactor moved the code off-spec.

`TaskList.handleDragEnd` already has `date` in scope (`TaskList.tsx:30, 38, 41`); passing it back through is trivial.

**Alternatives considered:**

- **Keep `({ taskIds })` and infer the bucket from the first task's `date`.** Rejected: brittle if `taskIds` is empty or contains only unknown ids (the warn-and-skip path). The caller always knows the bucket; passing it explicitly is clearer and matches the spec.

## Risks / Trade-offs

- **[Risk] `reassignTasks` becomes O(buckets × log(bucket)) instead of O(tasks).** → Mitigation: `reassignTasks` is rare (group rename/merge) and buckets are small (local-first SPA, hundreds of tasks at most). The cost is negligible in practice.
- **[Risk] The rehydrate compaction runs on every load, even when the data is already clean.** → Mitigation: for an already-clean bucket, stable-sort by `(sortOrder, id)` and reassigning `0..N-1` is a no-op in terms of observable values (the comparator doesn't care which integer is assigned, only that they're unique and ordered). The CPU cost is O(N log N) per bucket per load — trivial for the data sizes involved. We do NOT short-circuit on "already clean" because checking for cleanliness is itself O(N) and adds a code path to maintain; the unconditional compact is simpler and self-healing.
- **[Risk] The rehydrate compaction changes existing users' visible sortOrders on next load.** → Mitigation: this is the intended behavior — it heals duplicates and gaps. A user whose bucket was `[0, 1, 1, 3]` will see it become `[0, 1, 2, 3]` (stable: the two tasks that shared `1` keep their relative order from the stable sort, with `id` as tiebreaker). The visible order in the UI does not change for tasks that were already uniquely ordered; only colliding tasks get a deterministic tiebreak. This is strictly better than the pre-fix non-determinism.
- **[Risk] `updateTask({ date })` pins moved tasks to the end of the new bucket, not at a "natural" position.** → Mitigation: this is the simplest correct behavior under the uniqueness-only invariant. A "smart" insertion position (e.g., based on date proximity) is Option-A-flavored complexity and was explicitly out of scope. Users can drag to rearrange after the move; the defensive compact makes that drag reliably heal the bucket.
- **[Trade-off] `reorderTasks` is no longer a single `set(...)` — it's compact-then-redistribute inside one `set`.** → Mitigation: both phases are inside the same `set` callback, so it remains a single atomic store update from React's perspective. No intermediate render can observe a half-compacted state.

## Migration Plan

No user-visible migration step. The deployment is purely code:

1. Ship the four store changes (`addTask`, `updateTask`, `reorderTasks`, `reassignTasks`), the `TaskList.handleDragEnd` call-site update, and the rehydrate `afterValidate` hook.
2. On next app load, D6 heals any legacy duplicates in memory. The next ordinary store write (any task mutation) persists the normalized values.
3. No on-disk schema version bump. No "migration complete" flag. No rollback path needed — the normalization is idempotent and runs on every load.

Rollback (if a bug is found in the new code): revert the commit. The rehydrate compaction simply stops running; existing data is still valid against `TaskV1Schema` (the schema never changed). Any duplicates that the compaction had healed will resurface until the bug is fixed and the new code re-deployed. No data loss.

## Open Questions

None outstanding. All seven use cases from exploration are resolved:

- UC1 (filtered drag) → D4 compact + redistribute, subset's own sortOrders, hidden tasks as inert anchors.
- UC2 (unfiltered drag) → D4 compact + redistribute over the whole bucket.
- UC3 (date change via picker) → D3 renumber on date change, append at end of target.
- UC4 (group-only change) → D3 no renumber; group is cosmetic.
- UC5 (bulk `reassignTasks`) → D5 compact affected buckets.
- UC6 (`addTask` after a deletion) → D2 `max + 1`.
- UC7 (legacy data on load) → D6 rehydrate compaction.
