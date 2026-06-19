## MODIFIED Requirements

### Requirement: Settings drawer hosts feature-owned panels

The settings drawer SHALL display sections that mount panels from the relevant features. Each section's data is owned by the mounting feature, not by the settings drawer. Group CRUD is NOT mounted in the settings drawer; it lives in the sidebar (governed by `group-management`).

#### Scenario: Timer section mounts the timer's settings panel

- **WHEN** user opens the settings drawer to the Timer section
- **THEN** the timer's `TimerSettingsPanel` is mounted and reads/writes `useTimerStore`
