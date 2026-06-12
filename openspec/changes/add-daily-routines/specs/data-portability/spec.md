## MODIFIED Requirements

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting snapshot/restore logic in a dedicated `data-portability` feature at `src/features/data-portability/`. The data-portability feature SHALL own:

- The canonical snapshot envelope schema (currently v4, with `version`, `exportedAt`, and one field per registered slice).
- The version migrations that transform older envelope shapes into the current shape (e.g. v2 → v3 → v4).
- The slice registry that imports each participating feature's slice and exports the canonical ordered list.
- The `buildSnapshot` function that assembles the current envelope by calling each slice's `export`.
- The `validateSnapshot` function that parses an incoming JSON string, detects its version, applies any required migrations, and runs the envelope schema.
- The `applySnapshot` function that runs each slice's schema against its envelope field, calls the slice's `apply` for the valid slices, and performs any required cross-reference checks.

The data-portability feature SHALL NOT import from `src/app/*`. It MAY import from the barrels of other features (to read their slices) and from `src/shared/*` (for the `Slice<T>` interface, the `downloadAsFile` helper, and external packages).

The data-portability feature has no UI of its own. Its public surface is the functions and types in its barrel.

#### Scenario: The registry imports each participating feature's slice

- **WHEN** the data-portability feature is initialised
- **THEN** its `registry.ts` imports the slice from `@/features/tasks`, `@/features/groups`, `@/features/timer`, `@/features/planner`, and `@/features/routines`
- **AND** exports a `slices` array whose order is canonical (used as the iteration order for build, validate, and apply)
- **AND** a feature that wants to participate in snapshot/restore is added by importing its slice into `registry.ts` and adding it to the array

#### Scenario: The envelope schema defines the v4 shape

- **WHEN** `validateSnapshot` runs the envelope schema against a parsed JSON object
- **THEN** the schema requires `version: literal(4)`, `exportedAt: string`, and one field per registered slice (currently `tasks`, `groups`, `timer`, `planner`, `routines`)
- **AND** the schema does NOT require a `theme` field — theme is intentionally excluded from the snapshot (each device keeps its own theme)
- **AND** the schema MAY still accept an incoming `theme` field silently (backward compatibility with files exported by an earlier version) but the apply function does NOT use it

#### Scenario: The v2 envelope is migrated to v4

- **WHEN** `validateSnapshot` receives a JSON string with `version: 2`
- **THEN** the v2-to-v3 migration function transforms the v2 shape into the v3 shape
- **AND** `settings.timer` is lifted to the top-level `timer` field
- **AND** `settings.weekStartDay` and a fresh `browseDate: null` are combined into the top-level `planner` field
- **AND** `settings.theme` is dropped (not carried into v3)
- **AND** the v3-to-v4 migration adds an empty top-level `routines` field
- **AND** `version` is set to `4` and `exportedAt` is filled in if missing
- **AND** the resulting object is then validated by the v4 envelope schema

#### Scenario: The v3 envelope is migrated to v4

- **WHEN** `validateSnapshot` receives a JSON string with `version: 3`
- **THEN** the v3-to-v4 migration adds an empty top-level `routines` field
- **AND** `version` is set to `4`
- **AND** the resulting object is then validated by the v4 envelope schema

### Requirement: `buildSnapshot` assembles the current envelope

The system SHALL provide a `buildSnapshot` function in the data-portability feature that reads the current state of every registered slice and returns an object that conforms to the v4 envelope schema. The returned object SHALL be a plain JavaScript object (not a string); callers are responsible for serialising it.

#### Scenario: Building a snapshot includes every registered slice

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has `version: 4` and `exportedAt: <current ISO string>`
- **AND** for each slice in the registry, the slice's `export()` is called and the result is stored under the slice's `name`
- **AND** the order of fields in the returned object follows the order of slices in the registry

#### Scenario: Building a snapshot does not include the theme

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has no `theme` field
- **AND** the user's theme preference is left untouched by the build

## ADDED Requirements

### Requirement: Routines participate in snapshot and restore

The system SHALL include the routines feature in the snapshot/restore system through a `routinesSlice` exported from the routines feature barrel. The slice SHALL export and apply the routines feature state, including routine definitions and `stepCompletionsByDate`.

#### Scenario: Snapshot includes routines

- **WHEN** `buildSnapshot` is called and routines exist
- **THEN** the returned envelope includes a `routines` field containing the routines feature state

#### Scenario: Apply restores routines

- **WHEN** `applySnapshot` is called with a valid envelope containing routines
- **THEN** the routines store is updated with the imported routine state

#### Scenario: Invalid routines field is dropped with warning

- **WHEN** `applySnapshot` receives an envelope whose `routines` field fails routines schema validation
- **THEN** the routines slice is not applied
- **AND** the apply result includes a warning naming the routines field
