## Why

`GroupSettingsPanel.handleDeleteGroup` (`src/features/groups/components/GroupSettingsPanel.tsx:30-46`) currently loops `useTaskStore.updateTask` / `deleteTask` per task id when resolving the deleted group's tasks. The tasks store already exports purpose-built bulk helpers — `reassignTasks(fromGroupId, toGroupId)` and `deleteTasksByGroupId(groupId)` (`src/features/tasks/store.ts:114-142`) — that the `task-management` spec explicitly designates as the canonical entry points for group-scoped operations.

The current per-id loop is not just verbose; it **violates an existing spec invariant.** `openspec/specs/task-management/spec.md:378-409` requires that reassigning a focused task's group clears `useTimerStore.focusedTaskId`. The cascade lives inside `reassignTasks` precisely so callers can't bypass it. Today's per-id `updateTask` loop skips the cascade — when a user moves a group containing the currently focused task to General, the timer stays pointed at a now-relocated task instead of clearing.

## What Changes

- Replace the per-id `updateTask` loop in `handleDeleteGroup` with a single `useTaskStore.getState().reassignTasks(groupId, DEFAULT_GROUP_ID)` call.
- Replace the per-id `deleteTask` loop in `handleDeleteGroup` with a single `useTaskStore.getState().deleteTasksByGroupId(groupId)` call.
- Add tests asserting the focused-task cascade fires correctly through the panel's delete flow (regression coverage for the spec invariant that was being violated).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `group-management`: add a requirement that group deletion (regardless of which resolution the user picks) SHALL go through the bulk task helpers so the focused-task cascade defined in `task-management` is not bypassed. This elevates today's invariant from "implementation detail" to a stated promise: deleting a group never leaves the timer pointing at a relocated or vanished task.

## Impact

- **Code**:
  - `src/features/groups/components/GroupSettingsPanel.tsx` — simplify `handleDeleteGroup` to two single-call branches.
  - `src/features/groups/components/GroupSettingsPanel.test.tsx` — add focus-cascade regression tests (or expand whatever tests `refine-group-delete-flow` introduced).
- **Specs**: small delta to `openspec/specs/group-management/spec.md`.
- **Dependencies**: none.
- **Sequencing**: Logically independent of `refine-group-delete-flow` but touches the same handler. Apply **after** `refine-group-delete-flow` lands to avoid a textual merge conflict in the same function body; sequencing is cosmetic, not technical.
