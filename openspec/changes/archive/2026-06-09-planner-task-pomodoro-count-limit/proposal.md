## Why

The pomodoro estimate editor in the planner caps `pomoEstimate` at 9, both in the zod schema (`src/features/tasks/schema.ts:12-13`) and on the `NumberInput` in `TaskRow.tsx:225`. Tasks that need more than nine focus blocks cannot be planned in one entry, forcing users to split work artificially. The 9-cap was a placeholder; the underlying invariants (`pomoCompleted <= pomoEstimate`, integer, non-negative) do not require it.

## What Changes

- Raise the upper bound on `pomoEstimate` from 9 to 99 across the schema and the editor `NumberInput`.
- Allow `pomoCompleted` to match the new estimate bound (its existing `max={task.pomoEstimate}` follows automatically).
- Keep all existing invariants: integer, non-negative, `pomoCompleted <= pomoEstimate`, and the "lowering estimate clamps completed" behavior.
- No new UI, no new keyboard shortcut, no new store action, no data-migration step required — any task already at `pomoEstimate = 9` keeps working.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `task-management`: The `User can set pomodoro estimate` requirement currently binds the `NumberInput` to `[0, 9]`. The bound becomes `[0, 99]`. The zod schema's `pomoEstimate`/`pomoCompleted` max becomes `99`. Display, progress bar, and clamp behavior are unchanged.

## Impact

- `src/features/tasks/schema.ts` — `z.number().int().min(0).max(9)` → `max(99)` for `pomoEstimate` and `pomoCompleted`.
- `src/features/tasks/components/TaskRow.tsx` — `NumberInput` for estimate `max={9}` → `max={99}`.
- `src/features/tasks/components/TaskRow.test.tsx` — any test that asserted the old `9` cap is updated/removed; coverage for higher values (e.g., 12/12) is added where useful.
- No data migration: existing tasks with `pomoEstimate <= 9` continue to satisfy the new schema.
- No timer, group, or persistence changes; `localStorage` payloads are unchanged in shape.
