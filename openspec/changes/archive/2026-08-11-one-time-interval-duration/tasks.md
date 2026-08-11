## 1. State and schema

- [x] 1.1 Add `intervalDurationMin: number | null` to timer state, `timerInit`, and `TimerStateV1Schema` (nullable, default `null`, int 1–180)
- [x] 1.2 Add pure helper `resolveIntervalDurationMin(phase, settings, override)` (and phase max helper if useful)
- [x] 1.3 Add `setIntervalDurationMin(minutes: number | null)` — validate phase bounds, reject when `minutes * 60_000 <= elapsed`, clear to `null` when value equals phase default
- [x] 1.4 Clear override to `null` inside `advancePhase`, `setPhase`, and `resetSession`; leave it untouched in `reset`
- [x] 1.5 Store unit tests: set/clear, reject invalid/elapsed, clear on advance/setPhase/resetSession, keep on reset, resolve helper

## 2. Duration adjuster UI

- [x] 2.1 Add `IntervalDurationPopover` (or equivalent) using shared `Popover`: steppers ±1/±5, presets 15/25/45/50 (filtered by phase max), “this interval only” + default label, use-default control when override active
- [x] 2.2 Disable preset/stepper values that fail the elapsed guard while paused
- [x] 2.3 Wire trigger to clock digits in `TimerBar` only when `!isRunning`; button semantics + accessible name
- [x] 2.4 Resolve duration in `TimerBar` via override ?? phase default; keep remaining/progress math
- [x] 2.5 Custom-duration visual cue on the clock when override is non-null
- [x] 2.6 Component tests: open idle/paused, blocked while running, preset applies, default clears, cue present/absent

## 3. Verification

- [x] 3.1 Run format, typecheck, lint, and timer-related tests
- [x] 3.2 Manual smoke: set one-shot focus, complete interval → next uses default; restart keeps override; reload keeps override; settings defaults unchanged
