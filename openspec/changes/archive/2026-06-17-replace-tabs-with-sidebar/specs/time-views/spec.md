## ADDED Requirements

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

## REMOVED Requirements

### Requirement: View tabs compress on narrow viewports

**Reason**: The planner tab strip is removed and replaced by sidebar navigation.

**Migration**: Narrow viewports use the same sidebar navigation inside a left-side sheet instead of compressing tab labels.
