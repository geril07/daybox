## ADDED Requirements

### Requirement: The tasks save slice is version 2 and migrates version 1

The tasks save slice SHALL declare `currentVersion: 2`. Its version 2 payload SHALL contain `version`, `tasks`, and `series`. The version 1 schema SHALL remain a frozen compatibility contract containing only `version` and `tasks`; it SHALL NOT be widened to accept `series`.

The slice SHALL declare a `migrateFrom[1]` migration that produces a valid version 2 payload from a version 1 payload by setting `series` to an empty array and setting each task's `seriesId` and `occurrenceDate` to `null`. The migration SHALL NOT drop or alter any other task field.

Because the migration runs inside the existing per-slice migration chain, the envelope version SHALL remain `1` and no envelope-level change is required.

#### Scenario: Export writes a version 2 tasks slice

- **WHEN** `buildSnapshot` is called and the tasks store contains three tasks and two series
- **THEN** `slices.tasks.version` is `2`
- **AND** `slices.tasks.tasks` contains the three tasks
- **AND** `slices.tasks.series` contains the two series including their `skipDates`
- **AND** `envelopeVersion` is still `1`

#### Scenario: A version 1 export migrates to version 2

- **WHEN** `prepareSnapshotImport` receives a snapshot whose `slices.tasks.version` is `1` with three tasks and no `series` key
- **THEN** the migration produces `series: []`
- **AND** each of the three tasks gains `seriesId: null` and `occurrenceDate: null`
- **AND** every other task field is unchanged
- **AND** preparation succeeds

#### Scenario: A version 2 export imports unchanged

- **WHEN** `prepareSnapshotImport` receives a snapshot whose `slices.tasks.version` is `2` containing series
- **THEN** no migration runs for that slice
- **AND** preparation succeeds

#### Scenario: Commit restores series and occurrences together

- **WHEN** `commitSnapshotImport` is called with a prepared snapshot whose tasks slice contains two series and their occurrences
- **THEN** the tasks store holds both series and all occurrences
- **AND** each occurrence's `seriesId` resolves to a series present in the same payload

#### Scenario: Invalid series payload rejects the import

- **WHEN** `prepareSnapshotImport` receives a tasks slice whose `series` contains a series with an empty `weekdays` array
- **THEN** the tasks slice's `prepareImport` fails
- **AND** preparation returns `{ ok: false, reason: <message> }`
- **AND** no feature store is modified

#### Scenario: A malformed skipDates entry rejects the import

- **WHEN** `prepareSnapshotImport` receives a tasks slice whose series `skipDates` contains `"next tuesday"`
- **THEN** the tasks slice's `prepareImport` fails

#### Scenario: Duplicate occurrence identity rejects the import

- **WHEN** `prepareSnapshotImport` receives a tasks slice containing two tasks with the same `seriesId` and the same `occurrenceDate`
- **THEN** the tasks slice's `prepareImport` fails
- **AND** preparation returns `{ ok: false, reason: <message> }`

#### Scenario: A half-populated occurrence identity rejects the import

- **WHEN** `prepareSnapshotImport` receives a task with `seriesId` set and `occurrenceDate` `null`
- **THEN** the tasks slice's `prepareImport` fails

#### Scenario: Occurrence identity may reference an absent series

- **WHEN** `prepareSnapshotImport` receives a task whose `seriesId` matches no series in the same payload
- **THEN** preparation succeeds
- **AND** the task is committed as an ordinary task with its `seriesId` preserved

### Requirement: The tasks slice repairs dangling series group references

The tasks slice's `postPrepare` SHALL repair dangling `groupId` references on series, assigning the canonical default group ID and emitting a warning, in the same way it already repairs dangling `groupId` references on tasks.

#### Scenario: A series pointing at a missing group is repaired

- **WHEN** `prepareSnapshotImport` receives a snapshot whose series array contains a series with a `groupId` that does not exist in the prepared groups
- **THEN** the tasks slice's `postPrepare` assigns that series' `groupId` the default group ID
- **AND** a warning is emitted naming the dangling group ID
- **AND** preparation succeeds

#### Scenario: Series group repair does not touch task groups

- **WHEN** a series and a task both reference a group that does not exist
- **THEN** both are reassigned to the default group ID
- **AND** each produces its own warning
