## Why

The Pomodoro timer is the protagonist of DayBox, but the bottom bar surfaces its state poorly, and one piece of it is outright broken:

- **Phase identity is misplaced.** The current phase (focus / short break / long break) is signaled only by scattered color cues and a tiny label that sits *on top of the focused task name* (`TimerBar.tsx:213-219`). The 30px digits — the most prominent element — carry no phase identity at all. Phase is the *timer's* mode; bolting its label onto the *task* conflates two different concepts.
- **The session counter is broken.** `advancePhase` resets `sessionPomoCount` to `0` every time the timer re-enters the focus phase (`store.ts:107-110`). So the count only ever oscillates `0 ↔ 1`. Two consequences: (a) the session dots never fill past the first, and (b) `getNextPhase` checks `(sessionPomoCount + 1) % longBreakInterval === 0` to decide a long break, but since the count is always `0` at a focus-end, **the long break never fires** — the app is silently stuck in focus → short → focus → short forever.
- **Reset does only one of the two things "reset" means.** `reset()` zeroes the clock for the current phase only (`store.ts:80-85`). There is no action anywhere that returns the timer to "focus #1, count 0" — `setPhase` exists but is unwired and does not touch `sessionPomoCount`.
- **You cannot switch to a specific phase.** Only linear `skip` (next-in-sequence) is wired. The store has a `setPhase` action (`store.ts:124`) but nothing in the UI calls it, so jumping straight to a short or long break is impossible.
- **The top border is redundant.** The bar is already a distinct, lighter surface (`bg-card` vs `bg-background`) and the 2px progress track sits directly under the `border-t`, so the edge has three separators doing one job.

This change reworks the compact bar so phase is unmissable, the cycle counter is correct (and long breaks actually happen), reset is predictable, and the user can jump to any phase — reusing the existing `setPhase` plumbing.

## What Changes

- **Move phase identity onto the timer.** Add a faint, low-saturation **ambient tint** to the whole bar background for break phases (focus stays neutral), plus a **phase chip on the digits** (`FOCUS` / `SHORT BREAK` / `LONG BREAK`). The focused-task label loses its phase header and reads as `Working on …` on its own line.
- **Make the phase chip the phase switcher.** Clicking the chip opens a popover (the existing `GroupChip`/Popover pattern) listing Focus / Short break / Long break; selecting one calls `setPhase`. Manual switching resets the current interval clock and **does not** change `sessionPomoCount`.
- **Fix `sessionPomoCount`.** Redefine it as "focus pomodoros completed since the last long break": increment on focus completion, leave unchanged on short-break completion, reset to `0` only when a **long break** completes (auto or manual). This un-breaks long-break scheduling and makes the dots meaningful.
- **Cycle indicator.** Keep fixed, read-only session dots and add a short text label (e.g. `2 of 4 · long next`).
- **Progressive single reset button.** One control: if the current interval is dirty (`elapsed > 0 || isRunning`) it **restarts the interval**; else if mid-cycle (`sessionPomoCount > 0 || phase ≠ focus`) it **resets the session** (focus #1, count 0); else it is **disabled**. The label/tooltip reflects the armed action ("Restart" / "Reset session").
- **Drop the timer bar's top border** (`border-t`). The header's `border-b` is unchanged.

## Capabilities

### Modified Capabilities

- `pomodoro-timer`: corrects the session-counter / long-break behavior, redefines reset as a progressive single control, adds manual phase switching, and adds phase-identity presentation (tint + chip). Updates the existing "session dots" and "reset" requirements; adds requirements for phase switching and progressive reset.

## Impact

- `src/features/timer/store.ts` — fix `sessionPomoCount` reset semantics in `advancePhase`; add/adjust a reset path that distinguishes restart-interval from reset-session (wire up the existing `setPhase`; ensure `setPhase` leaves `sessionPomoCount` untouched).
- `src/features/timer/components/TimerBar.tsx` — phase chip (+ switcher popover), ambient tint, decoupled task label, fixed/labeled dots, progressive reset button, remove `border-t`.
- `openspec/specs/pomodoro-timer/spec.md` — updated requirements (applied on archive).
- No schema or persistence-shape changes: `sessionPomoCount` already exists in `TimerStateSchema`; only its update rule changes.

## Out of scope

- **Focus mode** (expand the timer to a large ambient view) — captured separately in `add-timer-focus-mode`; this change is its prerequisite.
- A sidebar-vs-bar layout preference toggle — rejected in exploration.
- Any change to the todos / task views, or to the task-level pomo estimate/counter (distinct from the timer's session count).
- Reconsidering the header border.
