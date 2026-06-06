## Context

The Pomodoro timer lives in a compact bottom bar (`src/features/timer/components/TimerBar.tsx`) backed by a Zustand store (`src/features/timer/store.ts`). The store already holds everything needed (`phase`, `startedAt`, `elapsed`, `isRunning`, `sessionPomoCount`, `focusedTaskId`, `settings`) and exposes `start`, `pause`, `reset`, `togglePlayPause`, `skip`, `advancePhase`, `setPhase`, `tick`, `focusTask`. Two store actions — `setPhase` and `skip` — are dead (no UI caller); the bar drives advancement through `advancePhase` directly.

Three problems motivate this change (full detail in `proposal.md`):

1. `advancePhase` resets `sessionPomoCount` to `0` on every re-entry into focus (`store.ts:107-110`), so the count oscillates `0 ↔ 1`, the dots never fill, and long breaks **never fire**.
2. `reset()` only zeroes the current interval; there is no "back to focus #1" path.
3. Phase identity is bolted onto the focused-task label instead of the timer, and there is no way to jump to a specific phase.

This is a presentation + state-machine fix within the existing feature. No new dependencies, no schema change (`sessionPomoCount` already exists in `TimerStateSchema`).

## Goals / Non-Goals

**Goals:**

- Make `sessionPomoCount` correct so long breaks fire and the dots are meaningful.
- Surface phase identity on the timer itself (ambient tint + chip), decoupled from the task label.
- Let the user jump to any phase via the chip (wire up `setPhase`).
- Replace `reset` with a single progressive control whose meaning is visible.
- Remove the redundant top border.

**Non-Goals:**

- Focus mode / expand view (separate change `add-timer-focus-mode`, which depends on this).
- Any change to the task-level pomo counter (`pomoCompleted`/`pomoEstimate`) — that is distinct from the timer's `sessionPomoCount`.
- Layout/structural changes to the app shell; the bar stays a bottom bar.
- Persistence-shape or migration work.

## Decisions

### D1 — Fix `sessionPomoCount` semantics in `advancePhase`

Redefine the count as **"focus intervals completed since the last long break."** The update rule on phase completion becomes:

```
on advancePhase (interval just completed = state.phase):
  completedFocus = state.phase === 'focus'
  completedLong  = state.phase === 'longBreak'
  nextCount = completedLong ? 0
            : completedFocus ? state.sessionPomoCount + 1
            : state.sessionPomoCount        // short break: unchanged
```

`getNextPhase` is already correct _given a correct count_ — it checks `(sessionPomoCount + 1) % longBreakInterval === 0`. Because the count will now actually reach `longBreakInterval - 1` at a focus-end, the long-break branch fires. **No change to `getNextPhase`.**

_Alternative considered:_ derive long-break timing from a monotonic total-pomos counter modulo interval. Rejected — more state, and the existing modulo check works once the count is maintained correctly.

### D2 — Reset becomes a single progressive control

One UI control, three states derived from store state (no new persisted field):

```
intervalDirty = elapsed > 0 || isRunning
cycleDirty    = sessionPomoCount > 0 || phase !== 'focus'

intervalDirty            → "Restart"      → restart current interval
!intervalDirty && cycleDirty → "Reset session" → phase=focus, count=0, clock full, stopped
!intervalDirty && !cycleDirty → disabled
```

Implementation: keep `reset()` as the restart-interval action (it already does exactly this). Add a `resetSession()` action that sets `{ phase: 'focus', sessionPomoCount: 0, elapsed: 0, startedAt: null, isRunning: false }`. The component computes which of the two is armed and renders the matching label/tooltip, calling the matching action. Disabled state suppresses the click.

_Alternative considered:_ a confirm dialog before reset-session. Rejected — the progressive model already makes session-reset a deliberate second action (the interval must be clean first), and an interstitial would slow the common restart case.

### D3 — Wire `setPhase` for manual phase switching; keep count untouched

The chip popover calls the existing `setPhase(phase)`, which already does `{ phase, startedAt: null, elapsed: 0, isRunning: false }`. Confirm `setPhase` does **not** touch `sessionPomoCount` (it currently does not) — manual switching changes only what you're doing now, never the cycle count. The count moves solely through `advancePhase` on completion (D1).

_Consequence:_ if a user manually switches to `longBreak` and lets it complete, `advancePhase` sees `state.phase === 'longBreak'` and resets the count to 0 (D1) — consistent with "a long break is a cycle boundary, however reached."

### D4 — Phase identity: ambient tint + chip, task decoupled

- **Tint:** the bar root background takes a faint phase color for break phases only; focus stays the neutral `bg-card`. Implemented as a low-alpha background derived from the existing phase color variables (`--accent`, `--break-color`, `--lbreak-color`) — focus contributes no tint.
- **Chip:** a `FOCUS / SHORT BREAK / LONG BREAK` label shown as a caption directly above the time digits, in the phase color. The caption is the popover trigger for D3 (mirroring the `GroupChip` + `Popover` pattern in `AddTaskRow.tsx`), styled as a plain colored label with a caret rather than a bordered pill so it does not compete with the digits.
- **Task label:** drop the phase label from the task block; render the focused task on its own line (e.g. `Working on …`) with no phase header.

### D5 — Dots stay read-only; add a text label

Keep the dot row (length = `longBreakInterval`, fill = `sessionPomoCount`) as pure display, and add a short text label conveying position (e.g. `2 of 4 · long next`). No click handlers on dots.

### D6 — Drop the bar's `border-t`

Remove `border-t border-border` from the `TimerBar` root. The `bg-card` surface step plus the 2px progress track already separate the bar from content. Header border unchanged.

## Risks / Trade-offs

- **Counter fix changes long-running behavior** → Existing persisted `sessionPomoCount` values rehydrate fine (same field, same range); the only change is the update rule going forward. Add a unit test over a full focus→short→focus→…→long cycle asserting the count progression and that a long break fires at the interval. This is the load-bearing change.
- **Progressive reset can surprise** (same button, two actions) → Mitigated by the visible label/tooltip reflecting the armed action and by the disabled pristine state; the interval must be clean before session-reset is reachable.
- **Manual switch discards interval progress** (resets the clock) → Consistent with existing `skip`/`reset` behavior; the popover (vs. always-visible tabs) guards against accidental activation.
- **Tint contrast** in light mode (very small L-step between `card` and `background`) → keep the tint low-alpha but visible; verify both themes. Pure visual, low risk.

## Open Questions

- Exact tint alpha and chip styling — settle during implementation against both themes; no behavioral impact.
- Label wording for the cycle text (`2 of 4 · long next` vs. alternatives) — copy choice, defer to implementation.
