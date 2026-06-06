## ADDED Requirements

### Requirement: Persist configuration is statically type-checked

The shared `createValidatedPersist` helper SHALL return a value typed as zustand's `PersistOptions<S, S>` for the store type `S` it is configured for, and each of the four feature stores (`daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`) SHALL pass that helper's result to `persist` WITHOUT an `any` cast or an `@typescript-eslint/no-explicit-any` suppression. A misconfigured persist option (wrong `name` type, `storage` shape, or `onRehydrateStorage` shape) SHALL therefore surface as a TypeScript compile error rather than being silently accepted. This requirement constrains only the static typing of persistence configuration; the runtime rehydrate-validate-and-reset behaviour is unchanged and remains defined by the "Persist rehydration validates and falls back" requirement.

#### Scenario: Stores wire persistence without escape hatches

- **WHEN** the project is type-checked and linted
- **THEN** none of the four feature stores casts the `createValidatedPersist` result with `as any`
- **AND** none of them disables `@typescript-eslint/no-explicit-any` for that call
- **AND** `tsc` reports no errors

#### Scenario: A misconfigured persist option fails to compile

- **WHEN** a store passes an `onRehydrateStorage` or `storage` option whose shape does not match zustand's `PersistOptions` for that store type
- **THEN** TypeScript reports a compile error at the call site

### Requirement: Stores without explicit storage persist to localStorage

A feature store configured via `createValidatedPersist` WITHOUT an explicit `storage` option SHALL persist to `window.localStorage` using zustand's default JSON storage. The helper SHALL NOT emit a `storage: undefined` option, because zustand merges options as `{ storage: <localStorage default>, ...baseOptions }` and an explicit `undefined` would clobber that default and disable persistence (logging "the given storage is currently unavailable"). Stores that DO pass an explicit storage (the timer's debounced storage) SHALL use it unchanged.

#### Scenario: Tasks store persists without an explicit storage option

- **WHEN** the user creates a task in a store wired with `createValidatedPersist('daybox-tasks', …)` and no `storage` option
- **THEN** `localStorage.getItem('daybox-tasks')` contains the persisted tasks
- **AND** no "the given storage is currently unavailable" warning is logged

#### Scenario: Timer keeps its explicit storage

- **WHEN** the timer store is wired with `createValidatedPersist('daybox-timer', …, { storage })` using its debounced storage
- **THEN** the timer persists through that debounced storage, not the localStorage default
