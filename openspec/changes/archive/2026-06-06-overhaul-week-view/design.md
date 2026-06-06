## Context

The planner feature has five views (`today`, `tomorrow`, `week`, `backlog`, `date`) rendered by three hand-rolled components — `DayView`, `WeekView`, `DateBrowser` — that each re-implement their own "section header + TaskList" markup. This duplication is why the labels have drifted: the Today view uses `text-muted-foreground` (uppercase, `tracking-widest`), while `WeekView` uses `text-fg-2` per-day headers plus a `[TODAY]` badge, and the Tomorrow/Backlog views render no header at all.

The deeper structural observation is that **every view is the same shape**: an ordered list of titled sections, each being a header plus a `TaskList`. They differ only in which sections exist and how each section's tasks are selected. This change captures that insight for the Week view and introduces the shared primitive, without yet migrating the other views.

Current `WeekView` selects `getWeekDays(weekStartDay)` and renders each day that has tasks, hiding empty days (`if (dayTasks.length === 0) return null`) and surfacing no overdue tasks. Task selectors already exist in `@/features/tasks`: `selectForDate`, `selectOverdue`, `selectInRange`, `selectUndated`.

## Goals / Non-Goals

**Goals:**
- Make the Week view render an ordered `Section[]` (Overdue, then today→end-of-week days) through one shared section-header component.
- Keep the week's shape visible: empty future days still render with a muted placeholder.
- Surface overdue tasks in the Week view.
- Standardize Week headers on the Today view's label style and the `muted-foreground` token vocabulary.
- Design the section primitive so the other views can adopt it later.

**Non-Goals:**
- Migrating Today / Tomorrow / Backlog / DateBrowser onto the shared primitive (follow-up).
- Fixing the orphaned `date` view (no UI entry point) or the `App.defaultDate` duplication of `viewToRange`.
- Global cleanup of the `text-fg-2` vs `muted-foreground` token split across the app.

## Decisions

### Decision: Model a view as `Section[]`, render with a shared header

A `Section` is `{ key: string; label: string; tone?: 'default' | 'destructive'; tasks: Task[]; emptyHint?: string }`. The Week view computes a `Section[]` and maps over it, rendering a shared `<SectionHeader>` (label + tone) followed by either `<TaskList>` or, when `tasks` is empty and `emptyHint` is set, the muted placeholder line.

- **Why**: One header component means one style; the label inconsistency cannot recur. It also matches the natural structure of all five views, so the primitive is reusable.
- **Alternative considered**: Patch `WeekView` in place (just stop hiding empty days, restyle headers). Rejected — it leaves the duplication that caused the drift and doesn't give us the reusable primitive the broader overhaul needs.

### Decision: Put the section selector in `queries.ts`, the component stays thin

Add a `useWeekSections()` (or `selectWeekSections`) helper in `planner/queries.ts` that returns the ordered `Section[]` using `selectOverdue` and `getWeekDays(weekStartDay)`, filtered to days `>= today`. `WeekView` becomes a thin map over the result plus the empty-state check.

- **Why**: Mirrors the existing `useFilteredTasks` pattern; keeps date math and selection testable in isolation, separate from rendering.
- **Alternative considered**: Compute sections inside the component (as today). Rejected — harder to unit-test the today→end-of-week trimming and overdue ordering.

### Decision: Relative labels via a small label helper

Day-section labels are derived: today → "Today", today+1 → "Tomorrow", otherwise a formatted `THU · JUN 11`-style date. Encapsulate in a helper alongside the existing `@/shared/dates` formatters.

- **Why**: Reuses the wording the user already prefers from the Today view; one place to adjust the date format.

### Decision: Place `SectionHeader` in the planner feature for now

Create `SectionHeader` under `src/features/planner/components/`. If/when other features need it, promote to `src/shared/ui`.

- **Why**: Avoid premature generalization; the only consumer in this change is Week. The follow-up that migrates the other planner views is the natural moment to decide on promotion.

### Decision: Empty-week condition = no overdue AND no tasks today→end-of-week

The Week empty state shows only when both the Overdue section and every day section are empty. A week with only overdue tasks is not empty.

- **Why**: With overdue now part of the view, "no tasks this week" must account for it, otherwise the empty state could hide real overdue work.

## Risks / Trade-offs

- **Empty future days add vertical length** → Mitigated by rendering empty days as a single quiet muted line, not a full block; only today→end-of-week days render, so the count is bounded and shrinks as the week progresses.
- **Two header styles temporarily coexist** (Week on the new `SectionHeader`, other views still hand-rolled) until the follow-up migration → Acceptable and intentional; the new component is built to match the Today view's style so the eventual convergence is a no-op visually.
- **`text-fg-2` removed only from Week** leaves the token split alive elsewhere → Explicitly out of scope; noted as follow-up so it isn't forgotten.
- **Week's Today section visually mirrors the standalone Today tab** → Intended (that is the point of unifying); flagged earlier and accepted by the user.

## Open Questions

- Should `SectionHeader` live in `planner/components` or be promoted to `shared/ui` immediately? Defaulting to planner-local; revisit during the follow-up migration.
- Exact placeholder copy for empty days ("nothing planned" vs "—"); defaulting to "nothing planned" to match the conversational tone of existing empty states.
