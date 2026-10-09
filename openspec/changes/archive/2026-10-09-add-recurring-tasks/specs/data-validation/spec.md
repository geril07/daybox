## MODIFIED Requirements

### Requirement: Defensive bounds on user-input fields

The system SHALL enforce length caps on user-typed strings at the schema layer:

- `Task.title`: 1 to 280 characters (after trim)
- `Series.title`: 1 to 280 characters (after trim)
- `Group.name`: 1 to 40 characters (after trim)

Inputs exceeding the cap SHALL be rejected by the schema (truncation is not used). The UI may pre-trim before submission; the schema is the final guard.

#### Scenario: Task title over 280 chars is rejected

- **WHEN** `addTask` is called with a 281-character string
- **THEN** the task is not added
- **AND** the store logs a warning

#### Scenario: Group name over 40 chars is rejected

- **WHEN** `addGroup` is called with a 41-character string
- **THEN** the group is not added
- **AND** the store logs a warning

#### Scenario: Series title over 280 chars is rejected

- **WHEN** a series is created with a 281-character title
- **THEN** the series is not added
- **AND** the store logs a warning

#### Scenario: Series title of exactly 280 chars is accepted

- **WHEN** a series is created with a 280-character title
- **THEN** the series is added

#### Scenario: A whitespace-only series title is rejected

- **WHEN** a series is created with a title of only whitespace
- **THEN** the series is not added
- **AND** the store logs a warning

## ADDED Requirements

### Requirement: Series enumeration fields are validated at the schema layer

The system SHALL validate `Series.weekdays` as an array of integers in `[0, 6]` containing no duplicates and at least one entry, and `Series.skipDates` as an array of `YYYY-MM-DD` strings with no duplicates. `Series.pomoEstimate` SHALL be a finite number in `[0, 99]` and SHALL NOT require an integer.

The `Series` schema SHALL require `seriesId` and `occurrenceDate` on tasks to be present together or absent together, and SHALL enforce that `(seriesId, occurrenceDate)` is unique across the task array. These refinements SHALL run during schema validation, not only during store actions, so persisted and imported data is held to the same standard as data created in the UI.

#### Scenario: Duplicate weekday entries are rejected

- **WHEN** a series is validated with `weekdays` `[1, 3, 1]`
- **THEN** validation fails

#### Scenario: An out-of-range weekday is rejected

- **WHEN** a series is validated with `weekdays` `[1, 7]`
- **THEN** validation fails

#### Scenario: A non-integer weekday is rejected

- **WHEN** a series is validated with `weekdays` `[1.5]`
- **THEN** validation fails

#### Scenario: A fractional pomodoro estimate is accepted on a series

- **WHEN** a series is validated with `pomoEstimate` `1.5`
- **THEN** validation succeeds

#### Scenario: Duplicate skipDates entries are rejected

- **WHEN** a series is validated with `skipDates` `["2026-10-08", "2026-10-08"]`
- **THEN** validation fails

#### Scenario: Duplicate occurrence identity is rejected

- **WHEN** a task array contains two tasks with `seriesId` `'s1'` and `occurrenceDate` `'2026-10-06'`
- **THEN** validation fails

#### Scenario: A half-populated occurrence identity is rejected

- **WHEN** a task array contains a task with `seriesId` `'s1'` and `occurrenceDate` `null`
- **THEN** validation fails

#### Scenario: Tasks without recurrence identity validate

- **WHEN** a task array contains ten tasks each with `seriesId: null` and `occurrenceDate: null`
- **THEN** validation succeeds
