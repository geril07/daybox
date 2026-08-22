## MODIFIED Requirements

### Requirement: Planner preferences are persisted in the planner's own store

The system SHALL persist `weekStartDay`, `browseDate`, and `dayStartMinutes` in the planner's own Zustand store under the localStorage key `daybox-planner`. `dayStartMinutes` SHALL be an integer from `0` through `1439`, where `0` means midnight. No other feature or app-level store SHALL own these values.

#### Scenario: First load with no persisted preferences

- **WHEN** a user loads the app and `daybox-planner` is empty
- **THEN** `weekStartDay` defaults to `1` (Monday)
- **AND** `browseDate` defaults to `null`
- **AND** `dayStartMinutes` defaults to `0`

#### Scenario: Preferences survive a reload

- **WHEN** a user sets `weekStartDay` to `0` (Sunday) and `dayStartMinutes` to `150` (02:30), then reloads the page
- **THEN** the Week view renders Sunday through Saturday
- **AND** the planner continues using 02:30 as the day boundary

#### Scenario: Browsed date survives a reload

- **WHEN** a user steps the Date Browser to `2026-06-15` and reloads the page
- **THEN** the Date Browser reopens showing tasks for `2026-06-15`

### Requirement: Week view reads the first day of the week from the planner store

The system SHALL read `weekStartDay` from the planner store when computing the week range. The Week view SHALL NOT read this value from any settings store, app store, or other feature's store.

#### Scenario: Week view honours the planner preference

- **WHEN** `weekStartDay` is `0` in the planner store
- **THEN** the Week view lists the seven days starting with Sunday

#### Scenario: Default week start

- **WHEN** no preference has been set
- **THEN** the Week view lists the seven days starting with Monday

### Requirement: Date Browser reads and writes the browse date in the planner store

The system SHALL read the current `browseDate` from the planner store and write back to the planner store when the user steps forward or back. The Date Browser SHALL NOT read or write this value to any other store. When `browseDate` is `null`, stepping SHALL use the effective planner date defined by `dayStartMinutes` as its base.

#### Scenario: Stepping forward

- **WHEN** the user clicks the forward chevron while viewing `2026-06-10`
- **THEN** `browseDate` is updated to `2026-06-11` in the planner store
- **AND** the Date Browser renders tasks for `2026-06-11`

#### Scenario: Stepping backward

- **WHEN** the user clicks the backward chevron while viewing `2026-06-10`
- **THEN** `browseDate` is updated to `2026-06-09` in the planner store
- **AND** the Date Browser renders tasks for `2026-06-09`

#### Scenario: Stepping with no browse date

- **WHEN** `browseDate` is `null`
- **AND** the local time is `02:00` on `2026-06-10`
- **AND** `dayStartMinutes` is `150` (02:30)
- **AND** the user clicks the forward chevron
- **THEN** `browseDate` is updated from the effective planner date `2026-06-09` to `2026-06-10`

#### Scenario: No browse date selected

- **WHEN** `browseDate` is `null`
- **THEN** the Date Browser shows the empty state "Select a date to browse."

## ADDED Requirements

### Requirement: The planner derives an effective date from the day-start preference

The system SHALL treat the effective planner date as the previous local calendar date before `dayStartMinutes`, and as the current local calendar date at or after `dayStartMinutes`. The comparison SHALL use local wall-clock time and SHALL be inclusive at the configured minute.

#### Scenario: Time before the configured boundary belongs to the previous planner date

- **WHEN** the local date and time is `2026-06-10 02:29`
- **AND** `dayStartMinutes` is `150` (02:30)
- **THEN** the effective planner date is `2026-06-09`

#### Scenario: The configured boundary starts the new planner date

- **WHEN** the local date and time is `2026-06-10 02:30`
- **AND** `dayStartMinutes` is `150` (02:30)
- **THEN** the effective planner date is `2026-06-10`

#### Scenario: Midnight preserves current behavior

- **WHEN** `dayStartMinutes` is `0`
- **THEN** the effective planner date equals the local calendar date for every time on that date
