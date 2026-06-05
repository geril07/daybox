## Context

`TaskRow` (in `src/features/tasks/components/TaskRow.tsx`) renders a small "pomo area" on every task row that combines display and editor. The current implementation has two problems:

1. **Display is lossy.** The trigger renders `pomoEstimate` small dots, with `pomoCompleted` indicated by filled vs outlined dots. A user has to count dots to know `2/5`, and the fallback when `pomoEstimate === 0` is a literal text `"0"` — visually inconsistent with the dot case. There's no surface for "how much of the estimate is left".
2. **Editor is incomplete and busy.** The popover shows a 3×3 grid of `0`–`9` pill buttons that sets `pomoEstimate` only. `pomoCompleted` is read-only from the UI — the timer in `features/timer` is the only writer. The grid is visually heavy and caps the user at `9`, which they may need to bump past for long-running tasks.

The data model already enforces `pomoCompleted <= pomoEstimate` via a Zod `.refine` on `TaskSchema`, and `useTaskStore.updateTask` accepts partial patches for both fields. The primitives needed for a new editor (`NumberInput`) already live in `src/shared/ui/` and are used by `TimerSettingsPanel`. No new shared UI is required.

## Goals / Non-Goals

**Goals:**

- Replace the dot visualization with an `X/Y` text label and a thin progress bar.
- Replace the popover's pill grid with two `NumberInput`s (estimate, completed).
- Make `pomoCompleted` editable from the UI; keep the timer's auto-increment behavior intact.
- Enforce the `pomoCompleted <= pomoEstimate` invariant at the UI level: `+` is disabled at the boundary, and reducing estimate below completed clamps completed in the same store call.
- Animate the progress bar smoothly on any change to either field, including the timer's auto-increment.
- Cover the new behavior in `TaskRow.test.tsx`.

**Non-Goals:**

- Auto-completing the task (`task.completed = true`) when `pomoCompleted === pomoEstimate`. The checkbox remains the only path to marking a task done.
- Changing the date display, the hidden-actions discoverability, or any other row chrome.
- Adding presets or quick-set buttons in the popover.
- Adding a new shared UI primitive; `NumberInput` is reused.
- Persisting any new field or migrating existing data (none needed).

## Decisions

### 1. Display format: `X/Y` + thin progress bar

- **Choice:** Plain `2/5` text, plus a 1.5px-tall progress bar directly below the number, accent fill on a transparent track. Bar width is computed as a CSS percentage of the number's text width (e.g. `width: 40%` for `2/5`), not the full row width.
- **Rationale:** Matches existing row tightness. The bar is a single new visual element and stays compact. Screen readers read "two of five" rather than three meaningless bullets.
- **Alternatives considered:**
  - "X of Y" (verbose, breaks the row).
  - `🍅 X/Y` (icon noise; no other row element pairs icon + number).
  - Full-row-width bar (competes with the title for visual weight).

### 2. Popover content: two `NumberInput`s, no presets, inline as two columns

- **Choice:** Place a labelled `NumberInput` for `pomoEstimate` and one for `pomoCompleted` side by side as two equal columns (flex-row, `min-w-[100px]` per column, `gap-3`, `p-3`). Popover content width is `w-fit` so the popover hugs its content rather than the default 288px. No row of preset pills, no other chrome.
- **Rationale:** Two columns use the popover width meaningfully and read as the natural `X / Y` pair the trigger already shows. `min-w-[100px]` enforces equal column widths regardless of label length. `gap-3` (12px) matches the `p-3` (12px) padding so the visual spacing from the popover edge to the content is symmetric (12px on each side and 12px between columns). Presets don't generalize to `pomoCompleted`, and a single row of presets under one of the inputs reads unbalanced.
- **Alternatives considered:**
  - Stacked vertically in a wide popover — rejected: leaves 230px of empty space next to a 58px input, which feels like a bug.
  - Stacked vertically in a narrow popover (`w-fit` + stacked) — rejected: still vertical, more visual height per popover, doesn't match the `X / Y` mental model.
  - Presets under estimate only — rejected: asymmetric, took more space.
  - Single combined `NumberInput` for total — rejected: loses the semantic split between plan and record.

### 3. Clamping: single `updateTask` patch

- **Choice:** When the user drops `pomoEstimate` below the current `pomoCompleted`, the popover handler builds a single patch `{ pomoEstimate: n, pomoCompleted: n }` and calls `updateTask(task.id, patch)` once.
- **Rationale:** One store write, no intermediate flicker, atomic from the UI's perspective. The Zod `.refine` is the last line of defense if a bug ever sends an inconsistent pair.
- **Alternatives considered:**
  - Refuse the change with an inline message (annoying; the invariant is invisible to the user most of the time).
  - Two separate `updateTask` calls (race risk; the second call could be applied in isolation by another subscriber).

### 4. Completed input's `max` is the row's current `pomoEstimate`

- **Choice:** The `NumberInput` for completed receives `max={task.pomoEstimate}` (not the schema max `9`). This makes `+` disabled at the current estimate.
- **Rationale:** Honors the invariant at the UI level so the user can't push completed past estimate via the editor. `−` is disabled at `0`.
- **Alternative considered:** Static `max={9}` (the user could click `+` past the current estimate; the schema would reject it, leaving a confusing no-op).

### 5. Popover trigger = whole `X/Y + bar` area

- **Choice:** The single span containing `2/5` text and the bar is the `PopoverTrigger`. The bar is purely visual, but clicking it still opens the popover because the parent is the trigger.
- **Rationale:** Matches the current behavior (the whole dot region opens the popover). Avoids shrinking the click target.

### 6. Bar animation: CSS only

- **Choice:** A CSS `transition: width 200ms ease-out` on the bar's inner element. No JS-driven animation, no Motion library. The bar's width is derived from `pomoCompleted / pomoEstimate` and re-renders when the store changes.
- **Rationale:** Triggers automatically on the timer's auto-increment, on user edits, and on initial rehydrate (subject to `prefers-reduced-motion`, which the row's existing CSS would respect via `@media (prefers-reduced-motion: reduce)`).
- **Alternative considered:** Motion library (overkill; CSS handles a single-axis width tween cleanly).

### 7. `NumberInput` disabled state at boundaries

- **Choice:** Rely on `@base-ui/react`'s `NumberField` to disable `Increment`/`Decrement` at min/max. Confirmed by source review of `@base-ui/react@1.5.0`: `NumberField.Increment` computes `isMax = value >= maxWithDefault` and `NumberField.Decrement` computes `isMin = value <= minWithDefault`, each setting `disabled = ... || isMax|isMin` and forwarding a `data-disabled` attribute via `stateAttributesMapping`. The current wrapper at `src/shared/ui/number-input.tsx` does not style `data-disabled`, so the button is functionally dead at the boundary but visually identical to enabled. Add a `data-disabled:opacity-40` (or equivalent) pass-through to the Increment/Decrement className in the wrapper.
- **Rationale:** Source-level proof removes any fallback path. The wrapper change is two lines and unblocks both the visual feedback and the scenario tests that assert disabled state. As a side benefit, the existing `TimerSettingsPanel` consumer (which uses the same `NumberInput` for focus duration, short break, long break, etc.) gets the visual fix for free.
- **Alternatives considered:**
  - Add a `disabled` boolean prop to the wrapper for explicit opt-in per consumer — rejected because base-ui already gives us the right behavior; the wrapper just needs to render it.
  - Re-implement bounds in the consumer — rejected because it duplicates logic that the primitive already owns.

### 8. Null-guard `onValueChange` handlers

- **Choice:** The `NumberField` `onValueChange` callback receives `value: number | null`. The `null` case fires on `eventDetails.reason === 'input-clear'` (user selects all + delete) and on `'input-blur'` when the typed value is unparseable. Both popover handlers guard with `if (v == null) return;` and do not call `updateTask` in that case.
- **Rationale:** `Task.pomoEstimate` and `Task.pomoCompleted` are typed `number` in `TaskSchema`; `Partial<Task>` patches cannot legally contain `null`. The handler is the right place to enforce the contract; widening the type would leak an edge case into every consumer. A no-op preserves the user's prior value and lets the input visually revert (the base-ui input falls back to the last valid value on blur).
- **Alternatives considered:**
  - Treat `null` as `0` — rejected because a user mid-edit (typing) can produce a transient `null`, and silently setting the field to `0` is destructive.
  - Widen `Task` to allow `pomoEstimate: number | null` — rejected because it pushes the "missing" state into the data model without a use case.

## Risks / Trade-offs

- **Progress bar adds vertical space inside the row.** A 1.5px bar with 1px padding adds ~3px inside a row whose `min-h` is already `46px`. → Mitigation: keep the bar tightly bound to the number's text width; no extra padding on the trigger.
- **Manual `pomoCompleted` edits can desync with the timer's mental model.** If a user lowers completed, the timer will simply resume from there, which is correct. If a user raises completed, they're effectively marking pomo work as done out-of-band — by design, since they asked for editable completed. → No mitigation needed; behavior is intentional.
- **Visual disabled state is missing in the current `NumberInput` wrapper.** Confirmed by source review that base-ui auto-disables at the boundary, but the wrapper does not style the disabled appearance — so the UX is broken for every consumer, not just this one. → Mitigation: scoped wrapper change (two lines, `data-disabled:opacity-40`) in the same PR. Covered by the scenario test for disabled state.
- **Removing the 3×3 pill grid is a visual regression for users who liked one-tap selection.** NumberInput is faster for `>= 3` and the only sane path past `9`, but one-tap-to-set is gone. → Mitigation: `+`/`-` cycles are still one-tap; for an estimate jump from `0` to `4` the user types or clicks `+` four times, which is comparable to the old "click pill 4" interaction.

## Migration Plan

None. Existing tasks render correctly under the new display: `0/0` is a valid `X/Y`, the bar is `0%` width. No localStorage key changes, no schema changes, no data backfill.

## Open Questions

None. All design decisions resolved during exploration.
