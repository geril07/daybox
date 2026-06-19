## Purpose

A settings drawer opened from the header. The drawer hosts feature-owned panels (Timer, Display, Data export/import). Each panel reads and writes its own feature's store; the drawer itself owns no persisted data beyond the open/close UI state. Group CRUD is NOT mounted in the settings drawer; it lives in the sidebar (governed by `group-management`).

## Requirements

### Requirement: Settings drawer opens from header

The system SHALL open a settings drawer when the gear icon in the header is clicked.

#### Scenario: Open settings

- **WHEN** user clicks the gear icon
- **THEN** a drawer slides in from the right with a backdrop overlay

#### Scenario: Close settings

- **WHEN** user clicks the backdrop or close button
- **THEN** the settings drawer closes

### Requirement: Settings drawer avoids initial editable focus

The system SHALL move focus inside the Settings drawer when it opens without initially focusing a text-editing or numeric input.

#### Scenario: Open settings drawer on mobile

- **WHEN** the user opens the Settings drawer on a mobile viewport
- **THEN** focus is placed inside the drawer without activating the first timer duration input
- **THEN** the virtual keyboard remains closed until the user explicitly focuses an editable input

#### Scenario: Keyboard navigation after drawer open

- **WHEN** the Settings drawer has opened with focus on the drawer surface
- **THEN** pressing Tab moves focus to the drawer's interactive controls
- **THEN** focus remains constrained to the open drawer until it is closed

### Requirement: User can switch theme

The system SHALL allow users to choose a theme preset and mode. The available modes SHALL be light, dark, and system-auto. The selected preset and mode SHALL be persisted as a `{ mode, preset }` object under `daybox-theme` and applied to `<html>` via the `app/theme.ts` hook and associated theme preset system.

#### Scenario: Select a theme preset

- **WHEN** user selects a different theme preset (e.g., Nord)
- **THEN** the UI switches to that preset's color scheme
- **AND** the current mode (light/dark) is preserved if the preset supports it

#### Scenario: Switch between light, dark, and system mode

- **WHEN** user switches mode from dark to system
- **THEN** the UI follows the OS color scheme preference
- **AND** changes to the OS preference update the UI without a page reload

#### Scenario: Toggle dark theme (manual)

- **WHEN** user selects dark mode
- **THEN** the UI switches to the dark variant of the current preset

#### Scenario: Toggle light theme (manual)

- **WHEN** user selects light mode
- **THEN** the UI switches to the light variant of the current preset

#### Scenario: Persist theme

- **WHEN** user selects a preset and mode, then reloads the page
- **THEN** the UI renders with the same preset and mode
- **AND** the default preset renders correctly on first paint (no flash)

#### Scenario: Mode selector shows only available modes

- **WHEN** the current preset only defines a dark mode
- **THEN** the UI only offers dark mode (not light or system)
- **AND** the mode is auto-selected
- **AND** system is omitted because following the OS requires both light and dark variants for the selected preset

### Requirement: Settings drawer hosts feature-owned panels

The settings drawer SHALL display sections that mount panels from the relevant features. Each section's data is owned by the mounting feature, not by the settings drawer. Group CRUD is NOT mounted in the settings drawer; it lives in the sidebar (governed by `group-management`).

#### Scenario: Timer section mounts the timer's settings panel

- **WHEN** user opens the settings drawer to the Timer section
- **THEN** the timer's `TimerSettingsPanel` is mounted and reads/writes `useTimerStore`
