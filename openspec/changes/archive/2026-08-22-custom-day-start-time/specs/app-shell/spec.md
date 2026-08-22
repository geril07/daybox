## MODIFIED Requirements

### Requirement: Tabs show task count badges

The system SHALL display the number of tasks in each view as a badge on the tab, shown only when the count is greater than zero. The counts SHALL use the same effective planner date, week range, and overdue/later boundaries as the corresponding planner views, including the configured `dayStartMinutes` preference.

#### Scenario: Task count badge shown on tabs

- **WHEN** there are tasks matching a view's date filter
- **THEN** the corresponding tab shows a badge with the task count

#### Scenario: Today and Tomorrow counts follow the day boundary

- **WHEN** the local time is `02:00` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** tasks dated `2026-06-09` and `2026-06-10` exist
- **THEN** the Today badge counts the `2026-06-09` tasks
- **AND** the Tomorrow badge counts the `2026-06-10` tasks

#### Scenario: Counts update at the configured boundary

- **WHEN** the local time reaches the configured day-start minute
- **THEN** Today, Tomorrow, This Week, and Later tab counts use the newly effective planner date
- **AND** the counts remain consistent with the views opened from those tabs
