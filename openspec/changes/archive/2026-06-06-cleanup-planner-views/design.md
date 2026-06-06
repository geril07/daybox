## Context

`overhaul-week-view` shipped a shared `SectionHeader` (`src/features/planner/components/SectionHeader.tsx`) with a `tone` prop (`default` | `destructive`) and migrated `WeekView` to a `Section[]` model. `DayView` was left untouched and still hand-rolls its headers:

```tsx
// DayView.tsx
{
  overdue.length > 0 && (
    <div className="section-label text-destructive ...">Overdue</div>
  )
}
{
  view === 'today' && (
    <div className="section-label text-muted-foreground ...">Today</div>
  )
}
;<TaskList tasks={tasks} />
```

So Tomorrow and Backlog (both `DayView` with `view !== 'today'`) render no header. `DayView` already gets per-view copy from `viewMetaMap` in `queries.ts` (titles + empty-state strings), and `useFilteredTasks(view)` returns `{ tasks, overdue }`.

Separately, `App.defaultDate` (`App.tsx:29-44`) re-implements the view→date mapping that `viewToRange(view, weekStartDay, today)` in `queries.ts` already encodes, to feed `AddTaskRow`'s default date.

## Goals / Non-Goals

**Goals:**

- `DayView` renders its sections through `SectionHeader`, matching the Today view's style.
- Tomorrow and Backlog show a titled header ("Tomorrow" / "Backlog").
- One source of truth for a view's default add-task date.

**Non-Goals:**

- Touching the date browser / `'date'` view / `browseDate` (parked).
- Consolidating `text-fg-2` vs `muted-foreground` (separate evaluation).
- Promoting `SectionHeader` to `shared/ui`, or moving `view` state into the store.

## Decisions

### Decision: `DayView` keeps `useFilteredTasks`; only rendering changes

`DayView` continues to call `useFilteredTasks(view)` and `viewMetaMap[view]`. It renders an optional Overdue `SectionHeader` (tone `destructive`) when `overdue.length > 0`, then a `SectionHeader` with `viewMetaMap[view].title` ("Today" / "Tomorrow" / "Backlog") above the main `TaskList`. The empty-state behavior (`EmptyState` when no content) is unchanged.

- **Why**: Smallest change that removes the inline markup and the `view === 'today'` header special-case. No need to reshape `DayView` into the full `Section[]` array since it has at most two fixed sections; routing through `SectionHeader` is enough to unify the style.
- **Alternative considered**: Make `DayView` produce a `Section[]` like Week and share one renderer. Rejected for now — `DayView`'s two-section shape is simple, and a shared `SectionedView` renderer is a larger abstraction better justified once a third consumer exists.

### Decision: `viewMetaMap` already supplies the labels

The header text comes from the existing `viewMetaMap[view].title`. No new copy is introduced; "Today"/"Tomorrow"/"Backlog" already live there.

### Decision: Single source for the default date via `viewToRange`

Replace `App.defaultDate`'s inline switch with a small helper derived from `viewToRange` (e.g. a `defaultDateForView(view, weekStartDay)` in `queries.ts` that returns the single date for `date`-kind ranges, the range start for `week`, and `undefined` for `undated`). `App` calls that helper.

- **Why**: Removes a second copy of the view→date mapping that can drift from `viewToRange`.
- **Note**: The parked `'date'` branch keeps reading `browseDate`; the helper preserves that path so the date browser still works if/when it gets an entry point.

## Risks / Trade-offs

- **Tomorrow/Backlog gaining a header is a visible change** → Intended; it is the original request. Spec scenarios updated accordingly.
- **Two section-rendering shapes remain** (`DayView`'s two fixed sections vs `WeekView`'s `Section[]`) → Acceptable; both share `SectionHeader`, so the style is unified even though the iteration differs. A shared renderer is deferred until a third consumer justifies it.
- **`defaultDateForView` must mirror `viewToRange` exactly** → Mitigated by deriving it from `viewToRange` rather than re-implementing the switch.

## Open Questions

- Should the Backlog header read "Backlog" or be suppressed (since the whole view is the backlog)? Defaulting to showing "Backlog" for consistency with the other views and to directly satisfy the "every view has a matching header" goal; easy to drop if it feels redundant in practice.
