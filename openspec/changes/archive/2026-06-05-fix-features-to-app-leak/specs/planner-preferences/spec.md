## ADDED Requirements

### Requirement: Planner preferences are persisted in the planner's own store

The system SHALL persist `weekStartDay` and `browseDate` in the planner's own Zustand store under the localStorage key `daybox-planner`. No other feature or app-level store SHALL own these values.

#### Scenario: First load with no persisted preferences

- **WHEN** a user loads the app and `daybox-planner` is empty
- **THEN** `weekStartDay` defaults to `1` (Monday) and `browseDate` defaults to `null`

#### Scenario: Preferences survive a reload

- **WHEN** a user sets `weekStartDay` to `0` (Sunday) and reloads the page
- **THEN** the Week view renders Sunday through Saturday

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

The system SHALL read the current `browseDate` from the planner store and write back to the planner store when the user steps forward or back. The Date Browser SHALL NOT read or write this value to any other store.

#### Scenario: Stepping forward

- **WHEN** the user clicks the forward chevron while viewing `2026-06-10`
- **THEN** `browseDate` is updated to `2026-06-11` in the planner store
- **AND** the Date Browser renders tasks for `2026-06-11`

#### Scenario: Stepping backward

- **WHEN** the user clicks the backward chevron while viewing `2026-06-10`
- **THEN** `browseDate` is updated to `2026-06-09` in the planner store
- **AND** the Date Browser renders tasks for `2026-06-09`

#### Scenario: No browse date selected

- **WHEN** `browseDate` is `null`
- **THEN** the Date Browser shows the empty state "Select a date to browse."
