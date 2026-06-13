## Why

The Pomodoro timer is the protagonist of DayBox, but it lives in a compact bottom bar that is intentionally unobtrusive. During an actual focus session some users want the opposite: the timer to fill the screen, become ambient, and remove everything else from view. Today there is no way to "lock in" — the timer is always the same small strip whether you are glancing at it or deep in a 25-minute block.

This change adds an **expand-to-focus-mode** affordance: the same timer state rendered at two sizes, switched by user intent rather than a persisted layout preference. The compact bar stays the default; an expand control blows the timer up into a large, ambient panel/overlay that collapses back when the session ends or the user dismisses it.

**This is parked for later.** It is captured now so the idea is not lost while we redesign the compact bar (phase clarity, fixed session dots, progressive reset). Focus mode builds on that redesign — it is the "big" rendering of the same corrected state model, so it should land after the bar redesign.

## What Changes

- **Add a focus-mode view** that renders the existing timer state (phase, remaining time, controls, session progress, focused task) at a large, ambient scale.
- **Add an expand control** to the compact timer bar that enters focus mode, and a collapse/dismiss affordance (button + `Escape`) that returns to the compact bar.
- **Carry phase identity into focus mode** — the ambient phase tint and phase chip from the bar redesign scale up here (the whole surface takes the phase color).
- **Reuse the same controls and state** — play/pause, the progressive reset, skip, and session dots all operate on `useTimerStore`; focus mode is a presentation layer, not a second timer.
- Focus mode is a transient UI **state**, not a saved layout setting. It is not persisted as a user preference (open question: whether it should survive reload mid-session — see design when picked up).

## Capabilities

### Modified Capabilities

- `pomodoro-timer`: add a focus-mode presentation of the existing timer. New requirement covering the expand/collapse affordance and that focus mode shares one timer state with the compact bar.

## Impact

- `src/modules/timer/components/` — new focus-mode component; the compact `TimerBar` gains an expand trigger.
- No data, schema, or persistence changes expected (pending the "survive reload" decision).
- Depends on the compact-bar redesign (phase tint, fixed `sessionPomoCount`, progressive reset) landing first, since focus mode renders that same corrected state.

## Out of scope

- The compact-bar redesign itself (phase tint, fixed session dots, progressive single reset) — separate change.
- A sidebar vs. bar layout preference toggle — explicitly rejected in exploration in favor of intent-driven expand/collapse.
- Any change to the todos / task views.
