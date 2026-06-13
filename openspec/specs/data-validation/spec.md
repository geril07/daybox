## Purpose

Define the validation policy and shape conventions for the data layer: schema-first types, per-layer policy routing for `safeParse` failures, and shared persistence rehydration safety. This capability is the contract that the `data-persistence` and per-feature specs build on.

## Requirements

### Requirement: Schema-first type definitions

The system SHALL define each persisted shape once as a zod schema co-located with the owning feature (`modules/<feature>/schema.ts`). The corresponding `types.ts` SHALL re-export the shape as `export type <Name> = z.infer<typeof <Name>Schema>`. Interfaces SHALL NOT be used for shapes that also have a runtime representation.

#### Scenario: Task type is derived from TaskSchema

- **WHEN** a developer reads `modules/tasks/types.ts`
- **THEN** it exports `Task` as `z.infer<typeof TaskSchema>` and not as a hand-written `interface`

#### Scenario: Group type is derived from GroupSchema

- **WHEN** a developer reads `modules/groups/types.ts`
- **THEN** it exports `Group` as `z.infer<typeof GroupSchema>` and not as a hand-written `interface`

#### Scenario: TimerSettings type is derived from TimerSettingsSchema

- **WHEN** a developer reads `modules/timer/store.ts`
- **THEN** `TimerSettings` is `z.infer<typeof TimerSettingsSchema>`

#### Scenario: PlannerState type is derived from PlannerStateSchema

- **WHEN** a developer reads `modules/planner/store.ts`
- **THEN** the persisted state type is `z.infer<typeof PlannerStateSchema>`

### Requirement: Per-layer validation policy

The system SHALL route validation failures according to the layer that owns the failure. Snapshot import SHALL use whole-snapshot current validation after migration: invalid current snapshot payloads hard-fail the import and do not mutate stores. Legacy one-shot localStorage migrations MAY still use record-level warn-and-skip behavior where explicitly specified by their owning requirement. Rehydration SHALL continue to reset affected stores on persisted-blob failure.

| Layer            | Trigger                                                                    | Policy                                                                |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| envelope         | JSON root, version, supported envelope shape                               | hard fail: return `{ ok: false, reason }`                             |
| current snapshot | Current typed snapshot payload and aggregate id invariants after migration | hard fail: return `{ ok: false, reason }`                             |
| normalization    | Repairable cross-snapshot invariants, e.g. task.groupId                    | return repaired `PreparedSnapshot` plus warnings                      |
| legacy record    | Per-row shape during explicitly legacy migrations only                     | warn + skip: append reason to warnings/logs, drop the row             |
| optional legacy  | Optional / derived fields in explicitly legacy migrations only             | coerce to schema default when the migration requirement says to do so |
| rehydrate        | zustand persist rehydration on app load                                    | reset affected store to initial state, log `console.warn` once        |

The shared `safeParseAndRoute` helper MAY continue to implement legacy migration and rehydration routing where used. The current snapshot import pipeline SHALL NOT depend on per-record salvage as its default behavior.

#### Scenario: Envelope failure hard-fails the import

- **WHEN** `prepareSnapshotImport` receives a JSON file missing the `version` field
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no store state is modified

#### Scenario: Current snapshot payload failure hard-fails the import

- **WHEN** `prepareSnapshotImport` receives a current snapshot where one task is missing its `id` field
- **THEN** the result is `{ ok: false, reason: <message> }`
- **AND** the valid parts of the snapshot are not partially committed
- **AND** no store state is modified

#### Scenario: Current snapshot aggregate failure hard-fails the import

- **WHEN** `prepareSnapshotImport` receives a current snapshot whose records pass their local schemas but contain duplicate task ids or duplicate group ids
- **THEN** the result is `{ ok: false, reason: <message> }`
- **AND** the snapshot is not normalized or committed
- **AND** no store state is modified

#### Scenario: Reference failure is repaired during normalization

- **WHEN** `prepareSnapshotImport` receives a current snapshot where a task's `groupId` does not match any imported group
- **THEN** preparation returns an ok result with a `PreparedSnapshot`
- **AND** the task's `groupId` is reassigned to the canonical default group id
- **AND** the warnings array notes the dangling reference
- **AND** no store state is modified until commit

#### Scenario: Rehydration failure resets the affected store

- **WHEN** the app loads and `localStorage.getItem('daybox-tasks')` contains a blob that fails `TaskSchema`
- **THEN** the task store is initialized to its empty default
- **AND** a `console.warn` is emitted once

#### Scenario: Rehydration success uses the persisted blob

- **WHEN** the app loads and the persisted blob passes the schema
- **THEN** the store is initialized to the persisted state
- **AND** no warn is emitted

### Requirement: Shared persistence helper

The system SHALL expose `createValidatedRehydrate({ name, schema, init, afterValidate? })` from `src/shared/utils/persistence.ts`. The helper SHALL wrap zustand's `onRehydrateStorage` field and apply the rehydration-layer policy above. All five persisted zustand stores (tasks, groups, timer, planner, google-drive) SHALL use it on their `persist` call-site options object.

#### Scenario: Stores opt into validated rehydration

- **WHEN** any persisted store is constructed
- **THEN** it calls `createValidatedRehydrate` rather than wiring `onRehydrateStorage` directly
- **AND** the on-disk key name matches the existing contract (no rename)

### Requirement: Defensive bounds on user-input fields

The system SHALL enforce length caps on user-typed strings at the schema layer:

- `Task.title`: 1 to 280 characters (after trim)
- `Group.name`: 1 to 40 characters (after trim)

Inputs exceeding the cap SHALL be rejected by the schema (truncation is not used). The UI may pre-trim before submission; the schema is the final guard.

#### Scenario: Task title over 280 chars is rejected

- **WHEN** `addTask` is called with a 281-character string
- **THEN** the task is not added
- **AND** the store logs a warning

#### Scenario: Group name over 40 chars is rejected

- **WHEN** `addGroup` is called with a 41-character string
- **THEN** the group is not added
- **AND** the store logs a warning

### Requirement: Timer settings validation on update

The system SHALL run `TimerSettingsSchema.safeParse` on the merged result of every `setTimerSettings` call. On failure, the update SHALL NOT be applied and a `console.warn` SHALL be emitted.

#### Scenario: Valid partial update is applied

- **WHEN** `setTimerSettings({ focusDuration: 30 })` is called
- **THEN** the merged settings pass the schema
- **AND** the store applies the update

#### Scenario: Out-of-range update is rejected

- **WHEN** `setTimerSettings({ focusDuration: 999 })` is called
- **THEN** the merged settings fail the schema
- **AND** the store does not apply the update
- **AND** a `console.warn` is emitted
