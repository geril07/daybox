## MODIFIED Requirements

### Requirement: All state persisted to localStorage

The system SHALL save tasks, groups, timer state, planner preferences, and theme to localStorage in five independent keys: `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`. The timer store SHALL persist its full state (runtime: `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`; configuration: `settings`) under `daybox-timer`. To prevent the timer's 1Hz `tick` from producing 1Hz localStorage writes, the timer store's persistence layer SHALL be debounced (the debounce policy and the rehydrate wall-clock-correction behaviour are defined in the `pomodoro-timer` capability). The planner's preferences (`weekStartDay`, `browseDate`) SHALL be persisted under `daybox-planner`. The theme (`light` or `dark`) SHALL be persisted under `daybox-theme`. The running app SHALL NOT read from or write to obsolete localStorage keys `daybox-app-store` or `daybox-settings`.

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

- **WHEN** user sets the first day of the week to Sunday and reloads the page
- **THEN** the Week view renders Sunday through Saturday

#### Scenario: Theme persists on reload

- **WHEN** user toggles dark theme on and reloads the page
- **THEN** the UI is rendered in dark mode on first paint

#### Scenario: Timer runtime state persists and resumes on reload

- **WHEN** user is running a pomodoro and reloads the page
- **THEN** the timer continues from approximately where it was — the wall-clock delta since the last persisted `startedAt` is added to `elapsed`, and `startedAt` is updated to the current time, so the user sees the same remaining time
- **AND** the rehydrated `isRunning` is `true` and the rehydrated `phase` is unchanged

#### Scenario: Obsolete localStorage keys are ignored

- **WHEN** the app loads and localStorage contains `daybox-app-store` or `daybox-settings`
- **THEN** app startup does not read, migrate, rewrite, or delete those keys
- **AND** the feature stores hydrate from their current feature-owned persistence keys

## REMOVED Requirements

### Requirement: One-shot migration from single store

**Reason**: `daybox-app-store` is an obsolete pre-production storage layout, and compatibility with old localStorage blobs is no longer required.

**Migration**: None. Users with old pre-production data can clear localStorage or import a current save snapshot if they have one.

### Requirement: One-shot migration from god-settings key

**Reason**: `daybox-settings` is an obsolete intermediate pre-production storage layout, and compatibility with old localStorage blobs is no longer required.

**Migration**: None. The current app persists timer, planner, and theme state through feature-owned keys.

### Requirement: Legacy migrations validate before writing

**Reason**: The legacy boot migrations are being removed, so there is no longer a boot-time validation path for `daybox-app-store` or `daybox-settings` blobs.

**Migration**: None. Current persisted blobs continue to be validated by each feature store's rehydration policy.

### Requirement: Legacy migrations validate per-record

**Reason**: The per-record validation only existed inside `migrateLegacyAppStore`, which is being removed with the obsolete `daybox-app-store` compatibility path.

**Migration**: None. Current snapshot imports and current store rehydration retain their own validation policies.
