## Purpose

Five time views (Today, Tomorrow, This Week, Later, Unscheduled) plus a date browser for arbitrary dates, accessed via sidebar navigation. Overdue tasks surface in Today and This Week. Each view has a contextual empty state.

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

### Requirement: Unscheduled view shows tasks with no date

The system SHALL display all tasks with no date set under a single titled section, using the shared section-header style used by the Today view.

#### Scenario: Unscheduled view

- **WHEN** user navigates to Unscheduled view
- **THEN** all tasks with date=null are shown beneath an "Unscheduled" section header
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

### Requirement: Sidebar navigation selects planner time views

The system SHALL replace the planner tab strip with sidebar navigation. The sidebar's `Views` section SHALL list the time views in this order: `Today`, `Tomorrow`, `This Week`, `Later`, `Unscheduled`.

`Today` SHALL be the initial selected view on each app load. The selected view SHALL remain app-shell runtime state and SHALL NOT be persisted across reloads.

On narrow viewports, the system SHALL expose the same sidebar navigation in a left-side sheet opened from the header. The system SHALL NOT render the previous horizontal planner tab strip on any viewport.

#### Scenario: Desktop sidebar shows view items

- **WHEN** the user opens DayBox on a viewport wide enough for the persistent sidebar
- **THEN** the app shows a sidebar `Views` section
- **AND** the section contains `Today`, `Tomorrow`, `This Week`, `Later`, and `Unscheduled` in that order
- **AND** no planner tab strip is rendered in the header

#### Scenario: Today is selected first

- **WHEN** the user loads or reloads DayBox
- **THEN** the selected planner view is `Today`
- **AND** the previously selected sidebar view is not restored from localStorage

#### Scenario: Mobile navigation uses a sidebar sheet

- **WHEN** the user opens DayBox on a narrow viewport
- **THEN** the header exposes a control for opening planner navigation
- **AND** activating that control opens a left-side sheet with the same `Views` section
- **AND** no horizontal planner tab strip is rendered

### Requirement: Later view shows tasks after the current week

The system SHALL provide a `Later` time view that displays tasks with `date` set to a value after the end of the current configured week. The configured week boundary SHALL respect `weekStartDay` from the planner store.

The `Later` view SHALL render one section per matching date, sorted by date ascending. Each section SHALL render tasks for that date sorted by the existing task sort order. Dates with no matching tasks SHALL NOT be rendered as empty sections.

Quick-add while `Later` is selected SHALL default the task date to the first day after the current configured week.

#### Scenario: Later shows future tasks after week end

- **WHEN** the configured week ends on Sunday
- **AND** one task is dated Sunday
- **AND** one task is dated Monday after that Sunday
- **THEN** the `Later` view shows the Monday task
- **AND** the `Later` view does not show the Sunday task

#### Scenario: Later respects first day of week

- **WHEN** the user configures Sunday as the first day of week
- **THEN** the current week ends on Saturday
- **AND** the `Later` view includes tasks dated Sunday after that Saturday

#### Scenario: Later sections are sparse

- **WHEN** matching later tasks exist on `2026-06-22` and `2026-06-30`
- **AND** there are no tasks on dates between them
- **THEN** the `Later` view renders sections for `2026-06-22` and `2026-06-30`
- **AND** it does not render blank sections for intervening dates

#### Scenario: Empty Later view

- **WHEN** there are no tasks dated after the current configured week
- **THEN** the `Later` view shows a contextual empty state

#### Scenario: Quick-add from Later stays visible

- **WHEN** the user is in the `Later` view
- **AND** the current configured week ends on Sunday
- **AND** the user creates a task without choosing a date manually
- **THEN** the new task is dated Monday after that Sunday
- **AND** the new task appears in the `Later` view

### Requirement: Group lens filters planner time views

The system SHALL apply the selected sidebar group lens to every sidebar time view. A selected group value of `null` SHALL mean `All groups` and SHALL NOT filter tasks by group. A concrete group id SHALL limit visible tasks to tasks whose `groupId` matches that group.

The group lens SHALL apply to dated sections, undated sections, and overdue sections. Empty states SHALL be evaluated after group filtering.

#### Scenario: All groups shows unfiltered Today

- **WHEN** `Today` is selected
- **AND** the group lens is `All groups`
- **THEN** Today's visible tasks include tasks from every group

#### Scenario: Concrete group filters Today

- **WHEN** `Today` is selected
- **AND** the group lens is `Work`
- **THEN** Today's visible tasks include only tasks assigned to `Work`

#### Scenario: Concrete group filters overdue tasks

- **WHEN** `Today` is selected
- **AND** overdue tasks exist in `Work` and `Personal`
- **AND** the group lens is `Work`
- **THEN** the Overdue section includes only overdue tasks assigned to `Work`

#### Scenario: Concrete group filters Unscheduled

- **WHEN** `Unscheduled` is selected
- **AND** the group lens is `Personal`
- **THEN** the view shows only undated tasks assigned to `Personal`

#### Scenario: Empty state follows group filter

- **WHEN** `Tomorrow` has tasks in `Personal` but none in `Work`
- **AND** the group lens is `Work`
- **THEN** the `Tomorrow` view shows its empty state

### Requirement: Time views use the effective planner date

The system SHALL use the planner's effective date, derived from `dayStartMinutes`, for all current-day-relative time views and calculations. This includes Today, Tomorrow, overdue classification, This Week's current-week boundary, Later's first date, and relative labels such as "Today" and "Tomorrow". The Date Browser SHALL continue to render an explicitly selected `browseDate` directly, regardless of the current time.

These calculations SHALL be refreshed when the app loads or reloads and when relevant planner or task state changes. The app is not required to rerender solely because wall-clock time crosses the configured boundary while the page remains open; a reload or another render-triggering interaction may be required.

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

#### Scenario: Week and Later use the effective date after recalculation

- **WHEN** the app recalculates after the effective planner date has changed because the configured boundary was crossed
- **THEN** This Week recomputes its seven-day range from that effective date
- **AND** Later starts after the end of the week containing that effective date
- **AND** week section labels use the same effective Today and Tomorrow dates

#### Scenario: Explicit Date Browser selection is not shifted

- **WHEN** the user has selected `browseDate = "2026-06-10"`
- **AND** the local time is before the configured day boundary
- **THEN** the Date Browser shows tasks dated `2026-06-10`
- **AND** it does not reinterpret the selected date as `2026-06-09`
