## Context

The pomodoro estimate and completed counts on a task are bound to `[0, 9]` in two places:

- `src/features/tasks/schema.ts:12-13` — the zod schema used for runtime validation of every task in the store and on import.
- `src/features/tasks/components/TaskRow.tsx:225` — the `NumberInput` that lets the user set `pomoEstimate` in the planner popover.

`pomoCompleted`'s `NumberInput` is bounded to `[0, task.pomoEstimate]`, so removing the 9 cap on the estimate field automatically extends the upper limit on the completed field too. The "lowering estimate clamps completed" branch in `TaskRow.tsx:182-188` is general and already handles any positive integer. The `X/Y` text and the progress bar are also unbounded.

The schema and the editor are the only two sites that need to change. There is no new UI surface, no new store action, no new selector, and no new event.

## Goals / Non-Goals

**Goals:**

- Allow tasks to be planned with up to 99 pomodoros.
- Keep all existing invariants: integer, non-negative, `pomoCompleted <= pomoEstimate`, clamp on lower.
- Keep the existing UX (single popover, two `NumberInput`s, same width, same disabled-at-boundary behavior).

**Non-Goals:**

- Removing the cap entirely (e.g., 999) — 99 is enough to plan a full day of focused work and keeps the input visually clean.
- A multi-digit or quick-set UX for large estimates.
- Migrating tasks already at `pomoEstimate = 9` — they remain valid and require no change.
- Changes to the pomodoro timer's per-pomodoro duration or to group rules.

## Decisions

- **Bound is 99, not unbounded.** The 9→99 jump is the smallest change that unblocks realistic planning. Going higher (e.g., 999) would either require widening the 7-char `NumberField.Input` (`w-11`) or introducing a different input, neither of which this change needs.
- **Update the zod schema, not just the editor.** Both the schema and the editor must agree, otherwise importing a task with `pomoEstimate = 12` from a backup (a supported flow under `data-portability`) would be rejected at the schema layer even though the editor would render it.
- **Do not introduce a new constant.** A magic number `99` in two files is fine; the value is small and is documented in the modified spec. Promoting it to a shared constant would add an indirection without buying reuse today.
- **`pomoCompleted` reuses `task.pomoEstimate` as its max.** This was already the case before the change and continues to work — the completed `NumberInput` does not need its own constant. Once the estimate max is 99, the completed max follows for any task where `pomoEstimate <= 99`.

## Risks / Trade-offs

- [Existing tasks at `pomoEstimate = 9` keep working] → No migration; the new bound is a superset of the old one. Confirmed: `0..9 ⊂ 0..99`.
- [Imported data with `pomoEstimate > 9` would have been rejected before] → Now accepted. This is the intended behavior change, surfaced through the schema and the modified spec.
- [Progress bar still renders `pomoCompleted / pomoEstimate * 100`] → Already capped by `Math.min(100, ...)` in `TaskRow.tsx:196`, so widening the cap has no effect on the bar's appearance.
- [Tests asserting the old 9 cap] → Touched in this change; no test relies on `max=9` as a behavioral guarantee.

## Migration Plan

No data migration. The change is forward-compatible:

1. Update schema and editor in the same commit.
2. Existing localStorage payloads validate against the new schema unchanged.
3. Rollback is the inverse: restore `max(9)`. Tasks with `pomoEstimate > 9` created during the rollout would then fail validation on next load — acceptable for a quick rollback of a small change.
