## MODIFIED Requirements

### Requirement: All state persisted to localStorage

The system SHALL save tasks, groups, timer state, planner preferences, and theme to localStorage in five independent keys: `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`. The timer store SHALL persist its full state (runtime: `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`; configuration: `settings`) under `daybox-timer`. To prevent the timer's 1Hz `tick` from producing 1Hz localStorage writes, the timer store's persistence layer SHALL be debounced (the debounce policy and the rehydrate wall-clock-correction behaviour are defined in the `pomodoro-timer` capability). The planner's preferences (`weekStartDay`, `browseDate`) SHALL be persisted under `daybox-planner`. The theme (`light` or `dark`) SHALL be persisted under `daybox-theme`. The legacy `daybox-settings` key SHALL NOT be used by the running app.

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

## ADDED Requirements

### Requirement: Legacy migrations validate per-record

The `migrateLegacyAppStore` function (in `src/app/bootstrap.ts`) SHALL validate every record inside the `daybox-app-store` legacy blob against its per-record schema before writing to the live store. The validation layer used for records SHALL be the `record` layer of `safeParseAndRoute` (warn + skip), matching the policy used by `parseImport`. Tasks are validated against `TaskSchema`; groups are validated against `GroupSchema`. Records that fail validation SHALL be dropped (not written), and a `console.warn` SHALL be emitted identifying the dropped record. Records that pass validation SHALL be written to the corresponding feature store in a single `setState` call.

The legacy `daybox-app-store` key SHALL be removed after the migration runs, regardless of whether any records passed validation (so a malformed legacy blob does not keep re-firing on every load).

Envelope-level validation (the outer `LegacyAppStoreSchema`) is unchanged: an envelope that fails validation aborts the migration with a `console.warn` and removes the legacy key.

#### Scenario: Legacy blob with all valid records migrates fully

- **WHEN** `daybox-app-store` exists with a valid envelope and 5 tasks + 2 groups, all of which pass `TaskSchema` / `GroupSchema`
- **THEN** all 5 tasks and both groups are written to their feature stores
- **AND** the legacy key is removed

#### Scenario: Legacy blob with one malformed task drops only that task

- **WHEN** `daybox-app-store` exists with 5 tasks, where task 3 is missing its `id` field
- **THEN** the 4 valid tasks are written to `useTaskStore`
- **AND** task 3 is not written
- **AND** a `console.warn` is emitted naming the dropped record
- **AND** the legacy key is removed

#### Scenario: Legacy blob with a malformed group drops only that group

- **WHEN** `daybox-app-store` exists with 3 groups, where group 2 has an empty `name`
- **THEN** the 2 valid groups are written to `useGroupStore`
- **AND** group 2 is not written
- **AND** a `console.warn` is emitted

#### Scenario: Legacy blob envelope failure aborts the migration

- **WHEN** `daybox-app-store` exists with a shape that fails `LegacyAppStoreSchema` (e.g. `state` is a string, not an object)
- **THEN** the migration is skipped
- **AND** no store state is modified
- **AND** a `console.warn` is emitted
- **AND** the legacy key is removed

#### Scenario: All legacy records malformed produces no writes

- **WHEN** `daybox-app-store` exists with a valid envelope but every task and group fails its per-record schema
- **THEN** no store state is modified (no empty-array writes that would clobber existing data)
- **AND** a `console.warn` is emitted for each dropped record
- **AND** the legacy key is removed
