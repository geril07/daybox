## MODIFIED Requirements

### Requirement: User can reschedule a task

The system SHALL allow users to change a task's date via a date-picker popup. The Today and Tomorrow quick presets SHALL use the effective planner date and the following planner date derived from the configured day-start preference. A date selected through the explicit date input SHALL be used unchanged.

#### Scenario: Open date picker

- **WHEN** user clicks the date action button on a task row
- **THEN** a popup appears with quick presets (Today, Tomorrow, Unscheduled) and a date input

#### Scenario: Reschedule with quick preset Today before the boundary

- **WHEN** the local time is `02:00` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** user clicks "Today" in the date picker
- **THEN** the task's date is set to `2026-06-09`

#### Scenario: Reschedule with quick preset Tomorrow

- **WHEN** the effective planner date is `2026-06-09`
- **AND** user clicks "Tomorrow" in the date picker
- **THEN** the task's date is set to `2026-06-10`

#### Scenario: Reschedule with quick preset Today at the boundary

- **WHEN** the local time is `02:30` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** user clicks "Today" in the date picker
- **THEN** the task's date is set to `2026-06-10`

#### Scenario: Reschedule with custom date

- **WHEN** user selects `2026-07-01` in the date input
- **THEN** the task's date is set to `2026-07-01`

## ADDED Requirements

### Requirement: Contextual quick-add uses the effective planner date

When the app supplies a default date to the quick-add row for a current-day-relative view, the default SHALL be derived from the same effective planner date used by the planner queries. The user-created task SHALL keep that date unless the user explicitly reschedules it.

#### Scenario: Quick-add from Today before the boundary

- **WHEN** the local time is `02:00` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** the user adds a task from Today without choosing another date
- **THEN** the new task is dated `2026-06-09`

#### Scenario: Quick-add from Tomorrow before the boundary

- **WHEN** the effective planner date is `2026-06-09`
- **AND** the user adds a task from Tomorrow without choosing another date
- **THEN** the new task is dated `2026-06-10`
