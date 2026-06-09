## 1. Drop the invariant in the schema

- [x] 1.1 In `src/features/tasks/schema.ts`, remove the `.refine((t) => t.pomoCompleted <= t.pomoEstimate, { message: 'pomoCompleted must be ≤ pomoEstimate' })` block. Leave the two `z.number().int().min(0).max(99)` validators untouched.

## 2. Make the editor's two inputs independent

- [x] 2.1 In `src/features/tasks/components/TaskRow.tsx`, change the `pomoCompleted` `NumberInput` `max` prop from `task.pomoEstimate` to `99`.
- [x] 2.2 In the same file, in `handleEstimateChange`, remove the `if (n < task.pomoCompleted) { patch.pomoCompleted = n }` branch. The handler should write only `{ pomoEstimate: n }` to the store.

## 3. Update tests in TaskRow

- [x] 3.1 In `src/features/tasks/components/TaskRow.test.tsx`, replace the "lowering estimate below completed clamps completed" test with one that asserts lowering the estimate does NOT change `pomoCompleted` (input: `pomoEstimate = 5`, `pomoCompleted = 5`; lower estimate to 3; expect `pomoCompleted` to remain `5`).
- [x] 3.2 In the same file, delete the "disables the + control on completed when completed === estimate" test — the `+` control on the completed input is no longer disabled at the estimate boundary.
- [x] 3.3 In the same file, add a test asserting that increasing `pomoCompleted` above `pomoEstimate` is accepted (input: `pomoEstimate = 3`, `pomoCompleted = 1`; raise completed to 7; expect `pomoCompleted` to be `7` and `pomoEstimate` to remain `3`).
- [x] 3.4 In the same file, add a test asserting the `+` control on the completed input is disabled at the global cap (set up a task with `pomoCompleted = 99`; open the popover; expect the completed `+` to be disabled).

## 4. Add timer test

- [x] 4.1 In `src/features/timer/components/TimerBar.test.tsx` (create the file if it does not exist, alongside the existing `TimerBar.tsx`), add a test that focuses a task with `pomoEstimate = 0` and `pomoCompleted = 0`, advances the timer through a full focus interval, and asserts the task ends with `pomoCompleted = 1` and `pomoEstimate` still `0`.
- [x] 4.2 In the same file, add a test that focuses a task with `pomoEstimate = 3` and `pomoCompleted = 3`, advances the timer through a full focus interval, and asserts the task ends with `pomoCompleted = 4` and `pomoEstimate` still `3`.

## 5. Verify

- [x] 5.1 Run `npm run typecheck` and `npm run lint` — both must pass.
- [x] 5.2 Run `npm run test` — all tests pass, including the new and modified ones.
