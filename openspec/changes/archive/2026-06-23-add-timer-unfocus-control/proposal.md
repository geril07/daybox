## Why

Today the only way to clear `focusedTaskId` from the UI is the toggle on `TaskRow`'s Focus button — press it on the already-focused row, and `focusTask` flips focus to `null`. When the focused task's row isn't on screen (filtered out by date, hidden by view, or just not scrolled into view) there's no in-timer affordance to unbind it, even though the timer keeps rendering "Working on {title}" for a task the user can no longer reach.

## What Changes

- Add a dismiss control inline on the timer bar's "Working on…" row. When `focusedTaskId` is non-null, the row renders a small `×` affordance at its trailing edge. Activating it calls `useTimerStore.setFocusedTaskId(null)`.
- The control is purely a focus clear: it SHALL NOT touch `phase`, `elapsed`, `startedAt`, `isRunning`, or `sessionPomoCount`. The timer keeps doing whatever it was doing, just unbound.
- The control renders whenever `focusedTaskId` is set, regardless of whether the task is still resolvable. This makes it the single in-timer path out of both "task off-screen" and "stale focus" states.
- No changes to `focusTask`'s toggle semantics on `TaskRow`. The TaskRow toggle and the new timer control are two paths to the same outcome (`focusedTaskId === null`); they coexist.
- No changes to the existing cascade-clear invariants in `task-management`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `pomodoro-timer`: the "Working on…" label row gains an inline control to clear focus. The requirement that currently describes the focused-task label ("Task label is independent of phase", plus the surrounding display requirement) gains an additional requirement specifying the clear affordance, its visibility condition, and that it only mutates `focusedTaskId`.

## Impact

- `src/modules/timer/components/TimerBar.tsx` — render the dismiss control on the "Working on" row; wire its click handler to `setFocusedTaskId(null)`.
- `src/modules/timer/components/TimerBar.test.tsx` — add cases: control hidden when `focusedTaskId` is null; control visible and clears focus when clicked; timer state (`elapsed`, `isRunning`, `phase`) is unchanged by the click.
- `openspec/specs/pomodoro-timer/spec.md` — add a delta requirement for the clear-focus control.
- No store, schema, persistence, or task-management changes. The action primitive (`setFocusedTaskId(null)`) already exists.
