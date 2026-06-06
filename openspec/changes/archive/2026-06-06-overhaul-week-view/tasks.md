## 1. Section primitive

- [x] 1.1 Define a `Section` type (`{ key, label, tone?, tasks, emptyHint? }`) in the planner feature (e.g. `queries.ts` or a `types.ts`)
- [x] 1.2 Create `SectionHeader` component under `src/features/planner/components/` matching the Today view's label style (uppercase, `tracking-widest`, `muted-foreground`; `destructive` tone for overdue)
- [x] 1.3 Export the new component/type from `src/features/planner/index.ts` as needed

## 2. Week sections selector

- [x] 2.1 Add a relative day-label helper (today → "Today", today+1 → "Tomorrow", else `THU · JUN 11`-style) near `@/shared/dates`, reusing `getTomorrow`/`isTomorrow`/`getFormattedDate`
- [x] 2.2 Add `useWeekSections()` to `src/features/planner/queries.ts` returning the ordered `Section[]`: an Overdue section (via `selectOverdue`, included only when non-empty) followed by one section per day from today through end of week
- [x] 2.3 Trim already-passed days: only include `getWeekDays(weekStartDay)` entries `>= today`
- [x] 2.4 Populate each day section's `tasks` via `selectForDate` and set an `emptyHint` ("nothing planned") so empty future days stay visible
- [x] 2.5 Memoize on `tasks` and `weekStartDay`, following the existing `useFilteredTasks` pattern

## 3. Rewrite WeekView

- [x] 3.1 Replace `WeekView` body to consume `useWeekSections()` and map each section to `<SectionHeader>` + (`<TaskList>` or the muted placeholder line when empty with an `emptyHint`)
- [x] 3.2 Remove the per-day `text-fg-2` headers and the `[TODAY]` badge pill
- [x] 3.3 Show the existing `EmptyState` ("No tasks this week. Add or reschedule something.") only when there are no overdue tasks and every day section is empty

## 4. Tests & verification

- [x] 4.1 Add unit tests for `useWeekSections`/selector: overdue ordering, today→end-of-week trimming, empty-day `emptyHint`, weekStartDay boundary, empty-week condition
- [x] 4.2 Run the test suite and typecheck; confirm no regressions in planner tests
- [x] 4.3 Manually verify the Week view: overdue at top, Today/Tomorrow relative labels, plain dates for later days, empty days show "nothing planned", empty week shows the empty state
