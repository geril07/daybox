## Context

`GroupSettingsPanel.handleResolveAndDelete` predates (or grew alongside) the bulk task-store helpers and reaches into the store with per-id `updateTask` / `deleteTask` loops. The bulk helpers `reassignTasks(from, to)` and `deleteTasksByGroupId(groupId)` already exist (`src/features/tasks/store.ts:114-142`) and are the right tool for group-scoped operations.

The `task-management` spec at `openspec/specs/task-management/spec.md:378-409` defines a "focused-task cascade" requirement that clears `useTimerStore.focusedTaskId` when destructive task actions remove or **reassign** the focused task. Including `reassignTasks` in that cascade is on reflection a category error: the cascade exists to prevent the timer from pointing at a non-existent task, and a reassignment doesn't make a task non-existent. The current rule also makes the invariant path-dependent — `updateTask(id, { groupId: x })` keeps focus, but `reassignTasks(from, to)` (the bulk equivalent) clears it. Same end state, different focus outcome.

## Goals / Non-Goals

**Goals:**

- Use the bulk helpers in `handleResolveAndDelete`.
- Narrow the focused-task cascade to fire only when a task **ceases to exist**.
- Make the user-visible promise explicit at the `group-management` boundary: "deleting a group never leaves the timer focused on a vanished task; moving tasks during deletion preserves focus."
- Keep the change surgical: spec deltas + one store edit + one component edit + test inversions.

**Non-Goals:**

- Any UX change to the group-delete flow (already shipped in `refine-group-delete-flow`).
- Adding undo for group operations.
- Changing the cascade behavior for `deleteTask` or `deleteTasksByGroupId` — those still fire because the task genuinely vanishes.
- Reconsidering whether `updateTask` should ever trigger a cascade (it currently does not, and that stays).
- Changing `focusTask`'s own toggle semantics or any timer-store cascades unrelated to task lifecycle.

## Decisions

### Decision 1: Drop `reassignTasks` from the focused-task cascade

The cascade's stated purpose in `task-management` is preventing dangling focus references. A task that has been reassigned to a different group still exists with the same `id` — the focus reference is not dangling. Including reassignment in the cascade was a defensive over-reach.

**Why now:** the in-flight refactor surfaced the path-dependence (per-id loop vs. bulk call producing different focus outcomes for the same end state). Fixing the cascade rule now means the bulk-helper swap doesn't quietly change user-visible focus behavior on group-delete-with-move.

**Alternatives considered:**

- _Keep the cascade as-is and document the path-dependence._ Rejected: invariants that depend on the caller's choice of helper are exactly the kind of bug we just spent a change burying.
- _Extend the cascade to `updateTask`._ Rejected: the cascade should narrow, not widen. Reassigning is a benign relocation, not a destructive action.

### Decision 2: Pin the user-visible promise in `group-management`, not generically

The new `group-management` requirement names the user-observable outcomes specifically for group deletion:

- Move → focus preserved on the (still-existing) task.
- Delete-all → focus cleared because the task is gone.

We do not generalize this to "all callers of destructive task actions" because `group-management` is the only feature today that bulk-mutates tasks by group. Generalizing would be speculative.

### Decision 3: Keep `handleResolveAndDelete` in the component

The handler stays inside `GroupSettingsPanel.tsx`. Two single-line branches don't earn a dedicated module. Colocating with the deletion UI keeps the read/write contract visible.

### Decision 4: Test the contract at two levels

- **Store-level test** in `tasks/store.test.ts` asserts the new narrow cascade: `reassignTasks` does not touch focus; `deleteTasksByGroupId` still clears focus on a focused-group deletion.
- **Component-level tests** in `GroupSettingsPanel.test.tsx` assert the user-visible outcome: Move preserves focus, Delete-all clears focus, unrelated group leaves focus alone.

Black-box tests at the component level survive future store refactors; store-level tests pin the contract for any caller.

## Risks / Trade-offs

- **Behavior change visible to existing users** → Anyone who has a focused task and moves its group during deletion will see focus stick where today it would clear. We consider this an improvement (focus follows the still-existing task) and the change is local-first with no migration concerns.
- **Spec divergence between this change and any branches built off the old cascade requirement** → None outstanding. Only one place in the codebase exercised the cascade-on-reassign behavior (the panel handler we are refactoring); it had no observable user effect because the per-id loop bypassed the cascade entirely. So the spec was already disagreeing with the running app on this point. We are reconciling them on the narrower rule.
- **Sequencing with `refine-group-delete-flow`** → Already merged. This change rebases on top.
- **Cascade asymmetry in the spec table** → Spec readers will see `reassignTasks` excluded with a brief rationale. The asymmetry is the point: the cascade is now uniformly "fires when a task ceases to exist."
