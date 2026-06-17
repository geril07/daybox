## MODIFIED Requirements

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
