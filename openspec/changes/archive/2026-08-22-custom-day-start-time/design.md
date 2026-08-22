## Context

DayBox stores task dates as local `YYYY-MM-DD` values, while the shared date helpers and planner queries currently derive “today” directly from the browser calendar date at midnight. The planner store already owns persisted preferences such as `weekStartDay` and `browseDate`, and the settings drawer already edits those preferences. Date-dependent consumers are spread across planner queries, the app shell's tab counts, task date presets, and quick-add defaults.

The change must preserve existing task dates and existing planner data. A user changing the boundary changes which planner date is active and therefore which views show a task; it does not rewrite task records.

## Goals / Non-Goals

**Goals:**

- Store one local day-start preference in the planner store, defaulting to midnight.
- Support minute precision, including values such as 02:30.
- Define one effective planner-date calculation and use it for all current-day-relative planner behavior.
- Keep date arithmetic local-time and deterministic in unit tests.
- Preserve old localStorage state and current save exports through defaults and a planner-slice migration.
- Apply changes immediately to views, counts, quick-add, and date-picker presets.

**Non-Goals:**

- Do not change the `YYYY-MM-DD` task-date format or migrate existing task dates.
- Do not create per-day or weekday-specific boundaries.
- Do not add timezone selection; the boundary uses the browser's local wall-clock time.
- Do not change explicitly selected dates in the date picker or the meaning of the Date Browser's selected date.
- Do not make the Pomodoro timer or task completion timestamps use the planner boundary.

## Decisions

### Store the preference as minutes since local midnight

The planner state will add `dayStartMinutes`, an integer from `0` through `1439`. `0` represents the existing midnight behavior and `150` represents 02:30. The UI converts this value to and from the native `HH:mm` time-input format.

This keeps persistence locale-independent and makes comparisons and validation straightforward. Storing a display string was rejected because it would require parsing locale/formatted values in date logic; storing hours and minutes separately was rejected because it creates two fields that can become inconsistent.

### Centralize effective-date calculation in shared date utilities

A pure shared helper will accept an optional `now` value and `dayStartMinutes`, compare the local hour/minute with the configured boundary, and return the effective planner date. The comparison is inclusive: at the exact configured minute the new planner day has started; any earlier time belongs to the previous calendar date.

Date-only arithmetic will remain local rather than using UTC parsing. Planner query functions will derive one effective `today` value and pass the same boundary-aware inputs to week, tomorrow, overdue, later, and relative-label helpers. This avoids each consumer implementing a slightly different rollover rule.

The helper's injectable `now`/date arguments allow tests to cover just-before, exact, and just-after boundary cases without relying on the wall clock. Existing midnight callers and tests will be updated to pass the explicit default where needed rather than maintaining a second date model.

### Keep planner ownership and apply the setting reactively

`dayStartMinutes` belongs beside `weekStartDay` and `browseDate` in `usePlannerStore`. The settings drawer will render a labeled native time input in the Display section and call the planner store action on change. Because all affected views already subscribe to planner state or receive derived defaults from `App`, changing the value will recalculate the visible buckets immediately.

The setting will not alter `browseDate` or any task. A browsed date remains an explicit date; only operations that need the current planner date (for example stepping from a null browse date) use the effective-date helper.

### Preserve old persisted planner state without resetting it

The local planner rehydration schema will accept a missing `dayStartMinutes` on old blobs and normalize it to `0` during rehydration. A malformed present value still fails validation and follows the existing reset-and-warn behavior. This avoids losing `weekStartDay` and `browseDate` merely because the new field did not exist in an older localStorage blob.

The save slice will advance to version 2. Its v1 migration adds `dayStartMinutes: 0`, and its missing-slice default is the complete v2 planner payload. Thus current-envelope imports from older exports remain valid while new exports carry the setting explicitly.

### Update every current-day consumer at its existing seam

- Planner queries receive `dayStartMinutes` from the planner store and use one effective date for Today, Tomorrow, week sections, Later, overdue, and relative labels.
- `App` passes the boundary into `defaultDateForView`, so quick-add defaults follow the selected view's effective date.
- `ViewTabs` uses the same effective date and week range for its count badges.
- Task date-picker quick presets derive Today and Tomorrow from the effective planner date; explicit date-input selections remain unchanged.
- The Date Browser's stepping logic uses the effective date only when it has no persisted browse date; stepping an existing browse date remains ordinary date arithmetic.

This keeps cross-feature imports within the existing barrel boundaries and leaves shared utilities independent of feature stores.

## Risks / Trade-offs

- [Risk] A setting change can move tasks between Today, Tomorrow, and Overdue without changing task data, which may surprise users. → Mitigation: make the setting label and local-time semantics clear; do not mutate task dates.
- [Risk] A native time input's display follows browser locale conventions. → Mitigation: persist numeric minutes, use the input's standardized `HH:mm` value, and label the control with an explicit example such as “Day starts at”.
- [Risk] Daylight-saving transitions can create a local wall-clock hour that is skipped or repeated. → Mitigation: define the preference as local wall-clock time and compare hour/minute values; do not introduce timezone or UTC conversion into v1.
- [Risk] Adding a required field to the persisted planner schema could reset old planner preferences. → Mitigation: accept and normalize a missing field, and add a v1-to-v2 save-slice migration for file imports.
- [Risk] One affected consumer could accidentally keep using calendar midnight. → Mitigation: centralize boundary-aware helpers and add boundary-focused tests for planner queries, tab counts, and task presets.

## Migration Plan

1. Add the planner field/action, validation, default normalization, and boundary-aware shared date helpers.
2. Update planner save-slice schemas and migration handling from v1 to v2.
3. Update settings, planner views/queries, app defaults, tab counts, and task date presets to use the shared effective-date calculation.
4. Add unit and component coverage for old state/imports, exact boundary behavior, and affected UI behavior.
5. Run formatting, typecheck, lint, and the full test suite.

There is no server deployment or destructive data migration. Rollback to the previous application version leaves the new `dayStartMinutes` field in localStorage/export data; the previous schema may reset or ignore that newer planner blob, so rollback is not a supported way to preserve the new preference. Existing task data remains intact.

## Open Questions

- None for v1. The boundary is local wall-clock time, minute precision, valid range 00:00–23:59, and default 00:00.
