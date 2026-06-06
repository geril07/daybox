## MODIFIED Requirements

### Requirement: Unscheduled view shows tasks with no date

The system SHALL display all tasks with no date set under a single titled section, using the shared section-header style used by the Today view.

#### Scenario: Unscheduled view

- **WHEN** user navigates to Unscheduled view
- **THEN** all tasks with date=null are shown beneath an "Unscheduled" section header
- **AND** the header uses the same style as the Today view's section header

### Requirement: Empty state shown when no tasks

The system SHALL display a contextual empty state message per view when it has no tasks.

#### Scenario: Empty Today view

- **WHEN** Today has no tasks and no overdue tasks
- **THEN** an empty state shows: "Nothing scheduled for today. Pull unscheduled tasks or add a new one."

#### Scenario: Empty Tomorrow view

- **WHEN** Tomorrow has no tasks
- **THEN** an empty state shows: "Nothing planned for tomorrow yet."

#### Scenario: Empty This Week view

- **WHEN** there are no overdue tasks and no tasks from today through the end of the week
- **THEN** an empty state shows: "No tasks this week. Add or reschedule something."

#### Scenario: Empty Unscheduled view

- **WHEN** Unscheduled has no tasks
- **THEN** an empty state shows: "No unscheduled tasks. Capture whatever comes to mind."

#### Scenario: Empty date browser

- **WHEN** the browsed date has no tasks
- **THEN** an empty state shows: "Nothing on this day."
