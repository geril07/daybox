## ADDED Requirements

### Requirement: First day of week is a planner preference

The system SHALL persist the first day of the week in the planner feature's own store under `daybox-planner`. The Week view SHALL read the first day of the week from the planner store.

#### Scenario: Default first day of week

- **WHEN** a user loads the app and `daybox-planner` is empty
- **THEN** the Week view lists the seven days starting with Monday

#### Scenario: Change first day to Monday

- **WHEN** user selects Monday as the first day of week in settings
- **THEN** the This Week view shows Mon–Sun

#### Scenario: Persist first day of week

- **WHEN** user changes first day of week to Sunday and reloads the page
- **THEN** the This Week view still shows Sunday–Saturday

### Requirement: Date browser holds a persisted browse date

The system SHALL persist the currently-browsed date in the planner feature's own store under `daybox-planner`. The Date Browser SHALL read and write the browse date via the planner store.

#### Scenario: Browse a specific date

- **WHEN** user clicks the date stepper arrows or selects a date in the Date Browser
- **THEN** the planner store's `browseDate` is updated
- **AND** tasks for that date are shown

#### Scenario: Browsed date survives a reload

- **WHEN** user steps the Date Browser to `2026-06-15` and reloads the page
- **THEN** the Date Browser reopens showing tasks for `2026-06-15`
