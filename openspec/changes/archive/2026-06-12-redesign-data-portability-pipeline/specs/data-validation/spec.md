## MODIFIED Requirements

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
