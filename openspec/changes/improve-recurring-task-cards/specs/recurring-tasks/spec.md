## MODIFIED Requirements

### Requirement: Settings manages series definitions

The Settings drawer SHALL expose a Recurring tasks section that mounts a panel owned by the tasks feature. The panel SHALL let the user create, rename, change the weekday selection, change the group, change the pomodoro estimate, activate or deactivate, reorder, and delete series. The panel SHALL NOT offer a natural-language recurrence syntax. User-facing creation and deletion actions SHALL use recurring-task terminology rather than series terminology.

The weekday selector SHALL render the seven days beginning with the planner's configured `weekStartDay` for display, while storing absolute day-of-week numbers in `0..6`. Series SHALL NOT be editable from a planner view, from a task row, or from the sidebar.

#### Scenario: Create a series from Settings

- **WHEN** the user enters a title and a weekday selection in the Recurring tasks panel and activates Add recurring task
- **THEN** a new active series is stored with that title and those weekdays
- **AND** missing matching occurrences in the current horizon are generated without reload or waiting for a timer tick

#### Scenario: Toggle a series off from Settings

- **WHEN** the user deactivates the series "Работа" in the Recurring tasks panel
- **THEN** the series is stored with `active: false`
- **AND** its existing occurrences are still visible in the dates they belong to

#### Scenario: Weekday toggles follow the first day of week

- **WHEN** the planner preference `weekStartDay` is `0` (Sunday)
- **AND** the user opens the Recurring tasks panel
- **THEN** the weekday toggles are ordered Sunday through Saturday
- **AND** the stored `weekdays` values are absolute day-of-week numbers

#### Scenario: Delete a series from Settings

- **WHEN** the user confirms Delete recurring task for the series "Приседания"
- **THEN** the series and all of its occurrences are removed from the store

### Requirement: Recurring Settings section is collapsible

The Settings drawer SHALL provide one accordion trigger labelled Recurring tasks with a chevron. The section SHALL start collapsed on drawer mount. Expanding it SHALL expose the entire series list and the add-series form together. Individual series SHALL NOT have separate accordion triggers. Creating a series SHALL leave the section open. Expansion SHALL be runtime UI state and SHALL NOT change stored series data.

Panel height and chevron rotation SHALL animate, except when reduced motion is requested. Closed controls SHALL NOT remain in the keyboard tab order. Collapsing the section SHALL preserve saved edits, including a title committed on blur.

#### Scenario: Recurring section starts collapsed

- **WHEN** the user opens Settings with existing series
- **THEN** the Recurring tasks header and chevron are visible
- **AND** the series list and add-series form are hidden
- **AND** other Settings sections remain visible

#### Scenario: Expand and collapse the whole block

- **WHEN** the user activates the Recurring tasks trigger
- **THEN** every series editor and the add-series form appear together
- **AND** activating the trigger again hides the entire block

#### Scenario: Create a series

- **WHEN** a new series is successfully created
- **THEN** the new editor is visible in the open Recurring tasks section
- **AND** collapsing and reopening the section retains saved series data

#### Scenario: Keyboard and reduced motion

- **WHEN** the user activates a trigger with the keyboard and requests reduced motion
- **THEN** expansion state is exposed accessibly and editing controls are reachable only while open
- **AND** height and chevron changes do not animate

## ADDED Requirements

### Requirement: Recurring task controls have clear labels and help

Each editor SHALL show Group and Estimated pomodoros labels above the corresponding controls, the selected group's color dot, and the existing Active switch. A help icon beside the section trigger SHALL explain selected weekdays and matching upcoming-task rename behavior without toggling the accordion. Move up, Move down, and Delete recurring task actions SHALL have accessible names and tooltips. These tooltips and the section help SHALL open on hover or keyboard focus and SHALL NOT remain open when the pointer leaves the trigger to hover their content.

#### Scenario: Understand editor controls

- **WHEN** the user opens a recurring task editor
- **THEN** Group and Estimated pomodoros labels are visible
- **AND** the group color marker is visible beside the group name

#### Scenario: Read section help without expanding

- **WHEN** the user hovers or keyboard-focuses the section help icon
- **THEN** recurrence help is shown
- **AND** the accordion expansion state is unchanged

#### Scenario: Action tooltip is non-interactive

- **WHEN** the user hovers an enabled editor action
- **THEN** its tooltip identifies the action
- **AND** moving the pointer from the action to the tooltip closes it

### Requirement: Recurring editors adapt to narrow widths and long names

The seven weekday buttons SHALL have equal widths in one row at supported viewport widths of 320px or wider. Desktop editors SHALL show labelled group and estimate controls side by side; narrow-screen editors SHALL stack those controls. Long group names SHALL NOT push the color dot, dropdown indicator, or estimate out of the card. Full selected group names SHALL remain available through the accessible name and picker. Settings SHALL stay within the viewport and SHALL remain scrollable when content exceeds its height.

#### Scenario: Desktop long group name

- **WHEN** a recurring task belongs to a group with a long name on desktop
- **THEN** its selected group name truncates within the flexible group column
- **AND** the color marker, dropdown indicator, and estimate remain visible

#### Scenario: Narrow screen

- **WHEN** Settings is shown at a 320px-wide viewport
- **THEN** weekday buttons remain in one row
- **AND** Group and Estimated pomodoros controls stack without horizontal overflow
