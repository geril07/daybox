## Purpose

Persist all user data (tasks, groups, timer runtime/configuration, planner preferences, and theme) to localStorage across five independent keys, and provide export/import as JSON files for manual backup. Timer runtime state is persisted locally for reload recovery but is excluded from save snapshots.

## Requirements

### Requirement: All state persisted to localStorage

The system SHALL save tasks, groups, timer state, planner preferences, and theme to localStorage in five independent keys: `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`. The timer store SHALL persist its full state (runtime: `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`; configuration: `settings`) under `daybox-timer`. To prevent the timer's 1Hz `tick` from producing 1Hz localStorage writes, the timer store's persistence layer SHALL be debounced (the debounce policy and the rehydrate wall-clock-correction behaviour are defined in the `pomodoro-timer` capability). The planner's preferences (`weekStartDay`, `browseDate`) SHALL be persisted under `daybox-planner`. The theme SHALL be persisted under `daybox-theme` as a JSON object with `{ mode: 'light' | 'dark' | 'system', preset: string }`. The running app SHALL NOT read from or write to obsolete localStorage keys `daybox-app-store` or `daybox-settings`.

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

### Requirement: User can export data as JSON

The system SHALL allow users to download all restorable DayBox save snapshot data as a JSON file using the current save envelope. The snapshot SHALL include feature-owned slices for tasks, groups, timer settings, and planner preferences. View state, timer runtime state, Google Drive auth state, and theme SHALL NOT be included in the export.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (`daybox-export.json`) is downloaded with `envelopeVersion: 1`
- **AND** the file includes `exportedAt` and a nested `slices` object
- **AND** the `slices` object includes `tasks`, `groups`, `timerSettings`, and `planner`
- **AND** the file does not include top-level `timer`
- **AND** the file does not include timer runtime fields such as `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`, or `sessionPomoCount`
- **AND** the file does not include `theme`

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported current-envelope JSON file to restore save snapshot data into the owning stores. The import MUST accept the current nested envelope with `envelopeVersion: 1`, `exportedAt`, and `slices`. Import preparation SHALL parse the envelope, prepare every registered feature slice, normalize cross-slice invariants without mutating stores, and commit only after preparation succeeds and the user confirms replacement. Flat legacy JSON files with top-level `version: 2` or `version: 3` SHALL be rejected.

#### Scenario: Import current data

- **WHEN** user selects a current-envelope JSON file via the "Import" button in settings
- **THEN** the file is prepared through data-portability without mutating stores
- **AND** after the user confirms replacement, tasks, groups, timer settings, and planner preferences are replaced with the prepared snapshot data
- **AND** theme is left unchanged

#### Scenario: Import flat legacy data is rejected

- **WHEN** user selects a flat `version: 2` or `version: 3` JSON file via the "Import" button in settings
- **THEN** preparation fails with `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no confirmation dialog is shown for committing that file
- **AND** no store state is modified

#### Scenario: Import confirms before committing

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced

#### Scenario: Import cancellation preserves local data

- **WHEN** user selects a JSON file that prepares successfully and then cancels the confirmation dialog
- **THEN** no store state is modified

### Requirement: Import applies a per-layer validation policy

The system SHALL prepare imported snapshot JSON through the data-portability pipeline. Envelope failures and current slice payload failures SHALL reject the whole import. Repairable cross-reference failures SHALL be normalized before commit and returned as warnings. Prepared imports SHALL be committed all-or-nothing; the app SHALL NOT partially apply valid snapshot sections when another current snapshot section is invalid.

#### Scenario: Current import with a malformed task is rejected

- **WHEN** a user imports a current snapshot containing 10 valid tasks and 1 task missing its `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no task, group, timer, or planner data is committed

#### Scenario: Current import with duplicate ids is rejected

- **WHEN** a user imports a current snapshot whose tasks or groups contain duplicate `id` values
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no task, group, timer, or planner data is committed

#### Scenario: Current import with a dangling groupId is normalized

- **WHEN** a user imports a current snapshot where task T points at group G that does not exist
- **THEN** preparation returns `{ ok: true, snapshot: <prepared snapshot>, warnings: [...] }`
- **AND** task T is prepared with `groupId: DEFAULT_GROUP_ID`
- **AND** `warnings` notes the dangling reference
- **AND** no store state is modified until the prepared snapshot is committed

#### Scenario: Current import missing default group is normalized

- **WHEN** a user imports a current snapshot whose groups do not include the canonical default group
- **THEN** preparation returns `{ ok: true, snapshot: <prepared snapshot>, warnings: [...] }`
- **AND** the prepared snapshot includes a valid default group
- **AND** `warnings` notes that the default group was restored

#### Scenario: Envelope failure rejects the import

- **WHEN** a user imports a JSON file missing current `envelopeVersion: 1`
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no store state is modified

### Requirement: Persist rehydration validates and falls back

The system SHALL validate the persisted blob for each of the four feature stores (`daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`) on app load using its feature's schema. On failure, the store SHALL be initialized to its default state and a `console.warn` SHALL be emitted once. The on-disk blob SHALL NOT be deleted automatically; the next successful write replaces it.

#### Scenario: Corrupt tasks blob resets to empty

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a blob that fails `TaskSchema`
- **THEN** the task store starts with `tasks: []`
- **AND** `console.warn` is called once

#### Scenario: Valid tasks blob is used as-is

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a valid blob
- **THEN** the task store starts with the persisted tasks
- **AND** no warn is emitted

### Requirement: Persist configuration is statically type-checked

The shared `createValidatedRehydrate` helper SHALL return a value typed as the `onRehydrateStorage` shape of zustand's `PersistOptions<S>` for the store type `S` it is configured for (re-exported from the helper module as `OnRehydrateStorage<S>`), and each feature store (`daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, `daybox-google-drive`) SHALL construct its `persist` call-site options object with `name` set to its storage key and `onRehydrateStorage` set to the result of `createValidatedRehydrate` for its store type. Stores SHALL NOT cast the helper's return value with `as any` and SHALL NOT suppress `@typescript-eslint/no-explicit-any` for that call. A misconfigured persist option (wrong `name` type, `storage` shape, `partialize` shape, or `onRehydrateStorage` shape) SHALL therefore surface as a TypeScript compile error rather than being silently accepted. This requirement constrains only the static typing of persistence configuration; the runtime rehydrate-validate-and-reset behaviour is unchanged and remains defined by the "Persist rehydration validates and falls back" requirement.

#### Scenario: Stores wire persistence without escape hatches

- **WHEN** the project is type-checked and linted
- **THEN** none of the five feature stores casts the `createValidatedRehydrate` result with `as any`
- **AND** none of them disables `@typescript-eslint/no-explicit-any` for that call
- **AND** `tsc` reports no errors

#### Scenario: A misconfigured persist option fails to compile

- **WHEN** a store passes an `onRehydrateStorage`, `storage`, `partialize`, or `name` option whose shape does not match zustand's `PersistOptions` for that store type
- **THEN** TypeScript reports a compile error at the call site

### Requirement: Persist options other than onRehydrateStorage are owned by the call site

The `name`, `storage`, and `partialize` fields of the zustand `persist` options object SHALL be set directly at each store's call site and SHALL NOT be proxied through `createValidatedRehydrate`. The helper exists only to wrap `onRehydrateStorage` with schema validation and a default-reset on failure; it has no other configuration surface. This rule ensures the helper's return type is narrow (the `onRehydrateStorage` shape of `PersistOptions<S>`) and that no persist option can be silently dropped or mis-shimmed between the helper and zustand.

#### Scenario: The helper return type is OnRehydrateStorage

- **WHEN** a developer reads the type of `createValidatedRehydrate<TaskStore>(...)` in a TypeScript-aware editor
- **THEN** the inferred type is assignable to zustand's `PersistOptions<TaskStore>['onRehydrateStorage']`
- **AND** the inferred type is NOT assignable to zustand's `PersistOptions<TaskStore, TaskStore, unknown>`

#### Scenario: The helper does not accept name, storage, or partialize

- **WHEN** a developer writes `createValidatedRehydrate<TaskStore>({ name: 'daybox-tasks', schema: Schema, init, storage: ... })`
- **THEN** TypeScript reports a compile error because the helper's options-object argument does not include a `storage` field

### Requirement: Stores without explicit storage persist to localStorage

A feature store whose `persist` call-site options object does NOT include a `storage` field SHALL persist to `window.localStorage` using zustand's default JSON storage. The call site SHALL NOT emit a `storage: undefined` option, because zustand merges options as `{ storage: <localStorage default>, ...baseOptions }` and an explicit `undefined` would clobber that default and disable persistence (logging "the given storage is currently unavailable"). Stores that DO pass an explicit storage (the timer's debounced storage) SHALL use it unchanged.

#### Scenario: Tasks store persists without an explicit storage option

- **WHEN** the user creates a task in a store whose `persist` call-site options object contains `name: 'daybox-tasks'` and an `onRehydrateStorage` built by `createValidatedRehydrate`, and does NOT contain a `storage` field
- **THEN** `localStorage.getItem('daybox-tasks')` contains the persisted tasks
- **AND** no "the given storage is currently unavailable" warning is logged

#### Scenario: Timer keeps its explicit storage

- **WHEN** the timer store's `persist` call-site options object contains `name: 'daybox-timer'`, `storage: createJSONStorage(() => timerStorage)` using its debounced storage, and an `onRehydrateStorage` built by `createValidatedRehydrate`
- **THEN** the timer persists through that debounced storage, not the localStorage default

### Requirement: Helper takes a single options-object argument

The `createValidatedRehydrate` helper SHALL take a single options-object argument with the shape `{ name: string; schema: ZodSchemaLike; init: Partial<S>; afterValidate?: (state: S) => void }`. The helper SHALL NOT take positional parameters. The `afterValidate` field, when provided, SHALL fire only after a successful rehydrate AND successful schema validation; it SHALL NOT receive a rehydration error parameter (YAGNI — no current consumer observes rehydration errors).

#### Scenario: The helper is invoked with an options object

- **WHEN** a developer reads the type signature of `createValidatedRehydrate` in a TypeScript-aware editor
- **THEN** the function is declared as taking a single `ValidatedRehydrateOptions<S>` argument
- **AND** the `ValidatedRehydrateOptions<S>` interface is exported and has exactly four fields: `name`, `schema`, `init`, and an optional `afterValidate`

#### Scenario: A misconfigured helper option fails to compile

- **WHEN** a store passes `createValidatedRehydrate<TaskStore>({ name: 'daybox-tasks', schema: TaskStateSchema, init: taskInit, afterValidate: 'not a function' })`
- **THEN** TypeScript reports a compile error because `'not a function'` is not assignable to `(state: TaskStore) => void`

#### Scenario: afterValidate fires only after validation succeeds

- **WHEN** the persisted blob for `daybox-tasks` is valid against `TaskStateSchema` and the store rehydrates
- **THEN** the `afterValidate` hook (if provided) is invoked with the rehydrated state

#### Scenario: afterValidate does not fire when rehydration itself fails

- **WHEN** the storage adapter throws while reading the persisted blob for `daybox-tasks`
- **THEN** the `afterValidate` hook (if provided) is NOT invoked
- **AND** the store falls back to its factory initial state
