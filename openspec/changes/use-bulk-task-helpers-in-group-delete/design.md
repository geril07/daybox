## Context

The `task-management` spec at `openspec/specs/task-management/spec.md:378-409` defines the focused-task cascade: when a destructive task action removes or reassigns the focused task, the timer's `focusedTaskId` must be cleared. The cascade is implemented inside the store actions themselves so callers can't bypass it. Two of the cascade-aware actions are the bulk helpers `reassignTasks(fromGroupId, toGroupId)` and `deleteTasksByGroupId(groupId)`.

`GroupSettingsPanel.handleDeleteGroup` predates (or independently grew alongside) those helpers and reaches into the tasks store with per-id `updateTask` / `deleteTask` loops. The per-id `updateTask` path has no cascade — that's the bug. The per-id `deleteTask` path does cascade per call, so the "delete all tasks" branch happens to work today, but only by accident of iteration order.

## Goals / Non-Goals

**Goals:**

- Bring `handleDeleteGroup` into compliance with the focused-task cascade requirement.
- Make the compliance explicit at the `group-management` spec level so future contributors can't regress it without changing the spec.
- Keep the change surgical: only `handleDeleteGroup` and its tests.

**Non-Goals:**

- Any UX change to the group-delete flow (that's `refine-group-delete-flow`'s scope).
- Adding new bulk helpers to the tasks store — the existing two are sufficient.
- Adding undo for group operations.
- Touching the `task-management` spec — the cascade requirement there is already correct; we're aligning a caller, not changing the contract.

## Decisions

### Decision 1: Pin the invariant in `group-management`, not as an architecture rule

The new requirement lives in `group-management/spec.md` rather than as a generic "all callers of destructive task actions must use bulk helpers when operating on a set" rule. Reason: `group-management` is the only feature today that bulk-mutates tasks by group. Generalizing the rule beyond the actual caller would be speculative; we pin it where the real risk is.

If/when a second caller appears that operates on a group-bounded task set (e.g., a future export-then-delete-group flow, or a per-group bulk-complete action), we revisit and broaden the requirement.

### Decision 2: Keep `handleDeleteGroup` in the component

The handler stays inside `GroupSettingsPanel.tsx`. Reasons:

- Two single-line branches don't earn a dedicated module.
- The handler reads from both `groups` and `tasks` stores and writes to both — its colocation with the deletion UI keeps the read/write contract visible.
- The store actions it calls (`reassignTasks`, `deleteTasksByGroupId`, `deleteGroup`) are already the right abstractions; there's nothing left to factor out.

### Decision 3: Regression tests target the cascade, not the bulk call

Tests assert the user-observable outcome (`useTimerStore.focusedTaskId === null` after a focused-group deletion) rather than asserting that `reassignTasks` was called. The cascade is the contract; the bulk helper is just the means. Black-box testing of the contract makes the tests survive future refactors (e.g., if someone inlines the helper or introduces a different cascade path).

## Risks / Trade-offs

- **Sequencing with `refine-group-delete-flow`** → If applied first, this change conflicts textually with `refine-group-delete-flow`'s `GroupSettingsPanel.tsx` edits. Apply `refine-group-delete-flow` first; this change rebases cleanly on top because the popover work doesn't touch the per-id loop pattern of `onDelete` consumers. Documented in proposal.
- **Spec overreach** → The new requirement names specific store helpers (`reassignTasks`, `deleteTasksByGroupId`) and the path that violates them (per-task `updateTask`). That's more prescriptive than typical spec language. Mitigation: the prescription is exactly what prevents the cascade bypass and is therefore part of the user-visible contract, not implementation trivia.
- **Discovery of other violators** → If a code scan turns up additional places where a panel loops per-task instead of calling bulk helpers, those should be folded into a separate cleanup change rather than expanded into this one.
