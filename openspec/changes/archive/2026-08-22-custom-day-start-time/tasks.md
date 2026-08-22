## 1. Planner Preference And Date Model

- [x] 1.1 Add `dayStartMinutes` and its setter to the planner store with a default of `0`, including validation and normalization of older persisted planner state that lacks the field.
- [x] 1.2 Add shared local-date helpers for deriving the effective planner date, adding calendar days, formatting relative labels, and computing week ranges from an injected time and `dayStartMinutes`.
- [x] 1.3 Update planner date utility tests for midnight compatibility, just-before-boundary, exact-boundary, date rollover, week-range, and relative-label behavior.

## 2. Persistence And Save Compatibility

- [x] 2.1 Update the planner persisted-state schema and rehydration tests so old valid blobs retain `weekStartDay` and `browseDate` while defaulting the missing day-start value to midnight.
- [x] 2.2 Add planner save-slice version 2 with `dayStartMinutes`, migrate version 1 payloads to midnight, and update the current/missing defaults.
- [x] 2.3 Update data-portability tests for exporting, importing, validating, migrating, and defaulting the planner day-start preference.

## 3. Planner Views And App Integration

- [x] 3.1 Update planner queries and view components so Today, Tomorrow, overdue, This Week, Later, and relative section labels all use the effective planner date.
- [x] 3.2 Update Date Browser stepping so a null browse date starts from the effective planner date while an explicit browse date remains unchanged.
- [x] 3.3 Update `App` quick-add defaults and `ViewTabs` task counts to use the same effective-date and week-range calculations as planner views.
- [x] 3.4 Update task date-picker Today/Tomorrow presets to use the effective planner date without changing explicit custom-date selection.
- [x] 3.5 Add planner, app-shell, and task component tests covering the 02:30 example before the boundary, at the boundary, after reload, and after changing the setting.

## 4. Settings UI

- [x] 4.1 Add a labeled Display setting with a minute-precision local time input and conversion between `HH:mm` and `dayStartMinutes`.
- [x] 4.2 Add settings tests for the default `00:00` value, changing to `02:30` and `02:31`, persistence, and immediate view recalculation.

## 5. Verification

- [x] 5.1 Run `npm run format`.
- [x] 5.2 Run `npm run typecheck`.
- [x] 5.3 Run `npm run lint`.
- [x] 5.4 Run `npm run test`.
