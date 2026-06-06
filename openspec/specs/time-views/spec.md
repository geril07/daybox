## Purpose

Four time views (Today, Tomorrow, This Week, Backlog) plus a date browser for arbitrary dates. Overdue tasks surface in Today and This Week. Each view has a contextual empty state.

## Requirements

### Requirement: Today view shows overdue section + current day's tasks

The system SHALL display unfinished tasks from past dates in a separate "Overdue" section at the top, followed by today's tasks in a "Today" section. Both sections SHALL render through the shared section-header component (the Overdue header using the destructive tone).

#### Scenario: Today view with overdue and today tasks

- **WHEN** user navigates to Today view
- **THEN** unfinished past-dated tasks appear in an "OVERDUE" section at the top, followed by today's tasks in a separate "TODAY" section
- **AND** both section headers render through the shared section-header component

#### Scenario: No overdue tasks

- **WHEN** all past-dated tasks are completed
- **THEN** no Overdue section is shown; only the Today section appears

### Requirement: Tomorrow view shows next day's tasks

The system SHALL display all tasks dated tomorrow under a single titled section, using the shared section-header style (uppercase, wide letter-spacing, muted-foreground) used by the Today view.

#### Scenario: Tomorrow view

- **WHEN** user navigates to Tomorrow view
- **THEN** tasks dated tomorrow are shown beneath a "Tomorrow" section header
- **AND** the header uses the same style as the Today view's section header

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

### Requirement: Backlog view shows unscheduled tasks

The system SHALL display all tasks with no date set under a single titled section, using the shared section-header style used by the Today view.

#### Scenario: Backlog view

- **WHEN** user navigates to Backlog view
- **THEN** all tasks with date=null are shown beneath a "Backlog" section header
- **AND** the header uses the same style as the Today view's section header

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

- **WHEN** there are no overdue tasks and no tasks from today through the end of the week
- **THEN** an empty state shows: "No tasks this week. Add or reschedule something."

#### Scenario: Empty Backlog view

- **WHEN** Backlog has no tasks
- **THEN** an empty state shows: "No unscheduled tasks. Capture whatever comes to mind."

#### Scenario: Empty date browser

- **WHEN** the browsed date has no tasks
- **THEN** an empty state shows: "Nothing on this day."

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
