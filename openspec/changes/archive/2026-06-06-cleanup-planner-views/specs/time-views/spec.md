## MODIFIED Requirements

### Requirement: Tomorrow view shows next day's tasks

The system SHALL display all tasks dated tomorrow under a single titled section, using the shared section-header style (uppercase, wide letter-spacing, muted-foreground) used by the Today view.

#### Scenario: Tomorrow view

- **WHEN** user navigates to Tomorrow view
- **THEN** tasks dated tomorrow are shown beneath a "Tomorrow" section header
- **AND** the header uses the same style as the Today view's section header

### Requirement: Backlog view shows unscheduled tasks

The system SHALL display all tasks with no date set under a single titled section, using the shared section-header style used by the Today view.

#### Scenario: Backlog view

- **WHEN** user navigates to Backlog view
- **THEN** all tasks with date=null are shown beneath a "Backlog" section header
- **AND** the header uses the same style as the Today view's section header

### Requirement: Today view shows overdue section + current day's tasks

The system SHALL display unfinished tasks from past dates in a separate "Overdue" section at the top, followed by today's tasks in a "Today" section. Both sections SHALL render through the shared section-header component (the Overdue header using the destructive tone).

#### Scenario: Today view with overdue and today tasks

- **WHEN** user navigates to Today view
- **THEN** unfinished past-dated tasks appear in an "OVERDUE" section at the top, followed by today's tasks in a separate "TODAY" section
- **AND** both section headers render through the shared section-header component

#### Scenario: No overdue tasks

- **WHEN** all past-dated tasks are completed
- **THEN** no Overdue section is shown; only the Today section appears
