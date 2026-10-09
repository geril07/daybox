## ADDED Requirements

### Requirement: Series changes trigger generation without reload

While the app is mounted, changes to series definitions SHALL trigger occurrence generation for the effective planner date through the end of the configured week without waiting for a minute tick, focus event, Settings close, or reload. Generation SHALL remain idempotent and SHALL NOT rewrite existing occurrences.

#### Scenario: Create a matching series while the app is open

- **WHEN** the user creates an active series matching today in Settings
- **THEN** today's task and other missing matching occurrences in the horizon are generated without reload or a timer tick
- **AND** today's task is visible when Settings closes

#### Scenario: Reactivate a series

- **WHEN** the user activates a series with missing matching occurrences in the horizon
- **THEN** those occurrences are generated without reload
- **AND** existing occurrences are unchanged and not duplicated

#### Scenario: Add a weekday to a series

- **WHEN** the user adds a matching weekday with a missing occurrence in the horizon
- **THEN** the missing occurrence is generated without reload
- **AND** existing tasks retain their stored title, group, and estimate

### Requirement: Recurring Settings section is collapsible

The Settings drawer SHALL provide one accordion trigger labelled Recurring with a chevron. The section SHALL start collapsed on drawer mount. Expanding it SHALL expose the entire series list and the add-series form together. Individual series SHALL NOT have separate accordion triggers. Creating a series SHALL leave the section open. Expansion SHALL be runtime UI state and SHALL NOT change stored series data.

Panel height and chevron rotation SHALL animate, except when reduced motion is requested. Closed controls SHALL NOT remain in the keyboard tab order. Collapsing the section SHALL preserve saved edits, including a title committed on blur.

#### Scenario: Recurring section starts collapsed

- **WHEN** the user opens Settings with existing series
- **THEN** the Recurring header and chevron are visible
- **AND** the series list and add-series form are hidden
- **AND** other Settings sections remain visible

#### Scenario: Expand and collapse the whole block

- **WHEN** the user activates the Recurring trigger
- **THEN** every series editor and the add-series form appear together
- **AND** activating the trigger again hides the entire block

#### Scenario: Create a series

- **WHEN** a new series is successfully created
- **THEN** the new editor is visible in the open Recurring section
- **AND** collapsing and reopening the section retains saved series data

#### Scenario: Keyboard and reduced motion

- **WHEN** the user activates a trigger with the keyboard and requests reduced motion
- **THEN** expansion state is exposed accessibly and editing controls are reachable only while open
- **AND** height and chevron changes do not animate

## MODIFIED Requirements

### Requirement: Settings manages series definitions

The Settings drawer SHALL expose a Recurring section that mounts a panel owned by the tasks feature. The panel SHALL let the user create, rename, change the weekday selection, change the group, change the pomodoro estimate, activate or deactivate, reorder, and delete series. The panel SHALL NOT offer a natural-language recurrence syntax.

The weekday selector SHALL render the seven days beginning with the planner's configured `weekStartDay` for display, while storing absolute day-of-week numbers in `0..6`. Series SHALL NOT be editable from a planner view, from a task row, or from the sidebar.

#### Scenario: Create a series from Settings

- **WHEN** the user enters a title and a weekday selection in the Recurring panel and confirms
- **THEN** a new active series is stored with that title and those weekdays
- **AND** missing matching occurrences in the current horizon are generated without reload or waiting for a timer tick

#### Scenario: Toggle a series off from Settings

- **WHEN** the user deactivates the series "Работа" in the Recurring panel
- **THEN** the series is stored with `active: false`
- **AND** its existing occurrences are still visible in the dates they belong to

#### Scenario: Weekday toggles follow the first day of week

- **WHEN** the planner preference `weekStartDay` is `0` (Sunday)
- **AND** the user opens the Recurring panel
- **THEN** the weekday toggles are ordered Sunday through Saturday
- **AND** the stored `weekdays` values are absolute day-of-week numbers

#### Scenario: Delete a series from Settings

- **WHEN** the user deletes the series "Приседания" in the Recurring panel
- **THEN** the series and all of its occurrences are removed from the store
