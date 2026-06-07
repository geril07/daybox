## Why

The current group-delete flow always opens a heavyweight `AlertDialog`, even when the group is empty and nothing is at stake. That ceremony is mismatched with what the prompt actually is — a **resolution picker** ("what should happen to these tasks?"), not a yes/no confirmation. The dialog also obscures the rest of the panel and breaks locality with the trash button that triggered it. Separately, the store currently allows deletion of the default "General" group as long as another group exists, which leaves orphaned references to `DEFAULT_GROUP_ID` and contradicts its role as the canonical fallback.

## What Changes

- Replace the `AlertDialog` in `GroupSettingsPanel` with a `Popover` anchored to the trash button (align end), shown only when the group has ≥1 task.
- When the group has zero tasks, the trash button deletes immediately with no prompt.
- Show the task count in the popover header microcopy (e.g., `"Work" has 3 tasks`).
- Reorder choices: `Move to General` (primary, safer) → `Delete all tasks` (destructive) → `Cancel` (ghost). No default-focused destructive action; no `Enter`-defaulted choice.
- **BREAKING (UX)**: The default group can no longer be deleted. Enforced at two layers:
  - `useGroupStore.deleteGroup` refuses when `id === DEFAULT_GROUP_ID`.
  - The trash button in `GroupItem` is disabled when `group.id === DEFAULT_GROUP_ID` (in addition to existing `isLast` rule).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `group-management`: refine the delete-group requirement to differentiate empty vs non-empty groups, and add a hard rule that the default group cannot be deleted.

## Impact

- **Code**:
  - `src/features/groups/components/GroupSettingsPanel.tsx` — swap `AlertDialog` → `Popover`, add task-count branching, disable trash on default group.
  - `src/features/groups/store.ts` — guard `deleteGroup` against the default id.
  - Existing tests for the groups store + any panel tests need updates / additions.
- **Specs**: delta on `openspec/specs/group-management/spec.md`.
- **Out of scope (separate change)**: refactoring `handleDeleteGroup` to use the existing `reassignTasks` / `deleteTasksByGroupId` bulk helpers in `src/features/tasks/store.ts`.
- **Dependencies**: none — `Popover` already exists in `@/shared/ui` and is used elsewhere (`TaskRow`, `AddTaskRow`).
