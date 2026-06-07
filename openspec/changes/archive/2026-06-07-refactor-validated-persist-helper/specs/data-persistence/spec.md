## MODIFIED Requirements

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
