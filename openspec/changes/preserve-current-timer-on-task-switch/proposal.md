## Why

Today, switching the focused task via the focus button silently rewrites the timer's phase, elapsed time, and `startedAt` — even if the timer is mid-run on a break. The clock snaps back to a full focus duration (or keeps counting from zero if already running), and any in-progress short/long break is abandoned without going through `advancePhase`, so `sessionPomoCount` is never adjusted. This makes the focus button feel destructive: a user who clicks "focus on this next task" expects the timer to keep doing what it was doing, with only the task binding changed. The change makes the focus gesture a pure rebind of `focusedTaskId` and stops touching the timer's clock, phase, or running state.

## What Changes

- `focusTask(id)` becomes a pure rebind of `focusedTaskId` for the "switch to a different task" branch. It no longer mutates `phase`, `elapsed`, `startedAt`, or `isRunning`.
- Clicking the focus button on the **same** task that is already focused continues to toggle `focusedTaskId` to `null` and leaves the timer untouched.
- The "auto-start on focus" / "reset to full focus duration on focus" behavior is **removed**: the rebind no longer implies a fresh focus phase.
- The mid-break edge case (`phase === 'break'` or `'long-break'` at switch time) is fixed implicitly: the timer keeps running on the break and the new task is bound to whatever completes next, with `sessionPomoCount` and `phase` advancing normally when the break ends.
- Update `openspec/specs/pomodoro-timer/spec.md` to remove the "elapsed reset to zero" line in the "Switching focus while running does not click" scenario, and add a positive "does not touch the timer clock or phase" statement.
- Update `openspec/specs/task-management/spec.md` to drop the "auto-start immediately" / "resets to full focus duration" requirements and replace with "timer state is preserved".
- Existing tests in `src/features/timer/store.test.ts` (lines 203-226) that assert the old reset behavior are updated to assert the new preserve behavior. The toggle-off branch and the "no click" branch remain green.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `pomodoro-timer`: the "Switching focus while running" scenario changes from "timer continues running with elapsed reset to zero" to "timer continues running with no state change besides the focused task id".
- `task-management`: the "User can focus on a task" requirement's two scenarios (focus while idle, focus while running) change from "resets to full focus duration and auto-starts" to "rebinds the focused task and leaves timer state untouched".

## Impact

- **Code**: `src/features/timer/store.ts` (`focusTask` action, lines 168-182).
- **Tests**: `src/features/timer/store.test.ts` — three test cases (sets focused task and resets phase to focus; preserves running state when refocusing; clears focus when re-focusing the same task) need to be rewritten to match the new preserve semantics.
- **Specs**: `openspec/specs/pomodoro-timer/spec.md` and `openspec/specs/task-management/spec.md` need delta specs (no archival; the spec files stay, their content is updated in-place via the change's `specs/` delta files).
- **No impact on**: persistence (localStorage key `daybox-timer` shape is unchanged — `focusedTaskId` is the only field the rebind writes), the cascade cleanup in `src/features/tasks/store.ts` (it uses `setFocusedTaskId`, not `focusTask`, so it is already non-destructive), the `TimerBar` UI binding, sound rules, or any other capability.
