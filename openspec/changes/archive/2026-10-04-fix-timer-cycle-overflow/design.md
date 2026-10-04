## Context

`sessionPomoCount` records focus intervals completed or skipped since the last completed or skipped long break. Manual phase selection preserves this count, and settings changes preserve runtime state. These rules allow a count above `longBreakInterval`, but phase scheduling currently uses modulo while the timer-bar hint uses a threshold.

## Goals / Non-Goals

**Goals:** Preserve completed history and existing timer-bar text/layout while scheduling overdue long breaks consistently with the "long next" hint.

**Non-Goals:** Change manual phase-selection semantics, task counts, reset behavior, persistence validation, timer durations, or layout.

## Decisions

### Treat the long-break interval as a threshold

After focus ends, select a long break when the incremented completed count is greater than or equal to `longBreakInterval`. The existing timer-bar "long next" hint already uses this threshold; align the scheduler with it without changing the UI. The hint describes the next scheduled break after focus, including while a short break is current.

Keeping modulo would defer an already-due break until another multiple. Resetting the count on manual phase changes would discard history and change explicitly specified behavior.

### Preserve excess counts and the existing presentation

Keep `N of M · long next` even when N exceeds M: N is the completed count and M is the long-break target, not an upper bound. Keep the fixed dots filled and the existing `long break` label during a long break. Do not introduce the longer `N completed` label or change layout.

Clamping or applying modulo to the stored or displayed count would hide completed focus intervals. Changing the text is unnecessary for the scheduling fix and would expand the label. Existing persisted excess counts remain valid and recover through the next completed or skipped long break without migration.

## Risks / Trade-offs

- Users can still defer long breaks repeatedly through manual phase selection → Preserve that control deliberately and display the completed count honestly; each subsequent focus still schedules a long break.

## Migration Plan

No migration is required. Existing stored counts are read unchanged. Reverting the fix restores modulo-based scheduling without changing data or UI.

## Open Questions

None for this scope.
