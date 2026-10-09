## MODIFIED Requirements

### Requirement: Settings drawer hosts feature-owned panels

The settings drawer SHALL display sections that mount panels from the relevant features. Each section's data is owned by the mounting feature, not by the settings drawer. Group CRUD is NOT mounted in the settings drawer; it lives in the sidebar (governed by `group-management`). Recurring series management IS mounted in the settings drawer; it lives nowhere else.

#### Scenario: Timer section mounts the timer's settings panel

- **WHEN** user opens the settings drawer to the Timer section
- **THEN** the timer's `TimerSettingsPanel` is mounted and reads/writes `useTimerStore`

#### Scenario: Recurring section mounts the tasks feature's series panel

- **WHEN** user opens the settings drawer to the Recurring section
- **THEN** a panel owned by the tasks feature is mounted
- **AND** it reads and writes the series array on `useTaskStore`

## ADDED Requirements

### Requirement: Settings can manage recurring series

The Settings drawer SHALL expose controls to create a series, rename it, set its weekday selection, set its group, set its pomodoro estimate, activate or deactivate it, reorder it, and delete it. Creating a series SHALL NOT immediately create a task; occurrences appear on the next generation run.

Deactivating a series SHALL stop future generation without removing the series or its existing occurrences. Deleting a series SHALL remove the series and every task carrying that `seriesId`.

The panel SHALL NOT offer a natural-language recurrence syntax in this capability.

#### Scenario: Create a series in Settings

- **WHEN** user enters a title and a weekday selection in the Recurring panel and confirms
- **THEN** a new active series is stored with that title and those weekdays
- **AND** no task is added to the store at that moment

#### Scenario: Rename a series in Settings

- **WHEN** user renames a series from "Отжимания" to "Отжимания 50"
- **THEN** the stored series title is "Отжимания 50"
- **AND** occurrences already generated keep the title they were created with

#### Scenario: Deactivate a series in Settings

- **WHEN** user deactivates a series in the Recurring panel
- **THEN** the series is stored with `active: false`
- **AND** its existing occurrences remain visible in the dates they belong to
- **AND** no further occurrence is generated for it

#### Scenario: Set a series pomodoro estimate in Settings

- **WHEN** user sets a series' pomodoro estimate to `4`
- **THEN** occurrences generated after that point carry `pomoEstimate` `4`

#### Scenario: Delete a series in Settings

- **WHEN** user deletes a series in the Recurring panel
- **THEN** the series is removed from the store
- **AND** every task carrying that `seriesId` is removed from the store

#### Scenario: Delete asks before removing a series' occurrences

- **WHEN** user activates delete on a series that has generated occurrences
- **THEN** the number of occurrences that will be removed is surfaced before the removal is confirmed

### Requirement: The Recurring weekday selector respects the first day of week

The weekday selector SHALL render the seven days in an order beginning with the planner's configured `weekStartDay`. The values it writes SHALL be absolute day-of-week numbers in `0..6` regardless of the rendered order, so changing the first day of week changes only the display order and never the stored recurrence.

#### Scenario: Monday-first ordering by default

- **WHEN** `weekStartDay` is `1` (Monday)
- **THEN** the weekday toggles are ordered Monday through Sunday
- **AND** a series selected as Monday, Wednesday, Friday stores `weekdays` `[1, 3, 5]`

#### Scenario: Sunday-first ordering

- **WHEN** `weekStartDay` is `0` (Sunday)
- **THEN** the weekday toggles are ordered Sunday through Saturday
- **AND** a series selected as Sunday and Tuesday stores `weekdays` `[0, 2]`
