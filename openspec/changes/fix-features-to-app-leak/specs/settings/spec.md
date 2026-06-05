## MODIFIED Requirements

### Requirement: Settings drawer opens from header

The system SHALL open a settings drawer when the gear icon in the header is clicked.

#### Scenario: Open settings

- **WHEN** user clicks the gear icon
- **THEN** a drawer slides in from the right with a backdrop overlay

#### Scenario: Close settings

- **WHEN** user clicks the backdrop or close button
- **THEN** the settings drawer closes

### Requirement: User can switch theme

The system SHALL allow users to toggle between light and dark themes. The selected theme SHALL be persisted under `daybox-theme` and applied to `<html>` via the `app/theme.ts` hook.

#### Scenario: Toggle dark theme

- **WHEN** user toggles dark theme on
- **THEN** the UI switches to dark color scheme

#### Scenario: Persist theme

- **WHEN** user toggles dark theme on and reloads the page
- **THEN** the UI is rendered in dark mode on first paint

### Requirement: Settings drawer hosts feature-owned panels

The settings drawer SHALL display sections that mount panels from the relevant features. Each section's data is owned by the mounting feature, not by the settings drawer.

#### Scenario: Timer section mounts the timer's settings panel

- **WHEN** user opens the settings drawer to the Timer section
- **THEN** the timer's `TimerSettingsPanel` is mounted and reads/writes `useTimerStore`

#### Scenario: Groups section mounts the groups management panel

- **WHEN** user opens the settings drawer to the Groups section
- **THEN** the groups' `GroupSettingsPanel` is mounted and reads/writes `useGroupStore` (and the `useTaskStore` cascade behaviour)

## REMOVED Requirements

### Requirement: User can configure timer durations
**Reason**: The data is now owned by the timer's own store; see the `pomodoro-timer` capability for the storage and UI requirements.
**Migration**: No user-visible change; the panel reads from `useTimerStore` instead of `useSettingsStore`.

### Requirement: User can configure long-break interval
**Reason**: Moved to the `pomodoro-timer` capability.
**Migration**: No user-visible change.

### Requirement: User can toggle auto-start
**Reason**: Moved to the `pomodoro-timer` capability.
**Migration**: No user-visible change.

### Requirement: User can select alarm sound
**Reason**: Moved to the `pomodoro-timer` capability.
**Migration**: No user-visible change.

### Requirement: User can adjust alarm volume
**Reason**: Moved to the `pomodoro-timer` capability.
**Migration**: No user-visible change.

### Requirement: User can set alarm repeat count
**Reason**: Moved to the `pomodoro-timer` capability.
**Migration**: No user-visible change.

### Requirement: User can configure first day of week
**Reason**: The first day of the week is now a planner preference; see the `planner-preferences` and `time-views` capabilities.
**Migration**: No user-visible change; the value is read from `usePlannerStore` instead of `useSettingsStore`.

### Requirement: User can manage groups in settings
**Reason**: The group CRUD requirements are owned by the `group-management` capability. The settings drawer is one of multiple hosts for the group management UI; the requirement that the drawer contains a Groups section is captured by the new "Settings drawer hosts feature-owned panels" requirement above.
**Migration**: No user-visible change. The Groups section continues to mount the group management panel.
