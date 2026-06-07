## Purpose

Define the cross-cutting snapshot/restore mechanics that DayBox uses for backup, restore, and portability: the per-feature `Slice<T>` contract, the canonical v3 envelope, the slice registry, the build/validate/apply pipeline, the v2-to-v3 envelope migration, and the cross-reference check that runs during apply. Behavioural rules for individual features live in their own capability files; this capability only governs the _wire format_ and the orchestrator.

## Requirements

### Requirement: Features participate in snapshot/restore by exposing a slice

The system SHALL allow each feature that owns a piece of persisted data to expose that data to the snapshot/restore system through a `Slice<T>` value exported from the feature's barrel. A slice is the feature's public contribution to the snapshot envelope: it knows how to read the feature's current state, how to validate incoming data against the feature's schema, and how to apply the validated data back to the feature's store.

A `Slice<T>` SHALL have the shape:

```ts
interface Slice<T> {
  name: string // unique key in the envelope
  schema: ZodType<T> // per-record / per-slice validator
  export: () => T // read the current state
  apply: (data: T) => void // write the state
}
```

The `Slice<T>` interface is defined in `src/shared/utils/slice.ts` and is imported by every feature that exposes a slice and by the data-portability feature that consumes the slices. A feature that does not participate in snapshot/restore (such as a UI-only feature) is not required to expose a slice.

#### Scenario: A feature exposes a slice

- **WHEN** a feature owns data that is part of the snapshot
- **THEN** the feature folder contains a `slice.ts` that exports a `Slice<T>` value
- **AND** the slice is re-exported from the feature's barrel (`index.ts`)
- **AND** the slice's `name` matches the field name used in the snapshot envelope (e.g. `'tasks'`, `'groups'`, `'timer'`, `'planner'`)
- **AND** the slice's `schema` is the zod schema that validates a single record (or the slice's full state, if the slice's state is a single object rather than an array of records)

#### Scenario: A feature without persisted data does not expose a slice

- **WHEN** a feature is purely UI-driven or is otherwise stateless
- **THEN** the feature folder has no `slice.ts`
- **AND** the feature is simply absent from the snapshot envelope
- **AND** this is not a violation of any other requirement

#### Scenario: A slice's apply rejects bad data via the schema

- **WHEN** `applySnapshot` runs the slice's schema against the incoming data
- **AND** the schema returns `success: false`
- **THEN** the slice's `apply` is NOT called for that field
- **AND** a warning is added to the apply result naming the dropped field and the validation reason
- **AND** the other slices are still applied

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting snapshot/restore logic in a dedicated `data-portability` feature at `src/features/data-portability/`. The data-portability feature SHALL own:

- The canonical snapshot envelope schema (currently v3, with `version`, `exportedAt`, and one field per registered slice).
- The version migrations that transform older envelope shapes into the current shape (e.g. v2 → v3).
- The slice registry that imports each participating feature's slice and exports the canonical ordered list.
- The `buildSnapshot` function that assembles the current envelope by calling each slice's `export`.
- The `validateSnapshot` function that parses an incoming JSON string, detects its version, applies any required migrations, and runs the envelope schema.
- The `applySnapshot` function that runs each slice's schema against its envelope field, calls the slice's `apply` for the valid slices, and performs any required cross-reference checks.

The data-portability feature SHALL NOT import from `src/app/*`. It MAY import from the barrels of other features (to read their slices) and from `src/shared/*` (for the `Slice<T>` interface, the `downloadAsFile` helper, and external packages).

The data-portability feature has no UI of its own. Its public surface is the functions and types in its barrel.

#### Scenario: The registry imports each participating feature's slice

- **WHEN** the data-portability feature is initialised
- **THEN** its `registry.ts` imports the slice from `@/features/tasks`, `@/features/groups`, `@/features/timer`, and `@/features/planner`
- **AND** exports a `slices` array whose order is canonical (used as the iteration order for build, validate, and apply)
- **AND** a feature that wants to participate in snapshot/restore is added by importing its slice into `registry.ts` and adding it to the array

#### Scenario: The envelope schema defines the v3 shape

- **WHEN** `validateSnapshot` runs the envelope schema against a parsed JSON object
- **THEN** the schema requires `version: literal(3)`, `exportedAt: string`, and one field per registered slice (currently `tasks`, `groups`, `timer`, `planner`)
- **AND** the schema does NOT require a `theme` field — theme is intentionally excluded from the snapshot (each device keeps its own theme)
- **AND** the schema MAY still accept an incoming `theme` field silently (backward compatibility with files exported by an earlier version) but the apply function does NOT use it

#### Scenario: The v2 envelope is migrated to v3

- **WHEN** `validateSnapshot` receives a JSON string with `version: 2`
- **THEN** the v2-to-v3 migration function transforms the v2 shape into the v3 shape
- **AND** `settings.timer` is lifted to the top-level `timer` field
- **AND** `settings.weekStartDay` and a fresh `browseDate: null` are combined into the top-level `planner` field
- **AND** `settings.theme` is dropped (not carried into v3)
- **AND** `version` is set to `3` and `exportedAt` is filled in if missing
- **AND** the resulting object is then validated by the v3 envelope schema

### Requirement: `buildSnapshot` assembles the current envelope

The system SHALL provide a `buildSnapshot` function in the data-portability feature that reads the current state of every registered slice and returns an object that conforms to the v3 envelope schema. The returned object SHALL be a plain JavaScript object (not a string); callers are responsible for serialising it.

#### Scenario: Building a snapshot includes every registered slice

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has `version: 3` and `exportedAt: <current ISO string>`
- **AND** for each slice in the registry, the slice's `export()` is called and the result is stored under the slice's `name`
- **AND** the order of fields in the returned object follows the order of slices in the registry

#### Scenario: Building a snapshot does not include the theme

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has no `theme` field
- **AND** the user's theme preference is left untouched by the build

### Requirement: `validateSnapshot` parses and validates an incoming snapshot

The system SHALL provide a `validateSnapshot(json: string)` function that parses a JSON string, detects its version, applies any required version migrations, and runs the envelope schema. The function SHALL return a discriminated result:

```ts
type ParseResult =
  | { ok: true; data: Record<string, unknown>; warnings?: string[] }
  | { ok: false; reason: string }
```

A `ParseResult` with `ok: false` means the envelope is structurally invalid and `applySnapshot` MUST NOT be called. A `ParseResult` with `ok: true` means the envelope is valid; `applySnapshot` is then called with `result.data` to write to the stores.

#### Scenario: A valid v3 snapshot passes validation

- **WHEN** `validateSnapshot` receives a JSON string with `version: 3` and the four required fields present
- **THEN** the result is `{ ok: true, data: <envelope object> }`

#### Scenario: A v2 snapshot is migrated and passes validation

- **WHEN** `validateSnapshot` receives a JSON string with `version: 2` and the v2 shape
- **THEN** the v2-to-v3 migration runs and the result is a v3 envelope
- **AND** the result is `{ ok: true, data: <migrated v3 envelope> }`

#### Scenario: A malformed JSON string is rejected

- **WHEN** `validateSnapshot` receives a string that is not valid JSON
- **THEN** the result is `{ ok: false, reason: 'Corrupted file. Could not parse JSON.' }`

#### Scenario: An envelope with the wrong version is rejected

- **WHEN** `validateSnapshot` receives a JSON string with `version: 1` (or no version)
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`

#### Scenario: A v3 envelope missing a required field is rejected

- **WHEN** `validateSnapshot` receives a JSON string with `version: 3` but missing one of the registered slice fields
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`

### Requirement: `applySnapshot` writes to the stores and runs cross-reference checks

The system SHALL provide an `applySnapshot(data: unknown)` function in the data-portability feature that writes the validated envelope data back to the feature stores. The function SHALL iterate the registered slices, run each slice's `schema.safeParse` against its envelope field, call the slice's `apply` for each successful parse, and accumulate warnings for each dropped field. After all slices are applied, the function SHALL perform any cross-reference checks (currently: every task's `groupId` references an existing group; if not, the task is reassigned to the default group).

```ts
type ApplyResult =
  | { ok: true; warnings?: string[] }
  | { ok: false; reason: string }
```

#### Scenario: A clean apply has no warnings

- **WHEN** `applySnapshot` is called with a valid envelope whose cross-references are intact
- **THEN** each slice's `apply` is called once
- **AND** the result is `{ ok: true }` with no warnings

#### Scenario: A dropped slice field generates a warning

- **WHEN** `applySnapshot` is called and one slice's `schema.safeParse` returns `success: false`
- **THEN** the failed slice's `apply` is NOT called
- **AND** a warning is added to the result naming the slice and the validation reason
- **AND** the other slices' `apply` functions are still called

#### Scenario: A dangling task.groupId is reassigned to the default group

- **WHEN** `applySnapshot` is called and a task references a groupId that does not exist in the imported groups
- **THEN** the task is reassigned to the canonical default-group id
- **AND** a warning is added to the result naming the dangling groupId

#### Scenario: Apply is not called when validation has failed

- **WHEN** `validateSnapshot` returns `{ ok: false, ... }`
- **THEN** the caller MUST NOT call `applySnapshot`
- **AND** no feature store is modified

### Requirement: The data-portability feature exposes a browser download helper

The system SHALL expose a `downloadAsFile(content: string, filename: string)` function as part of the data-portability feature's public surface. The function SHALL create a `Blob` from `content`, generate an object URL, trigger a download with the given `filename`, and revoke the object URL. The function is a thin browser-API wrapper used by the file-based Export flow.

#### Scenario: A JSON string is downloaded as a file

- **WHEN** `downloadAsFile('{"hello":"world"}', 'daybox.json')` is called in a browser
- **THEN** the browser triggers a download of a file named `daybox.json` with the given content as its body
