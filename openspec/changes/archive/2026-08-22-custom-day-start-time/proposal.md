## Why

DayBox currently treats midnight as the boundary between planner days. Users who go to bed around 1–2 AM experience late-night planning as belonging to the wrong day, which makes Today, Tomorrow, overdue tasks, and quick date actions less useful. A configurable local day-start time lets the planner match the user's actual routine without changing the calendar dates stored on existing tasks.

## What Changes

- Add a persisted planner preference for the local time at which the next planner day begins, with midnight as the default.
- Add a settings control for choosing the day-start time at minute precision (for example, 02:30).
- Define the effective planner date from the configured boundary: before the boundary, the current calendar date belongs to the previous planner day; at and after the boundary, it is the current planner day.
- Make Today, Tomorrow, overdue classification, This Week, Later, relative labels, tab counts, and default quick-add/reschedule presets use the effective planner date consistently.
- Preserve explicitly chosen task dates and existing task data when the preference changes.
- Persist and include the preference in planner export/import data, while older persisted or exported planner data defaults to midnight.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `planner-preferences`: Add the persisted day-start preference and effective-date semantics.
- `time-views`: Base current-day, relative-day, overdue, week, and later calculations on the configured planner day boundary.
- `settings`: Expose a local time control for configuring when the next planner day starts.
- `task-management`: Make Today and Tomorrow date-picker presets use the effective planner date.
- `data-persistence`: Persist the day-start preference with the planner store and define its default during rehydration.
- `data-portability`: Include the preference in the planner save slice and default it when importing older planner slices.
- `app-shell`: Keep view-tab task counts aligned with the effective planner-date filters.

## Impact

- Planner preference schema, store, queries, and date utilities will gain configurable day-boundary support.
- Settings UI will gain a day-start time control.
- Planner views, task date-picker presets, quick-add defaults, and tab counts will share the same effective-date calculation.
- Planner persistence and save-slice version/migration handling will be updated; existing local data and current exports remain usable through a midnight default.
- Tests will cover boundary-before, boundary-at, date rollover, persistence/import compatibility, and affected view/preset behavior.
