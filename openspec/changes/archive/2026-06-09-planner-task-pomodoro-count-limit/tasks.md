## 1. Raise the pomodoro count cap

- [x] 1.1 In `src/features/tasks/schema.ts`, change `pomoEstimate` and `pomoCompleted` zod validators from `.max(9)` to `.max(99)`.
- [x] 1.2 In `src/features/tasks/components/TaskRow.tsx`, change the estimate `NumberInput` `max` prop from `9` to `99`.

## 2. Update tests

- [x] 2.1 In `src/features/tasks/components/TaskRow.test.tsx`, add a scenario asserting that increasing `pomoEstimate` from `9` to a value above the legacy cap (e.g. `25`) is accepted and `pomoCompleted` is preserved.
- [x] 2.2 In `src/features/tasks/components/TaskRow.test.tsx`, add a scenario asserting that lowering `pomoEstimate` from `20` to `10` clamps `pomoCompleted` to `10` in the same store call.

## 3. Verify

- [x] 3.1 Run `npm run typecheck` and `npm run lint` — both must pass.
- [x] 3.2 Run `npm run test` — all tests pass, including the new ones.
