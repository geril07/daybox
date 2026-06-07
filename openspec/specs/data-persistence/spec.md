## Purpose

Persist all user data (tasks, groups, timer configuration, planner preferences, and theme) to localStorage across five independent keys, and provide export/import as JSON files for manual backup. Timer runtime state is ephemeral and not persisted.

## Requirements

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

### Requirement: User can export data as JSON

The system SHALL allow users to download all app data (tasks, groups, timer state, planner preferences, theme) as a JSON file with `version: 3`. View state and timer runtime state SHALL NOT be included in the export.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (`daybox-export.json`) is downloaded with `version: 3` and the five sections `tasks`, `groups`, `timer`, `planner`, `theme`

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported JSON file to restore data into the five persisted stores. The import MUST accept files with `version: 2` (legacy single-settings shape) and `version: 3` (current five-key shape).

#### Scenario: Import v3 data

- **WHEN** user selects a `version: 3` JSON file via the "Import" button in settings
- **THEN** all five persisted stores are replaced with the imported data

#### Scenario: Import v2 data

- **WHEN** user selects a `version: 2` JSON file via the "Import" button in settings
- **THEN** `tasks` and `groups` are restored as-is
- **AND** `settings.timer` is written to the timer's settings slice
- **AND** `settings.weekStartDay` is written to the planner store
- **AND** `settings.theme` is written to the theme store

#### Scenario: Import confirms before overwriting

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced

### Requirement: One-shot migration from single store

The system SHALL migrate existing localStorage data from the old `daybox-app-store` key to the five new keys on first load after deploy, and delete the old key.

#### Scenario: Migration runs on first load

- **WHEN** a user loads the app and `daybox-app-store` exists in localStorage
- **THEN** the old state is written to `daybox-tasks`, `daybox-groups`, and `daybox-settings` (intermediate) and `daybox-app-store` is deleted

#### Scenario: Migration does not run on subsequent loads

- **WHEN** a user loads the app and `daybox-app-store` does not exist
- **THEN** migration is skipped

### Requirement: One-shot migration from god-settings key

The system SHALL migrate existing localStorage data from the intermediate `daybox-settings` key (introduced in the v1 split) to the per-feature keys on first load after this deploy, and delete `daybox-settings`.

#### Scenario: Migration runs on first load with daybox-settings

- **WHEN** a user loads the app, `daybox-app-store` does not exist, and `daybox-settings` exists
- **THEN** `settings.timer` is written to the timer's settings slice
- **AND** `settings.weekStartDay` is written to the planner store
- **AND** `settings.theme` is written to the theme store
- **AND** `daybox-settings` is deleted

#### Scenario: Migration is idempotent

- **WHEN** a user loads the app and `daybox-settings` does not exist
- **THEN** the migration is skipped and the five feature-owned keys are read directly

### Requirement: Import applies a per-layer validation policy

The system SHALL validate every imported export JSON through a per-layer policy: envelope hard-fail, per-record warn+skip, cross-reference warn+reassign, optional-field coerce. The full policy is defined in the `data-validation` capability. `parseImport` SHALL return `{ success: false, error }` on envelope failure, and `{ success: true, data, warnings? }` otherwise. `warnings` SHALL be present whenever any record was dropped or any reference was reassigned.

#### Scenario: v3 import with a malformed task

- **WHEN** a user imports a v3 file containing 10 valid tasks and 1 task missing its `id`
- **THEN** the result is `{ success: true, data: { tasks: <10 valid tasks>, ... } }`
- **AND** `warnings` contains a reason naming the dropped task

#### Scenario: v3 import with a dangling groupId

- **WHEN** a user imports a v3 file where task T points at group G that does not exist
- **THEN** task T is imported with `groupId: 'default'`
- **AND** `warnings` notes the dangling reference

#### Scenario: v3 import with an unrecognized theme

- **WHEN** a user imports a v3 file with `theme: 'sepia'`
- **THEN** the imported theme is `'light'` (default)
- **AND** no warning is added (optional-layer coercion is silent)

#### Scenario: Envelope failure rejects the import

- **WHEN** a user imports a JSON file missing the `version` field
- **THEN** the result is `{ success: false, error: 'Not a DayBox export file.' }`
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

### Requirement: Legacy migrations validate before writing

The system SHALL validate the parsed `daybox-app-store` and `daybox-settings` legacy blobs against their expected shape (using zod) before writing to the new feature stores. On validation failure, the affected migration SHALL be skipped and a `console.warn` SHALL be emitted. The legacy key SHALL be removed regardless of whether the migration succeeded (so a bad blob doesn't keep re-firing).

#### Scenario: Legacy daybox-app-store migration with valid shape

- **WHEN** the app loads and `daybox-app-store` exists with a valid v1 shape
- **THEN** `tasks`, `groups`, and `settings` are migrated to the new feature stores
- **AND** the legacy key is removed

#### Scenario: Legacy daybox-app-store migration with invalid shape

- **WHEN** the app loads and `daybox-app-store` exists with a shape that fails the migration schema
- **THEN** the migration is skipped (new feature stores keep their current state)
- **AND** `console.warn` is emitted
- **AND** the legacy key is removed

#### Scenario: Legacy daybox-settings migration with valid shape

- **WHEN** the app loads and `daybox-settings` exists with a valid v1 shape
- **THEN** `settings.timer`, `settings.weekStartDay`, and `settings.theme` are written to the relevant feature stores
- **AND** the legacy key is removed

#### Scenario: Legacy daybox-settings migration with invalid shape

- **WHEN** the app loads and `daybox-settings` exists with a shape that fails the migration schema
- **THEN** the migration is skipped
- **AND** `console.warn` is emitted
- **AND** the legacy key is removed

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
