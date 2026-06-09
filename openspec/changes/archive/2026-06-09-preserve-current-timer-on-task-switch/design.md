## Context

DayBox's Pomodoro timer keeps its active-task binding in `useTimerStore.focusedTaskId`, set exclusively by the `focusTask(id)` action (`src/features/timer/store.ts:168-182`). The only UI that triggers it is the focus button (`<Target />`) on each `TaskRow` (`src/features/tasks/components/TaskRow.tsx:156-163`).

Today, `focusTask` is **not** a pure rebind. When the user clicks a _different_ task, the action atomically:

- sets `focusedTaskId = id`
- forces `phase = 'focus'`
- zeroes `elapsed`
- recomputes `startedAt` based on `wasRunning`
- preserves `isRunning` from `wasRunning`

This is a destructive rebind. A user mid-break (say, 7 minutes into a 5-minute short break, or on a long break) clicks "focus on the next task" and the bar silently snaps to a full 25:00 focus and either keeps ticking from zero or sits there paused. Worse, the abandoned break never goes through `advancePhase`, so `sessionPomoCount` is never decremented — the focus count drifts up incorrectly. The existing spec in `openspec/specs/pomodoro-timer/spec.md:340-344` codifies the current (destructive) behavior with the line "the timer continues running with elapsed reset to zero"; `openspec/specs/task-management/spec.md:226-238` codifies the same with "resets to full focus duration and auto-starts immediately".

The cascade cleanup in `src/features/tasks/store.ts:42-48, 89-94, 139-150` (called when a focused task is deleted) is already non-destructive — it uses `setFocusedTaskId(null)`, not `focusTask`. The new design only needs to fix `focusTask` itself.

## Goals / Non-Goals

**Goals:**

- `focusTask(id)` becomes a pure rebind of `focusedTaskId` for the "switch to a different task" branch. No clock, phase, or running-state side effects.
- Clicking the focus button on the **same** already-focused task continues to toggle `focusedTaskId` to `null` with no other changes (preserves current toggle-off behavior verbatim).
- A break in progress keeps running when the user rebinds — `sessionPomoCount`, `phase`, and the auto-roll to focus at the end of the break all work as they do today, driven by `advancePhase` when the break's `remainingMs` reaches 0.
- The persistence shape of the `daybox-timer` localStorage entry is unchanged; only the value of `focusedTaskId` is rewritten.
- Delta specs land in `pomodoro-timer` and `task-management` (no new capability).

**Non-Goals:**

- Changing the "click on already-focused task toggles off" semantics.
- Changing the cascade cleanup in the tasks store (it is already non-destructive).
- Adding a confirmation prompt, a "reset and start" menu, or any new affordance on the focus button. The button does one thing: bind/unbind the id.
- Changing the alarm sound, the click sound rules, or the auto-roll rules in `pomodoro-timer`.
- Touching the `TimerBar` UI, the `TaskRow` UI, or any keyboard shortcut.

## Decisions

### Decision 1: Make `focusTask` a one-line rebind

Replace the body of `focusTask` (lines 168-182) with:

- **Toggle branch** (same id as current focus): `set({ focusedTaskId: null })` and return. Identical to current.
- **Switch branch** (any other id, including `null`): `set({ focusedTaskId: id })` and return.

The action becomes two paths, neither of which reads `wasRunning` or touches `phase`/`elapsed`/`startedAt`/`isRunning`. No `Date.now()` call, no `get()` for state inspection (the only state read is the id comparison).

**Rationale.** The action's name and only caller (the focus button on `TaskRow`) communicate "change the binding" — not "restart the timer on a new task". A single source of truth (id-only mutation) eliminates the mid-break bug for free and matches the cascade path's existing philosophy (`setFocusedTaskId(null)` is also a one-field setter).

**Alternatives considered.**

- _Keep the destructive rebind but only when on a focus phase._ Rejected: it preserves the silent abandonment of a break (phase is overwritten but `sessionPomoCount` is not decremented) and leaves two different "is this on a break?" branches that have to stay in sync with `getNextPhase`. The whole reason for the bug is the action knowing about phases; remove the knowledge.
- _Add a separate `setFocusedTaskId` setter (already exists) and have the UI call it directly._ Rejected: keeps the destructive `focusTask` around for one caller and increases the API surface. Simpler to retire the destructive code path.
- _Add a "reset and start" button next to the focus button._ Rejected: scope creep, and the proposal's goal is "do nothing destructive on rebind", not "expose more destructive actions".

### Decision 2: Do not decrement `sessionPomoCount` retroactively on switch

The current bug is that switching mid-break _also_ fails to adjust `sessionPomoCount`. With Decision 1 in place, the break continues to run; when it ends, the existing `tick → remainingMs <= 0 → advancePhase` path in `TimerBar.tsx:87-91` runs and `sessionPomoCount` advances normally. No retroactive correction is needed.

**Rationale.** The break still completes. The auto-roll logic is the single source of truth for "did this break count?". Touching `sessionPomoCount` from `focusTask` would re-introduce the coupling we are removing.

### Decision 3: Update tests in place, do not add a `setFocusedTaskId` test

`src/features/timer/store.test.ts:203-226` currently has three cases for `focusTask`. They need to be rewritten to assert:

- Switch branch: `focusedTaskId` updates; `phase`, `elapsed`, `isRunning`, `startedAt` are unchanged.
- Switch branch while idle: same — no implicit reset to full focus.
- Switch branch while on a break: `phase` stays on the break; `isRunning` stays true; `elapsed` is preserved.
- Toggle branch: `focusedTaskId` becomes `null`; everything else untouched.

No new test for `setFocusedTaskId` is needed — its semantics do not change.

### Decision 4: Spec deltas, not new capability

The change touches two existing requirements and one existing scenario. Both belong in their current capabilities (`pomodoro-timer`, `task-management`). The `proposal.md` `Capabilities` section lists both as **Modified Capabilities**, so this change's `specs/` folder will contain two delta files at `specs/pomodoro-timer/spec.md` and `specs/task-management/spec.md` using `## MODIFIED Requirements`.

## Risks / Trade-offs

- **User intent surprise on running focus** → Today, clicking a different task while on a running focus instantly resets the focus clock to 25:00. After this change, the running focus continues from wherever it was, with a different task bound. Users who relied on the implicit reset to "start a new focus on a new task" lose that affordance. _Mitigation_: the focus button's `title="Focus"` and the `Working on:` label in `TimerBar` clearly surface that this is a binding gesture, not a "start new" gesture. The `reset()` action is still available to clear the clock explicitly.
- **Toggle-off quirk** → Clicking the focus button on the already-focused task only nulls the id; it does not pause. This is unchanged from today. _Mitigation_: out of scope; flag for a future "unfocus should pause" decision in its own change.
- **No regression test for the mid-break `sessionPomoCount` bug** → The new tests cover the preserve behavior, but the "sessionPomoCount does not drift when a break is abandoned via switch" guarantee is implicit in the design (the break no longer gets abandoned). _Mitigation_: the design.md's Decision 2 spells this out; a future scenario could be added if a regression slips.
- **Persisted `daybox-timer` shape** → The persisted JSON includes `phase`, `elapsed`, `startedAt`, `isRunning`, `focusedTaskId`, `sessionPomoCount`, and `settings`. The change writes only `focusedTaskId` on a switch. Old persisted blobs (with stale `phase: 'focus'`, `elapsed: 0`, `isRunning: false` snapshots from previous destructive switches) continue to work — the zustand `persist` middleware does a partial update. No migration code needed.
- **Re-import edge case** → If a user exports during a running focus, switches the focused task in the imported data via a re-import, and the import path uses `focusTask` (not `setFocusedTaskId`), the destructive behavior is gone. The import slice in `src/features/timer/slice.ts` should be reviewed to ensure it uses the non-destructive setter. _Mitigation_: a task in `tasks.md` audits `slice.ts` and updates it to use `setFocusedTaskId` for any "imported focused task" writes.

## Migration Plan

No data migration. The `daybox-timer` localStorage schema is unchanged; the change is purely in the runtime behavior of `focusTask`. Users with a stale "focused task id" from a previous session see the same id bound on next load; the timer's running state on load is whatever was last persisted (independent of this change).

Rollback is a one-line revert: restore the `focusTask` body to its current 15-line implementation. No persisted state to clean up.

## Open Questions

- _Should clicking the focus button on the already-focused task also pause the timer?_ Current spec leaves it as a "toggle binding only" gesture. Out of scope for this change; recorded here so a future "unfocus pauses" change can pick it up.

## Future Considerations

- _Restore the "reset + auto-start on focus" workflow as an opt-in._ This change removes the implicit reset that some users relied on as a "start a fresh pomodoro on a new task" shortcut. Possible follow-ups, none decided, to be picked up in a separate change after user feedback:
  - A `settings` capability addition: a "Focus click resets the clock" toggle (off by default — pure rebind is the new default). Would land a new requirement in the `settings` spec and modify the `task-management` "User can focus on a task" requirement to read the setting.
  - A modifier-key gesture (e.g., Shift-click the focus button) that performs the old reset-and-auto-start behavior.
  - A long-press / right-click menu on the focus button with "Focus", "Focus and reset", "Focus and start".
  - No code is being added for any of these in this change — they are captured here so the next OpenSpec change proposal can reference this thread instead of rediscovering the trade-off.
