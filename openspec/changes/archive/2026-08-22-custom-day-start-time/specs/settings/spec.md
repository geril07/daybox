## ADDED Requirements

### Requirement: User can configure when the next planner day starts

The Settings drawer SHALL expose a Display control for the planner day-start time. The control SHALL accept local times at minute precision from `00:00` through `23:59`, show the persisted value, and write the corresponding `dayStartMinutes` preference to the planner store.

#### Scenario: Day-start control shows the default

- **WHEN** the planner has no persisted day-start preference
- **AND** the user opens Settings
- **THEN** the Display section shows a day-start control with value `00:00`

#### Scenario: User changes the day-start time

- **WHEN** the user sets the day-start control to `02:30`
- **THEN** the planner store contains `dayStartMinutes = 150`
- **AND** the next planner day begins at 02:30 local time
- **AND** affected views update without changing any task dates

#### Scenario: Day-start time persists

- **WHEN** the user sets the day-start control to `02:30` and reloads the app
- **THEN** Settings shows `02:30`
- **AND** the planner uses the same boundary after reload

#### Scenario: The control supports minute precision

- **WHEN** the user sets the day-start control to `02:31`
- **THEN** the planner store contains `dayStartMinutes = 151`
- **AND** the effective planner date changes at exactly 02:31 local time
