## Why

The system tries to enforce `pomoCompleted <= pomoEstimate` in two places:

- `src/features/tasks/schema.ts:19-21` — a zod `.refine` rejects any task where completed exceeds estimate.
- `src/features/tasks/components/TaskRow.tsx:182-188, 236` — the editor's `NumberInput max={task.pomoEstimate}` and the `n < task.pomoCompleted → patch.pomoCompleted = n` branch in the estimate change handler.

But the **timer** (`src/features/timer/components/TimerBar.tsx:88-90, 145-147`) is the only system-side writer of `pomoCompleted` and does an unguarded `+1` on every focus completion. So a task focused with `pomoEstimate = 0`, or past its estimate, produces `pomoCompleted > pomoEstimate` — and the schema then rejects the resulting state, the `+`/`−` controls misbehave relative to the live value, and the `X/Y` display becomes "weird" in exactly the way the user reported.

The invariant is a contract the system can't actually keep. The fix is to drop it: treat `pomoCompleted` and `pomoEstimate` as independent fields. The timer always increments `pomoCompleted`. The editor's `NumberInput` for `pomoCompleted` is bounded by the global cap (99), not by `pomoEstimate`. Lowering the plan only changes the plan.

## What Changes

- Remove the `.refine((t) => t.pomoCompleted <= t.pomoEstimate, …)` from `src/features/tasks/schema.ts`. The two `z.number().int().min(0).max(99)` checks stay.
- Change the completed `NumberInput` `max` in `src/features/tasks/components/TaskRow.tsx` from `task.pomoEstimate` to `99`.
- Remove the "lowering estimate clamps completed" branch (`n < task.pomoCompleted → patch.pomoCompleted = n`) from the estimate change handler in the same file. Lowering the estimate only writes `pomoEstimate`.
- No timer, store, group, persistence, or import changes. The timer's `+1` is already the correct behavior under the new contract.
- No data migration. Tasks already in the store are unaffected — the `.refine` is removed, not replaced with a tighter check, so existing payloads (including any with `pomoCompleted > pomoEstimate` from the timer bug) keep validating.
- No healing logic. If `pomoCompleted > pomoEstimate` exists, the system renders it as-is.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `task-management`: The "User can set pomodoro estimate" requirement no longer preserves `pomoCompleted <= pomoEstimate`; lowering the estimate leaves completed untouched. The "User can edit pomodoro completed count" requirement's `NumberInput max` is no longer the task's current `pomoEstimate`; it is the global cap `99`, and the `+`/`−` disable boundaries become `0` and `99` for that input.
- `pomodoro-timer`: The "Timer increments task pomodoros" requirement gains a scenario asserting the increment happens regardless of the task's `pomoEstimate`.

## Impact

- `src/features/tasks/schema.ts` — drop the `.refine` block; the two `z.number().int().min(0).max(99)` validators remain.
- `src/features/tasks/components/TaskRow.tsx` — completed `NumberInput` `max={task.pomoEstimate}` → `max={99}`. Remove the `if (n < task.pomoCompleted) { patch.pomoCompleted = n }` branch from `handleEstimateChange`; the patch becomes `{ pomoEstimate: n }` unconditionally.
- `src/features/tasks/components/TaskRow.test.tsx` — invert the "lowering estimate clamps completed" test; delete the "disables the + control on completed when completed === estimate" test; add a test asserting the completed input accepts a value above `pomoEstimate`; add a test asserting lowering the estimate does NOT change completed.
- `src/features/timer/components/TimerBar.test.tsx` (new or existing) — add a test asserting that completing a focus interval on a task with `pomoEstimate = 0` results in `pomoCompleted = 1` and `pomoEstimate` unchanged.
- No store, group, persistence, import, migration, or settings changes.
