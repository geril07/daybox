## MODIFIED Requirements

### Requirement: All state persisted to localStorage

The system SHALL save tasks, groups, timer state, planner preferences, and theme to localStorage in five independent keys: `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`. The timer store SHALL persist its full state (runtime: `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`; configuration: `settings`) under `daybox-timer`. To prevent the timer's 1Hz `tick` from producing 1Hz localStorage writes, the timer store's persistence layer SHALL be debounced (the debounce policy and the rehydrate wall-clock-correction behaviour are defined in the `pomodoro-timer` capability). The planner's preferences (`weekStartDay`, `browseDate`, and `dayStartMinutes`) SHALL be persisted under `daybox-planner`, where `dayStartMinutes` is an integer from `0` through `1439` and defaults to `0`. The theme SHALL be persisted under `daybox-theme` as a JSON object with `{ mode: 'light' | 'dark' | 'system', preset: string }`. The running app SHALL NOT read from or write to obsolete localStorage keys `daybox-app-store` or `daybox-settings`.

#### Scenario: Tasks persist on reload

- **WHEN** user creates a task and reloads the page
- **THEN** the task appears in the same state as before reload

#### Scenario: Groups persist on reload

- **WHEN** user creates a group and reloads the page
- **THEN** the group appears in the same state as before reload

#### Scenario: Timer configuration persists on reload

- **WHEN** user changes the focus duration to 30 minutes and reloads the page
- **THEN** the timer uses 30 minutes for focus intervals

#### Scenario: Planner preferences persist on reload

- **WHEN** user sets the first day of the week to Sunday and `dayStartMinutes` to `150` (02:30), then reloads the page
- **THEN** the Week view renders Sunday through Saturday
- **AND** the planner uses 02:30 as the day boundary

#### Scenario: Missing day-start preference keeps old planner data

- **WHEN** `daybox-planner` contains a valid older blob with `weekStartDay` and `browseDate` but no `dayStartMinutes`
- **THEN** the planner rehydrates the existing `weekStartDay` and `browseDate`
- **AND** `dayStartMinutes` is normalized to `0`
- **AND** the planner store is not reset

#### Scenario: Theme persists on reload

- **WHEN** user selects a theme preset and mode and reloads the page
- **THEN** the same preset and mode are restored after the JS theme module evaluates

#### Scenario: Default theme renders on first paint

- **WHEN** user selects the default theme preset and dark mode and reloads the page
- **THEN** the UI is rendered with the default preset in dark mode on first paint

#### Scenario: Timer runtime state persists and resumes on reload

- **WHEN** user is running a pomodoro and reloads the page
- **THEN** the timer continues from approximately where it was — the wall-clock delta since the last persisted `startedAt` is added to `elapsed`, and `startedAt` is updated to the current time, so the user sees the same remaining time
- **AND** the rehydrated `isRunning` is `true` and the rehydrated `phase` is unchanged

#### Scenario: Obsolete localStorage keys are ignored

- **WHEN** the app loads and localStorage contains `daybox-app-store` or `daybox-settings`
- **THEN** app startup does not read, migrate, rewrite, or delete those keys
- **AND** the feature stores hydrate from their current feature-owned persistence keys
