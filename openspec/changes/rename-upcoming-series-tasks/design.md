## Context

Generated tasks retain `seriesId` and independent `date` and `occurrenceDate` fields. Series updates currently validate and replace only the series record. Settings commits titles on blur or Enter.

## Goals / Non-Goals

**Goals:** Rename matching upcoming unfinished tasks atomically with their series; respect the configured planner day boundary.

**Non-Goals:** Bulk changes to other fields, prompts, notifications, historical cleanup, schema changes, or explicit override tracking.

## Decisions

- Extend `updateSeries` rather than introduce a separate UI action, so every caller gets the same semantics. Validate before changing either series or tasks.
- Compare task titles exactly against the old series title and apply the validated new title. Explicit override tracking is unnecessary for the accepted edge cases.
- Use `getPlannerDate` with the planner preference read through its public barrel. Calendar midnight would disagree with the app's configured day start.
- Use the task's current scheduled `date`, not `occurrenceDate`, to define upcoming. Rescheduling should affect whether the task is upcoming. Unscheduled tasks are excluded.
- Preserve every task field except title and leave non-title series updates generation-only.

## Risks / Trade-offs

- Older stale titles do not match; manually edited titles equal to the old series title do match → accepted by the user, with no attempt to infer edit history.
- Tasks moved to Later have no scheduled date → leave unchanged rather than assume they are upcoming.
- Planner barrel imports already exist in tasks components → follow that convention and check full-suite execution for import-cycle regressions.
