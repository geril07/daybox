## Why

The current `TaskRow` pomo indicator uses a row of small dots that are hard to read at a glance and inconsistent with the text fallback for un-estimated tasks. The popover lets the user set the _estimate_ only — `pomoCompleted` is system-driven and not editable — and the editor is a 3×3 pill grid that is busy and has a hard ceiling of 9. This change makes the indicator legible (number + thin progress bar) and gives the user precise control over both fields, with safe clamping at the boundaries.

## What Changes

- **Replace the dot visualization** in the `TaskRow` pomo trigger with an `X/Y` text label (e.g. `2/5`) plus a thin (1.5px) progress bar directly under the number, accent fill, width matching the number text.
- **Animate the progress bar** smoothly (CSS `transition: width`) on any change to `pomoCompleted` / `pomoEstimate`, including the timer's auto-increment.
- **Replace the popover's 0–9 pill grid** with two stacked `NumberInput`s — one for `pomoEstimate`, one for `pomoCompleted` — no other chrome (no presets, no row of quick-buttons).
- **Make `pomoCompleted` user-editable** in the popover. The Completed input's `max` is the task's current `pomoEstimate`, not the schema max, so `+` is disabled at the boundary.
- **Auto-clamp `pomoCompleted`** to the new `pomoEstimate` whenever the user drops estimate below the current completed value (single store call, single `updateTask` patch).
- **Do not auto-complete** the task when `pomoCompleted === pomoEstimate`. The checkbox remains the only way to mark the task complete; pomo completion is a separate dimension.
- **Null-guard the popover handlers.** `@base-ui/react`'s `NumberField` calls `onValueChange` with `value: number | null` when the user clears the input (`input-clear`) or types an unparseable value (`input-blur`). The popover handler SHALL treat `null` as a no-op (do not call `updateTask`); the prior field value is preserved.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `task-management`: rewrite the "User can set pomodoro estimate" requirement to cover the new `X/Y` display, the `NumberInput`-based popover, the addition of editable `pomoCompleted`, and the auto-clamp invariant.

## Impact

- `src/features/tasks/components/TaskRow.tsx` — rewrite the `PomoArea` subcomponent (display + popover).
- `src/features/tasks/components/TaskRow.test.tsx` — add coverage: two inputs render with current values; `+`/`-` on Completed disabled at estimate; reducing estimate below completed clamps completed; clicking `5/5` on the row does not toggle `task.completed`; clearing an input is a no-op.
- `src/features/tasks/schema.ts` — **no change**. The existing `.refine((t) => t.pomoCompleted <= t.pomoEstimate)` already enforces the invariant that the UI must respect.
- `src/features/tasks/store.ts` — **no change**. `updateTask(id, partial)` already accepts patches covering both fields.
- `src/shared/ui/number-input.tsx` — **required change**, not a verification. Source review of `@base-ui/react@1.5.0` confirms `NumberField.Increment` computes `isMax = value >= maxWithDefault` and `NumberField.Decrement` computes `isMin = value <= minWithDefault`, applying a real `disabled` attribute and `data-disabled` on the button at the boundary. The current wrapper does NOT style the disabled state, so the button is functionally dead but visually identical to enabled. Add a `data-disabled:opacity-40` (or equivalent) pass-through to the Increment/Decrement className. Side benefit: the existing `TimerSettingsPanel` consumer (which had the same latent issue) gets the fix for free.
- No new dependencies. `NumberInput` already exists in `shared/ui/` and is used by `TimerSettingsPanel`.
- Out of scope: the hidden-actions discoverability issue, the date-display issue, redesigning the row chrome.
