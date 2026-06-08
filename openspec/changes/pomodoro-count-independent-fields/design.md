## Context

The two `pomoCompleted` / `pomoEstimate` fields currently look like a constrained pair: a `.refine` in the zod schema (`src/features/tasks/schema.ts:19-21`) rejects any task where `pomoCompleted > pomoEstimate`, and the editor (`src/features/tasks/components/TaskRow.tsx:182-188, 236`) reinforces the same bound at the input layer by clamping the completed `NumberInput` to `max={task.pomoEstimate}` and clamping completed down to the new estimate when the user lowers it.

The timer (`src/features/timer/components/TimerBar.tsx:88-90, 145-147`) is the only non-user path that writes `pomoCompleted`, and it does an unguarded `+1` on every focus completion (and on every skip). That is the only correct behavior a counter can have, but it is incompatible with the schema refine. The result, in practice, is that the invariant `pomoCompleted <= pomoEstimate` is sometimes violated by normal use, and downstream UI (progress bar, `X/Y` text, `+`/`−` controls) then behaves unpredictably.

The fix is to remove the constraint. Both fields keep their existing integer + non-negative + max-99 shape. The timer's `+1` becomes a true statement about the system. The editor's completed input becomes a normal number field bounded by the global cap, not by a sibling field.

The "what changes" surface is four lines across two files (schema, `TaskRow`) plus tests. No store, group, persistence, import, migration, or settings changes.

## Goals / Non-Goals

**Goals:**

- `pomoCompleted` and `pomoEstimate` are independent. Neither field's value constrains the other.
- The timer's existing `+1` behavior is preserved unchanged.
- The editor's completed `NumberInput` is bounded to `[0, 99]`, independent of `pomoEstimate`.
- Lowering `pomoEstimate` only writes `pomoEstimate` — no auto-write of `pomoCompleted`.
- Existing tasks in localStorage validate against the new schema (the `.refine` is removed, not replaced).

**Non-Goals:**

- Auto-bumping `pomoEstimate` to match `pomoCompleted` (would re-introduce the kind of unpredictable estimate change the user wants to avoid).
- Healing / clamping existing tasks where `pomoCompleted > pomoEstimate` already holds.
- A different display for "completed > estimate" — the `X/Y` text and the progress bar render as-is, with the progress bar's existing `Math.min(100, …)` keeping the bar visually capped.
- Changing the timer's per-pomodoro duration or the group rules.
- Changing the global `99` cap (covered by the in-flight `planner-task-pomodoro-count-limit` change).

## Decisions

- **Drop the `.refine`, don't replace it.** The contract `pomoCompleted <= pomoEstimate` is unkeepable by the timer. Replacing it with a softer rule (e.g. "completed is allowed to exceed estimate by at most N") would re-introduce magic and re-introduce the surprise-rewrite the user is trying to avoid.
- **Bound completed input by 99, not by `pomoEstimate`.** The completed field is a count of work done; the global cap is the only thing that meaningfully bounds it. Using `pomoEstimate` as the bound silently creates a "completed can't exceed plan" rule at the input layer, which is the same constraint we just dropped from the schema.
- **Do not auto-bump `pomoEstimate` when the timer completes past it.** The user explicitly rejected this in the design discussion. The estimate stays a planning field the user updates deliberately.
- **Do not heal legacy state.** If a task has `pomoCompleted > pomoEstimate` from a prior session (timer bug, manual import, hand-edited localStorage), it stays as-is. The `X/Y` text shows the actual values; the progress bar caps at 100% via `Math.min(100, …)` (`TaskRow.tsx:196`).
- **Do not touch the timer's increment.** It is already correct under the new contract. A test is added to lock the behavior in.

## Risks / Trade-offs

- [Tasks with `pomoCompleted > pomoEstimate` become "normal"] → The `X/Y` text shows the actual values (e.g. `5/3`). The progress bar visually caps at 100% via `Math.min(100, …)` at `TaskRow.tsx:196`, so the bar is not visibly wrong. The `+`/`−` controls on the completed `NumberInput` now disable at `[0, 99]` instead of `[0, pomoEstimate]`, so the `+` is no longer disabled at the estimate boundary. This is a deliberate, spec-documented behavior change.
- [Lowering the estimate used to also lower completed] → The user explicitly asked to drop this. The new behavior is "lower the plan, completed stays." Users who want to "reset" completed now do it explicitly in the completed field.
- [Imported payloads with `pomoCompleted > pomoEstimate` were rejected before] → Now accepted. This is the intended behavior change.
- [Schema loses a defensive check] → True. The defensive check was lying about what the system actually maintained. Removing it is honest. The two `int().min(0).max(99)` checks still defend against bad imports of type or magnitude.

## Migration Plan

No data migration. The change is forward-compatible:

1. Remove the `.refine`, change the completed `NumberInput max`, drop the clamp branch — all in the same commit.
2. Existing localStorage payloads (including any with `pomoCompleted > pomoEstimate` from the timer bug) validate against the new schema unchanged.
3. Rollback is the inverse: restore the `.refine`, restore the `max={task.pomoEstimate}` and the clamp branch. Tasks with `pomoCompleted > pomoEstimate` created during the rollout would then fail validation on next load — acceptable for a quick rollback of a small change.
