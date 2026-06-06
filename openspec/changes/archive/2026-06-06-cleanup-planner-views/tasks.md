## 1. DayView adopts SectionHeader

- [x] 1.1 In `DayView.tsx`, render the Overdue section's header via `<SectionHeader label="Overdue" tone="destructive" />` (only when `overdue.length > 0`)
- [x] 1.2 Render a `<SectionHeader label={viewMetaMap[view].title} />` above the main `TaskList` for all single-day views (today/tomorrow/backlog), removing the `view === 'today'` header special-case
- [x] 1.3 Remove the inline `section-label` markup; confirm the empty-state path (`EmptyState`) is unchanged

## 2. Single source for default date

- [x] 2.1 Add `defaultDateForView(view, weekStartDay)` to `queries.ts`, deriving the value from `viewToRange` (single date for `date`-kind, range start for `week`, `undefined` for `undated`); preserve the parked `'date'`/`browseDate` path
- [x] 2.2 Replace the inline `defaultDate` switch in `App.tsx` with a call to `defaultDateForView`; drop the now-unused `getTomorrow` import if no longer referenced

## 3. Tests & verification

- [x] 3.1 Add a unit test for `defaultDateForView` covering today/tomorrow/week/backlog (and the `date` branch reading `browseDate`)
- [x] 3.2 Run the test suite and typecheck; confirm no regressions
- [x] 3.3 Manually verify Today (Overdue + Today headers), Tomorrow ("Tomorrow" header), and Backlog ("Backlog" header) all render with the unified section-header style, and that add-task still defaults to the correct date per view
