## MODIFIED Requirements

### Requirement: Empty state shown when no tasks

The system SHALL display a contextual empty state message per view when it has no tasks. The Today view SHALL count active routines with active steps as content, so the Today empty state SHALL NOT be shown when routines are visible.

#### Scenario: Empty Today view

- **WHEN** Today has no tasks, no overdue tasks, and no visible routines
- **THEN** an empty state shows: "Nothing scheduled for today. Pull unscheduled tasks or add a new one."

#### Scenario: Today view with routines but no tasks

- **WHEN** Today has no tasks and no overdue tasks, but at least one active routine with active steps exists
- **THEN** the Today empty state is not shown
- **AND** the Today view shows the routines section

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

## ADDED Requirements

### Requirement: Today view includes routines section

The system SHALL render active daily routines in the Today view in a dedicated "Routines" section. The section SHALL appear after the Overdue section when overdue tasks exist and before the Today task section.

#### Scenario: Routines appear after overdue tasks

- **WHEN** Today has overdue tasks and visible routines
- **THEN** the Overdue section appears first
- **AND** the Routines section appears after Overdue
- **AND** the Today task section appears after Routines

#### Scenario: Routines appear before today's tasks

- **WHEN** Today has visible routines and today's tasks
- **THEN** the Routines section appears before the Today task section

#### Scenario: Routines do not appear in non-Today views

- **WHEN** the user navigates to Tomorrow, This Week, Unscheduled, or Date Browser
- **THEN** the daily routines section is not rendered in that view
