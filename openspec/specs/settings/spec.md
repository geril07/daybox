## Purpose

A settings drawer opened from the header. The drawer hosts feature-owned panels (Timer, Display, Groups, Data export/import). Each panel reads and writes its own feature's store; the drawer itself owns no persisted data beyond the open/close UI state.

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
