## 1. Foundation

- [x] 1.1 Extend `src/shared/ui/number-input.tsx` to style the disabled state on `NumberField.Increment` / `NumberField.Decrement`. Base-ui already applies `data-disabled` at min/max (confirmed in source: `Increment` computes `isMax = value >= maxWithDefault`; `Decrement` computes `isMin = value <= minWithDefault`). The wrapper currently does not style this state. Add `data-disabled:opacity-40` (or equivalent) to the Increment/Decrement className. Verify the change also visually benefits the `TimerSettingsPanel` consumer (it had the same latent issue).
- [x] 1.2 In both popover handlers (estimate, completed), null-guard the `onValueChange` value. If the user clears the input, do not call `updateTask` with `null` — silently no-op and let the prior valid value stand.

## 2. PomoArea rewrite

- [x] 2.1 Replace the dot rendering in the `PomoArea` trigger with an `X/Y` text label (e.g. `2/5`) for any `pomoEstimate` value, including `0`.
- [x] 2.2 Add a thin (1.5px) progress bar element below the `X/Y` text. Bar width is `(pomoCompleted / pomoEstimate) * 100%` (treat as `0%` when `pomoEstimate === 0`). Use the existing `accent` token for the fill and a transparent track. Add a CSS `transition: width 200ms ease-out` on the bar's inner element.
- [x] 2.3 Replace the popover's 3×3 pill grid with two `NumberInput`s stacked vertically: one labelled `Estimate`, one labelled `Completed`. Remove the existing pills and the "POMODOROS" uppercase header.
- [x] 2.4 Wire the `Estimate` `NumberInput` to `updateTask(task.id, { pomoEstimate: n })`. In a single `updateTask` call, if the new `n < pomoCompleted`, also set `pomoCompleted: n` in the same patch. Null-guard per task 1.2.
- [x] 2.5 Wire the `Completed` `NumberInput` to `updateTask(task.id, { pomoCompleted: n })`. Pass `max={task.pomoEstimate}` and `min={0}`. The `+`/`−` controls will be auto-disabled at the boundaries by base-ui, with the new visual treatment from task 1.1. Null-guard per task 1.2.
- [x] 2.6 Confirm clicking the trigger (or the bar) opens the popover; ensure the entire `X/Y + bar` area is inside the `PopoverTrigger`.

## 3. Test coverage

- [x] 3.1 Add a test asserting the trigger renders `X/Y` text for a task with `pomoEstimate = 5, pomoCompleted = 2` (e.g. `2/5`).
- [x] 3.2 Add a test asserting the trigger renders `0/0` for an un-estimated, uncompleted task.
- [x] 3.3 Add a test asserting the popover contains two `NumberInput`s labelled for estimate and completed.
- [x] 3.4 Add a test asserting that lowering `pomoEstimate` from `5` to `3` on a task with `pomoCompleted = 5` updates both fields to `3` in a single store call.
- [x] 3.5 Add a test asserting that increasing `pomoCompleted` from `2` to `4` on a task with `pomoEstimate = 5` updates only `pomoCompleted` to `4` (and leaves `pomoEstimate` unchanged).
- [x] 3.6 Add a test asserting that the `+` control on the completed input is disabled when `pomoCompleted === pomoEstimate`.
- [x] 3.7 Add a test asserting that the `−` control on the completed input is disabled when `pomoCompleted === 0`.
- [x] 3.8 Add a test asserting that setting `pomoCompleted = pomoEstimate` manually does NOT toggle `task.completed`.
- [x] 3.9 Update the existing `TaskRow` test fixtures in `TaskRow.test.tsx` to use realistic initial `pomoEstimate` / `pomoCompleted` values so the new fields are exercised.
- [x] 3.10 Add a test asserting that clearing the value of either `NumberInput` (typing/deleting all text) does not call `updateTask` and the corresponding task field retains its prior value.

## 4. Verification

- [x] 4.1 Run `npm run format` and ensure no diff.
- [x] 4.2 Run `npm run typecheck` and ensure no errors.
- [x] 4.3 Run `npm run lint` and ensure no errors.
- [x] 4.4 Run `npm run test` and ensure all tests pass, including the new ones in 3.x.
