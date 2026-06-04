## Purpose

Four time views (Today, Tomorrow, This Week, Backlog) plus a date browser for arbitrary dates. Overdue tasks surface in Today. Each view has a contextual empty state.

## Requirements

### Requirement: Today view shows overdue section + current day's tasks
The system SHALL display unfinished tasks from past dates in a separate "Overdue" section at the top, followed by today's tasks.

#### Scenario: Today view with overdue and today tasks
- **WHEN** user navigates to Today view
- **THEN** unpaid past-dated tasks appear in an "OVERDUE" section at the top, followed by today's tasks in a separate section

#### Scenario: No overdue tasks
- **WHEN** all past-dated tasks are completed
- **THEN** no Overdue section is shown; only today's tasks appear

### Requirement: Tomorrow view shows next day's tasks
The system SHALL display all tasks dated tomorrow.

#### Scenario: Tomorrow view
- **WHEN** user navigates to Tomorrow view
- **THEN** tasks dated tomorrow are shown in a flat list

### Requirement: This Week view shows the current calendar week
The system SHALL display tasks grouped by day for the current calendar week (Mon–Sun by default, or respecting the configured first day of week).

#### Scenario: Week view shows Mon-Sun
- **WHEN** user navigates to This Week view with weekStartDay=1
- **THEN** tasks from Monday through Sunday of the current week are shown, grouped by day with day headers

#### Scenario: Week view respects first day of week
- **WHEN** user sets first day of week to Sunday in settings
- **THEN** This Week view shows Sunday through Saturday

### Requirement: Backlog view shows unscheduled tasks
The system SHALL display all tasks with no date set.

#### Scenario: Backlog view
- **WHEN** user navigates to Backlog view
- **THEN** all tasks with date=null are shown as a flat list

### Requirement: Date browser shows any specific date
The system SHALL allow users to step through dates forward and back, showing tasks for that date.

#### Scenario: Browse a specific date
- **WHEN** user clicks the date stepper arrows or selects a date
- **THEN** tasks for that date are shown

### Requirement: Empty state shown when no tasks
The system SHALL display a contextual empty state message per view when it has no tasks.

#### Scenario: Empty Today view
- **WHEN** Today has no tasks and no overdue tasks
- **THEN** an empty state shows: "Nothing scheduled for today. Pull tasks from Backlog or add a new one."

#### Scenario: Empty Tomorrow view
- **WHEN** Tomorrow has no tasks
- **THEN** an empty state shows: "Nothing planned for tomorrow yet."

#### Scenario: Empty This Week view
- **WHEN** the current week has no tasks
- **THEN** an empty state shows: "No tasks this week. Add or reschedule something."

#### Scenario: Empty Backlog view
- **WHEN** Backlog has no tasks
- **THEN** an empty state shows: "No unscheduled tasks. Capture whatever comes to mind."

#### Scenario: Empty date browser
- **WHEN** the browsed date has no tasks
- **THEN** an empty state shows: "Nothing on this day."
