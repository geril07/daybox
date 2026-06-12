## MODIFIED Requirements

### Requirement: Settings drawer hosts feature-owned panels

The settings drawer SHALL display sections that mount panels from the relevant features. Each section's data is owned by the mounting feature, not by the settings drawer.

#### Scenario: Timer section mounts the timer's settings panel

- **WHEN** user opens the settings drawer to the Timer section
- **THEN** the timer's `TimerSettingsPanel` is mounted and reads/writes `useTimerStore`

#### Scenario: Groups section mounts the groups management panel

- **WHEN** user opens the settings drawer to the Groups section
- **THEN** the groups' `GroupSettingsPanel` is mounted and reads/writes `useGroupStore` (and the `useTaskStore` cascade behaviour)

#### Scenario: Routines section mounts the routines management panel

- **WHEN** user opens the settings drawer to the Routines section
- **THEN** the routines' `RoutineSettingsPanel` is mounted and reads/writes `useRoutineStore`

## ADDED Requirements

### Requirement: Settings can manage routines

The system SHALL expose routine definition management in Settings. Users SHALL be able to create, rename, activate/deactivate, delete, and reorder routines from Settings.

#### Scenario: Create routine in settings

- **WHEN** user types a routine name in the routines settings panel and confirms
- **THEN** a new active routine is created with that name

#### Scenario: Deactivate routine in settings

- **WHEN** user toggles a routine inactive in settings
- **THEN** that routine no longer appears in Today

#### Scenario: Delete routine in settings

- **WHEN** user deletes a routine in settings
- **THEN** the routine is removed from the routines store

### Requirement: Settings can manage routine steps

The system SHALL expose step management inside each routine in Settings. Users SHALL be able to add, edit, activate/deactivate, delete, and reorder routine steps from Settings.

#### Scenario: Add step in settings

- **WHEN** user adds a step to a routine in settings
- **THEN** the step appears in that routine's step list

#### Scenario: Edit step in settings

- **WHEN** user edits a step title in settings
- **THEN** the step title is updated anywhere that step is shown

#### Scenario: Reorder steps in settings

- **WHEN** user reorders steps inside a routine in settings
- **THEN** the updated order is used in the Today routine card
