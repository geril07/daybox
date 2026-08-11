## Why

Default pomodoro lengths live in Settings and apply to every interval. Users often need a different length for _this_ interval only (a quick 15, a deep 50) without changing their permanent defaults. Today the only way is to edit Settings (and remember to change it back), which is the wrong tool for a one-shot tweak. The clock digits are the natural affordance.

## What Changes

- Add a **per-interval duration override** on timer runtime state: minutes for the _current_ interval only, independent of `settings.*Duration`.
- Clicking the timer clock opens a small adjuster UI (popover) to set that override via steppers and presets.
- Duration resolution becomes `override ?? defaultFor(phase)`; remaining time and progress use the resolved duration.
- Override clears automatically when the interval ends or the phase changes; it never writes into Settings defaults.
- Visual cue when the current interval is not using the default length.
- Adjuster is available when the interval is idle or paused; blocked while running (avoids mid-flight end-time surprises in v1).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `pomodoro-timer`: one-shot interval duration override, clock click affordance, clear rules, and display of custom vs default duration.

## Impact

- `src/modules/timer/store.ts` — new `intervalDurationMin` (or equivalent) state + setter; clear on `advancePhase` / `setPhase` / `resetSession`.
- `src/modules/timer/schema/` — persist field on timer state schema (same `daybox-timer` key).
- `src/modules/timer/components/TimerBar.tsx` — clickable clock, duration resolution, custom cue.
- New small adjuster component under `src/modules/timer/components/`.
- Tests: store clear rules, duration resolution, TimerBar interaction.
- No Settings panel changes; defaults remain the only place that mutates `focusDuration` / break durations.
- Out of scope: ±N while running, `mm:ss` precision, “save as default”, task-level duration, focus-mode large picker.
