## 1. Refactor `focusTask` to a pure rebind

- [ ] 1.1 Replace the body of `focusTask` in `src/features/timer/store.ts:168-182` so the switch branch only writes `focusedTaskId: id` and returns; keep the toggle branch (same id) unchanged
- [ ] 1.2 Remove the now-unused `const state = get()` read in the switch branch and the local `wasRunning` variable
- [ ] 1.3 Remove the `Date.now()` call from `focusTask` — no longer needed once the switch branch does not touch `startedAt`

## 2. Update store tests for the new preserve semantics

- [ ] 2.1 Rewrite the "sets focused task and resets phase to focus" test in `src/features/timer/store.test.ts:204-211` to assert `phase` and `elapsed` are preserved when switching
- [ ] 2.2 Rewrite the "preserves running state when refocusing" test in `src/features/timer/store.test.ts:213-219` to assert `focusedTaskId` updates and that the elapsed/startedAt values are unchanged (snapshot the values before the call, compare after)
- [ ] 2.3 Add a new test "preserves running break" that sets `phase: 'shortBreak'`, `isRunning: true`, `elapsed: 7500`, calls `focusTask('task-2')`, and asserts all four clock fields are unchanged
- [ ] 2.4 Add a new test "preserves idle timer state" that sets `phase: 'focus'`, `isRunning: false`, `elapsed: 0`, calls `focusTask('task-2')`, and asserts all clock fields are unchanged (no implicit reset to a "fresh" focus)
- [ ] 2.5 Keep the "clears focus when re-focusing the same task" test at `src/features/timer/store.test.ts:221-225` as-is — toggle branch is unchanged
- [ ] 2.6 Update the `describe('focusTask', ...)` block heading comment in the test file to reflect the new "pure rebind" intent

## 3. Verify the cascade cleanup still works

- [ ] 3.1 Run the existing cascade tests in `src/features/tasks/store.test.ts` (or its equivalent) to confirm `clearFocusIfMatching` is unaffected by the `focusTask` refactor
- [ ] 3.2 Spot-check `src/features/timer/components/TimerBar.tsx:87-91` and the `advancePhase` path to confirm a running break still auto-rolls to focus and increments `sessionPomoCount` when its `remainingMs` reaches zero (no code change expected; just verify)

## 4. Lint, typecheck, and full test pass

- [ ] 4.1 Run `npm run format`
- [ ] 4.2 Run `npm run typecheck`
- [ ] 4.3 Run `npm run lint`
- [ ] 4.4 Run `npm run test` (single-run: `npx vitest run`) and confirm all tests pass
