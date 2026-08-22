## ADDED Requirements

### Requirement: Time views use the effective planner date

The system SHALL use the planner's effective date, derived from `dayStartMinutes`, for all current-day-relative time views and calculations. This includes Today, Tomorrow, overdue classification, This Week's current-week boundary, Later's first date, and relative labels such as "Today" and "Tomorrow". The Date Browser SHALL continue to render an explicitly selected `browseDate` directly, regardless of the current time.

#### Scenario: Late-night tasks remain in the previous planner day

- **WHEN** the local date and time is `2026-06-10 02:29`
- **AND** `dayStartMinutes` is `150` (02:30)
- **AND** tasks exist dated `2026-06-09`, `2026-06-10`, and `2026-06-08`
- **THEN** the Today view shows the `2026-06-09` tasks as today
- **AND** the Tomorrow view shows the `2026-06-10` tasks
- **AND** the `2026-06-08` unfinished tasks are overdue

#### Scenario: The new planner day begins at the configured minute

- **WHEN** the local date and time is `2026-06-10 02:30`
- **AND** `dayStartMinutes` is `150` (02:30)
- **THEN** Today resolves to `2026-06-10`
- **AND** Tomorrow resolves to `2026-06-11`
- **AND** `2026-06-09` is eligible for overdue classification when unfinished

#### Scenario: Week and Later use the effective date

- **WHEN** the effective planner date changes because the configured boundary is crossed
- **THEN** This Week recomputes its seven-day range from that effective date
- **AND** Later starts after the end of the week containing that effective date
- **AND** week section labels use the same effective Today and Tomorrow dates

#### Scenario: Explicit Date Browser selection is not shifted

- **WHEN** the user has selected `browseDate = "2026-06-10"`
- **AND** the local time is before the configured day boundary
- **THEN** the Date Browser shows tasks dated `2026-06-10`
- **AND** it does not reinterpret the selected date as `2026-06-09`
