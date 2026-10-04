## Context

`sessionPomoCount` records focus intervals completed or skipped since the last completed or skipped long break. Manual phase selection preserves this count, and settings changes preserve runtime state. These rules allow a count above `longBreakInterval`, but phase scheduling currently uses modulo while the timer-bar hint uses a threshold.

## Goals / Non-Goals

**Goals:** Keep the completed count truthful, schedule overdue long breaks consistently, and display excess progress without an impossible fraction.

**Non-Goals:** Change manual phase-selection semantics, task counts, reset behavior, persistence validation, timer durations, or layout.

## Decisions

### Treat the long-break interval as a threshold

After focus ends, select a long break when the incremented completed count is greater than or equal to `longBreakInterval`. Reuse `getNextPhase` for the timer-bar next-break hint so display and scheduling cannot diverge. The hint describes the next scheduled break after focus, including while a short break is current.

Keeping modulo would defer an already-due break until another multiple. Resetting the count on manual phase changes would discard history and change explicitly specified behavior.

### Preserve excess counts and change their presentation

Keep `N of M` for counts at or below the configured interval. Above it, show `N completed`; append ` · long next` according to the shared scheduling rule. Keep the fixed dots filled and the existing `long break` label during a long break.

Clamping or applying modulo to the stored or displayed count would hide completed focus intervals. Existing persisted excess counts remain valid and recover through the next completed or skipped long break without migration.

## Risks / Trade-offs

- Users can still defer long breaks repeatedly through manual phase selection → Preserve that control deliberately and display the completed count honestly; each subsequent focus still schedules a long break.
- Excess-count text is longer than a normal cycle fraction → Verify desktop and narrow timer layouts; keep existing responsive text hiding.

## Migration Plan

No migration is required. Existing stored counts are read unchanged. Reverting the fix restores the old scheduling and label behavior without changing data.

## Open Questions

None for this scope.
