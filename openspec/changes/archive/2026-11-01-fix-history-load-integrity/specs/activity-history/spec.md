## MODIFIED Requirements

### Requirement: Activity history persists in IndexedDB

The system SHALL persist activity events in the IndexedDB database `daybox`, object store `historyEvents`: one record per event, keyed by event `id`, with an index on `at` and a stored record sequence that fixes the order events were recorded in. Recording an event SHALL write only that event and take the next sequence number. Loading SHALL return events in sequence order, not in key order. A stored event SHALL keep its sequence when it is written again. The running app SHALL NOT read or write the `daybox-history` localStorage key once migration has finished.

#### Scenario: One event write adds one record

- **WHEN** user completes a task while history already holds 5000 events
- **THEN** exactly one record is added to `historyEvents`
- **AND** stored records are not rewritten

#### Scenario: History survives reload

- **WHEN** user completes a task and reloads the page
- **THEN** the `task.completed` event is still in the history

#### Scenario: Record order survives a reload

- **WHEN** user records three events and reloads the page
- **THEN** the events are restored in the order they were recorded

#### Scenario: No history key in localStorage

- **WHEN** user inspects localStorage after using the app
- **THEN** `daybox-history` is absent

### Requirement: Legacy history migrates once

When localStorage holds a `daybox-history` blob, the system SHALL validate it, write its events and tracking start into IndexedDB, and remove the key only after the write succeeds. Re-running the migration SHALL NOT duplicate events. The migrated records SHALL keep the order of the legacy event array. An event that is already stored SHALL keep its position when the migration runs again. A blob that fails validation SHALL be removed with one `console.warn`, as the pre-migration app would have reset it on its next write.

#### Scenario: Migration keeps events and tracking start

- **WHEN** the app loads with a valid `daybox-history` blob holding seven events
- **THEN** `historyEvents` holds those seven events
- **AND** the tracking start equals the stored one
- **AND** `daybox-history` is gone

#### Scenario: Legacy order is preserved

- **WHEN** the stored blob holds events in a given order
- **THEN** the migrated records keep that order

#### Scenario: Migration is not repeated

- **WHEN** the app loads again after a successful migration
- **THEN** no event is duplicated

#### Scenario: First load after upgrade

- **WHEN** the app loads with tasks that have `pomoCompleted > 0` and `completedAt` values
- **THEN** the history is empty
- **AND** tracking starts at that load

### Requirement: History loads before it is exported

Snapshot export and Google Drive backup SHALL build the `history` slice only after the in-memory history has finished loading. When the load fails, both SHALL refuse to save and SHALL report the failure, because a snapshot without history would replace a complete backup. A snapshot import or restore SHALL still run, and SHALL report that history could not be saved when its write fails.

#### Scenario: Export immediately after startup

- **WHEN** user opens settings and exports as soon as the app renders
- **THEN** the exported snapshot contains the stored history events

#### Scenario: A failed load blocks the export

- **WHEN** stored history cannot be read
- **THEN** the settings export is cancelled with an error
- **AND** no file is written

#### Scenario: A failed load blocks the Drive backup

- **WHEN** stored history cannot be read and the user starts a backup
- **THEN** the backup is cancelled with an error
- **AND** the existing remote backup is left untouched

#### Scenario: A partial import is reported

- **WHEN** stored history cannot be written after a confirmed import
- **THEN** the imported tasks and settings are in place
- **AND** the user is told that activity history could not be saved
