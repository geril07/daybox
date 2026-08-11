## Context

Timer duration is always derived in `TimerBar` from `settings.{focus|shortBreak|longBreak}Duration`. Those settings are the user’s permanent defaults (Settings drawer + `timerSettings` save slice). There is no runtime field for “this interval only.”

The bar already has a click-to-menu pattern on the phase chip, and the app already uses `Popover` (e.g. task pomo estimate). Clock digits are currently a non-interactive `<span>`.

Timer runtime state lives in `useTimerStore` under `daybox-timer`, validated by `TimerStateV1Schema` on rehydrate. Settings mutations go through `setTimerSettings` and must not be used for one-shot lengths.

## Goals / Non-Goals

**Goals:**

- One-shot duration for the current interval without changing defaults.
- Click the clock → adjuster (steppers + presets).
- Clear, single source of truth for “how long is this interval.”
- Survive reload mid-interval (override is part of persisted timer state).
- Works for focus, short break, and long break.

**Non-Goals:**

- Changing Settings defaults from the adjuster (“save as default”).
- Editing while the timer is running.
- Second-level precision (`mm:ss` input).
- ±N quick-add while running.
- Task-level or estimate-linked duration.
- Focus-mode / expanded timer UI.
- Changing when a completed focus counts as a pomo (still +1 on complete/skip regardless of length).

## Decisions

### 1. Runtime override field, not settings mutation

**Choice:** Add `intervalDurationMin: number | null` on timer state (null = use phase default).

**Resolution:**

```
defaultFor(phase) = settings focus | shortBreak | longBreak duration
durationMinutes   = intervalDurationMin ?? defaultFor(phase)
durationMs        = durationMinutes * 60 * 1000
remainingMs       = max(0, durationMs - elapsed)
```

**Why not mutate settings:** One-shot must not sticky-change every future interval or export/import defaults.

**Why not a parallel “remaining override”:** Total duration + existing `elapsed` matches current math; fewer edge cases than re-basing elapsed.

### 2. Clear rules

| Event                                    | Override                                      |
| ---------------------------------------- | --------------------------------------------- |
| `advancePhase` (complete or skip)        | → `null`                                      |
| `setPhase`                               | → `null`                                      |
| `resetSession`                           | → `null`                                      |
| `reset` (restart current interval clock) | **keep**                                      |
| `setIntervalDurationMin`                 | set / clear                                   |
| Settings default change                  | unchanged (override still wins until cleared) |

**Rationale:** Restart means “same interval again”; phase/session change means a new interval.

### 3. When the adjuster can open and apply

- **Open:** only when `!isRunning` (idle or paused).
- **While running:** clock is not a popover trigger (or trigger is disabled); no mid-run apply in v1.
- **Apply while paused with `elapsed > 0`:** sets **total** duration in minutes. If `minutes * 60_000 <= elapsed`, reject the value (do not complete the interval as a side effect of picking a short duration). UI should disable presets/stepper values that would be ≤ elapsed.

**Alternative considered:** idle-only (`elapsed === 0`). Rejected — paused “I meant 40 not 25” is a real case and is safe if we reject impossible shorts.

### 4. Bounds

- Integer minutes only.
- Min: `1`, except when `elapsed > 0` the effective min is `ceil(elapsed / 60000)` (at least 1 minute of remaining after apply is not required — only that total > elapsed; if elapsed is 10.2 min, min total is 11).
- Max: match phase schema caps — focus `180`, short break `60`, long break `120`.
- Setting the value equal to the phase default MAY either store that number or clear to `null`; prefer **clear to `null`** when equal to default so “custom” cue stays accurate and state stays minimal.

### 5. UI: popover on the clock

- Trigger: the MM:SS digits (button semantics, `aria-label` e.g. “Adjust interval duration”).
- Content: short label (“This interval only”), −5/−1 value +1/+5, presets `15 · 25 · 45 · 50` (and phase-appropriate filtering if over max), optional “Use default” when override is active.
- Show current default in helper text: `Default is 25`.
- Use existing `Popover` from `@/shared/ui` (same family as task pomo popover).
- **Custom cue:** when override is active, digits (or a tiny caption) indicate non-default — e.g. slightly different color and/or `aria` description “custom duration”. Keep subtle; bar is dense.

**Alternative considered:** inline contenteditable digits. Deferred — harder validation/a11y; presets fit popover better.

**Alternative considered:** put duration under phase chip menu. Valid, but user asked for click-on-timer; clock is the stronger mapping to “how long.”

### 6. Schema / persistence

- Extend `TimerStateV1Schema` with  
  `intervalDurationMin: z.number().int().min(1).max(180).nullable().default(null)`  
  (max 180 is the schema ceiling; apply-time still clamps to phase max).
- No new save-slice version: field is runtime timer state under `daybox-timer`, not the exported `timerSettings` slice. Export/import of settings unchanged.
- Missing key on old clients: zod `.default(null)` + keep `afterValidate` resilient if needed.
- `timerInit` / `DEFAULT` path: `intervalDurationMin: null`.

### 7. Store API

```
setIntervalDurationMin(minutes: number | null): void
```

- Validates bounds for current phase; no-op + warn on invalid (same style as `setTimerSettings`).
- Does not change `elapsed`, `isRunning`, or `phase`.
- Does not call `setTimerSettings`.

Optional pure helper (testable, used by bar + store validation):

```
resolveIntervalDurationMin(phase, settings, intervalDurationMin) => number
```

### 8. Completion / pomo counting

Unchanged: finishing or skipping a focus still increments `pomoCompleted` and advances `sessionPomoCount` regardless of override length. Documented so implementers do not special-case short customs.

## Risks / Trade-offs

| Risk                                          | Mitigation                                                |
| --------------------------------------------- | --------------------------------------------------------- |
| Accidental open while glancing at clock       | Only when paused/idle; running = no open                  |
| Apply shorter than elapsed → instant complete | Reject values with `minutes * 60k <= elapsed`             |
| Stale override after phase change             | Clear inside `advancePhase` / `setPhase` / `resetSession` |
| Custom cue too loud / too quiet               | Subtle digit treatment; iterate in UI                     |
| Schema max 180 vs phase max 60/120            | Apply-time phase clamp in setter                          |
| Future focus-mode also wants digit click      | Adjuster is a component; focus-mode can reuse later       |
| User confuses one-shot with Settings          | Copy: “This interval only” + default line                 |

## Migration Plan

- Additive field with default `null`.
- No data migration script.
- Rollback: remove field from UI/store; old clients ignore unknown keys on write, new clients default null on read if rolled back carefully — standard forward-compatible localStorage field.

## Open Questions

None blocking. Deferred product ideas (not this change):

- ±5 while running.
- “Save as my default” in the popover.
- Second-level input.
