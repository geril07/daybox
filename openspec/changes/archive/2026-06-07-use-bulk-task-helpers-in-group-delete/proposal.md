## Why

`GroupSettingsPanel.handleResolveAndDelete` (`src/features/groups/components/GroupSettingsPanel.tsx`) loops `useTaskStore.updateTask` / `deleteTask` per task id when resolving the deleted group's tasks. The tasks store already exports purpose-built bulk helpers — `reassignTasks(fromGroupId, toGroupId)` and `deleteTasksByGroupId(groupId)` (`src/features/tasks/store.ts:114-142`) — that are the right tool for group-scoped operations.

While converting the panel to use those helpers, we noticed the existing focused-task cascade contract in `task-management/spec.md:378-409` is over-zealous: it clears `useTimerStore.focusedTaskId` on `reassignTasks` whenever the focused task lives in the from-group. That rule is wrong on reflection — a moved task still exists, still has the same id, and is still a perfectly valid focus target. The cascade exists to prevent dangling references to vanished tasks, and a move doesn't vanish anything. Worse, the rule is path-dependent: `updateTask(id, { groupId: 'x' })` (per-task) keeps focus, while `reassignTasks(from, to)` (bulk, same end state) clears it. Two paths to the same state with different invariants is a smell.

So this change is two things at once: a code-quality refactor (use the bulk helpers) AND a contract tightening (drop reassignment from the focused-task cascade so the rule reads "focus clears when the task ceases to exist, not when it relocates").

## What Changes

- Replace the per-id `updateTask` loop in `handleResolveAndDelete` with a single `useTaskStore.getState().reassignTasks(groupId, DEFAULT_GROUP_ID)` call.
- Replace the per-id `deleteTask` loop with a single `useTaskStore.getState().deleteTasksByGroupId(groupId)` call.
- **BREAKING (invariant)**: Remove `reassignTasks` from the focused-task cascade in `useTaskStore`. After this change, reassigning the focused task's group leaves `useTimerStore.focusedTaskId` untouched.
- Update `task-management` spec to reflect the narrower cascade rule.
- Add a `group-management` requirement that pins the user-visible promise: deleting a group never leaves the timer pointing at a vanished task — but moving tasks during deletion preserves focus on the still-existing task.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `task-management`: narrow the focused-task cascade to exclude `reassignTasks`. The cascade now fires only when a task **ceases to exist** (`deleteTask`, `deleteTasksByGroupId`), not when it merely relocates.
- `group-management`: add a requirement that group deletion (regardless of which resolution the user picks) goes through the bulk task helpers, and pin the user-visible focus-cascade promise at the group-deletion boundary.

## Impact

- **Code**:
  - `src/features/tasks/store.ts` — drop the `focusedInFromGroup` block from `reassignTasks`.
  - `src/features/groups/components/GroupSettingsPanel.tsx` — collapse `handleResolveAndDelete` to two single-call branches.
  - `src/features/groups/components/GroupSettingsPanel.test.tsx` — invert the "clears focus on move" cascade test to assert focus is preserved on move; keep the "delete-all clears focus" and "unrelated group preserves focus" tests as-is; add a store-level test asserting `reassignTasks` does not touch focus.
- **Specs**: deltas to `task-management` and `group-management`.
- **Dependencies**: none.
- **Sequencing**: Logically independent of `refine-group-delete-flow`. Applied after it; rebases cleanly on the new `handleResolveAndDelete` handler.
