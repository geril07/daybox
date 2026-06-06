## Why

The This Week view hides any day that has no tasks (`if (dayTasks.length === 0) return null`), which collapses the week and destroys its shape — gaps are invisible and the dates jump around unpredictably, so the view fails at its one job: helping you understand what your week looks like. It also shows no overdue tasks (an awareness hole) and renders day headers in a different style and color token (`text-fg-2`) than the Today view's section labels (`text-muted-foreground`), so the labels visibly don't match across views.

## What Changes

- Rework This Week as an ordered list of titled **sections** (each = label + optional tone + tasks), rendered through a single shared section-header primitive instead of hand-rolled per-day markup.
- Add an **Overdue** section at the top of This Week (incomplete tasks dated before today), shown only when non-empty. **BREAKING** spec change: previously Week surfaced no overdue tasks.
- Show one section **per day from today through the end of the week**, dropping already-passed days of the calendar week (their incomplete tasks already surface under Overdue; empty past days are noise).
- Label today's section "Today" and tomorrow's "Tomorrow" (relative words); all later days use a plain date label (e.g. `THU · JUN 11`). Retire the `[TODAY]` badge pill.
- **Empty future days still render** their header plus a quiet muted "nothing planned" line, so the week's skeleton is always visible.
- Standardize This Week's section headers on the Today view's label style and the `muted-foreground` token vocabulary (uppercase, `tracking-widest`).
- Introduce a reusable section-header primitive in the planner feature, designed so the other views can adopt it later (out of scope here).

## Capabilities

### New Capabilities

<!-- None. The shared section-header component is an internal implementation detail captured in design.md, not spec-level behavior. -->

### Modified Capabilities

- `time-views`: The "This Week view" requirement changes from a flat Mon–Sun day grouping (empty days hidden) to an ordered section model — an Overdue section, then today-through-end-of-week day sections with relative Today/Tomorrow labels, with empty future days kept visible. The Week empty-state condition is restated in terms of "no overdue and no tasks today→end of week."

## Impact

- **Code**: `src/features/planner/components/WeekView.tsx` (rewritten to the section model), `src/features/planner/queries.ts` (a week-sections selector reusing `selectOverdue`, `getWeekDays`, `weekStartDay`), and a new shared section-header component under `src/features/planner` (or `src/shared/ui`).
- **Tokens**: This Week headers move from `text-fg-2` to the `muted-foreground` vocabulary. Global token-vocabulary cleanup across the app is out of scope.
- **No data/store changes**: reuses existing task selectors and the planner store's `weekStartDay`.
- **Follow-ups (out of scope)**: converging Today/Tomorrow/Backlog/DateBrowser onto the shared section primitive; the orphaned `date` view with no UI entry point; the `App.defaultDate` duplication of `viewToRange`.
