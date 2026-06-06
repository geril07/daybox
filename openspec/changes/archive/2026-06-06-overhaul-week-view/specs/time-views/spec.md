## MODIFIED Requirements

### Requirement: This Week view shows the current calendar week

The system SHALL display the This Week view as an ordered list of titled sections, each rendered with the shared section-header style used by the Today view (uppercase, wide letter-spacing, muted-foreground token).

The sections SHALL appear in this order:

1. An **Overdue** section containing all unfinished tasks dated before today. This section SHALL be shown only when it is non-empty.
2. One section **per day from today through the end of the configured week** (respecting the first day of week). Days of the current week that are already in the past SHALL NOT be rendered as day sections; their unfinished tasks surface in the Overdue section instead.

Each day section's header label SHALL be the relative word "Today" for the current day and "Tomorrow" for the next day; all later days SHALL use a plain date label (e.g. `THU · JUN 11`). The view SHALL NOT render a separate "TODAY" badge pill.

A day section with no tasks SHALL still render its header followed by a quiet, muted "nothing planned" placeholder line, so the shape of the week remains visible.

#### Scenario: Week view shows today through end of week

- **WHEN** user navigates to This Week view with weekStartDay=1 and today is Wednesday
- **THEN** day sections are shown for Wednesday through Sunday
- **AND** Monday and Tuesday of the current week are not rendered as day sections

#### Scenario: Week view respects first day of week

- **WHEN** user sets first day of week to Sunday in settings
- **THEN** the end-of-week boundary for the day sections is Saturday

#### Scenario: Overdue section in Week view

- **WHEN** there are unfinished tasks dated before today
- **THEN** an "OVERDUE" section appears at the top of the This Week view, above the day sections

#### Scenario: No overdue tasks in Week view

- **WHEN** there are no unfinished past-dated tasks
- **THEN** no Overdue section is shown and the view begins with the day sections

#### Scenario: Relative labels for today and tomorrow

- **WHEN** the This Week view renders the current day's and next day's sections
- **THEN** their headers read "Today" and "Tomorrow" respectively
- **AND** later days read as a plain date label such as "THU · JUN 11"
- **AND** no "TODAY" badge pill is rendered

#### Scenario: Empty future day stays visible

- **WHEN** a day from today through the end of the week has no tasks
- **THEN** that day's header is still shown
- **AND** a muted "nothing planned" placeholder line appears under it

### Requirement: Empty state shown when no tasks

The system SHALL display a contextual empty state message per view when it has no tasks.

#### Scenario: Empty Today view

- **WHEN** Today has no tasks and no overdue tasks
- **THEN** an empty state shows: "Nothing scheduled for today. Pull tasks from Backlog or add a new one."

#### Scenario: Empty Tomorrow view

- **WHEN** Tomorrow has no tasks
- **THEN** an empty state shows: "Nothing planned for tomorrow yet."

#### Scenario: Empty This Week view

- **WHEN** there are no overdue tasks and no tasks from today through the end of the week
- **THEN** an empty state shows: "No tasks this week. Add or reschedule something."

#### Scenario: Empty Backlog view

- **WHEN** Backlog has no tasks
- **THEN** an empty state shows: "No unscheduled tasks. Capture whatever comes to mind."

#### Scenario: Empty date browser

- **WHEN** the browsed date has no tasks
- **THEN** an empty state shows: "Nothing on this day."
