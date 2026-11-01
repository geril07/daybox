## REMOVED Requirements

### Requirement: Activity history persists under daybox-history

**Reason**: A single localStorage blob rewrites the whole event list on every event and competes with tasks, groups, timer, and planner for the ~5 MB origin quota.

**Migration**: On the first load after the upgrade the stored blob is copied into IndexedDB and the key is removed; see "Legacy history migrates once".

## MODIFIED Requirements

### Requirement: History records when tracking started

The history SHALL store `trackingStartedAt` (UTC ISO timestamp) and `trackingUtcOffsetMinutes` (same convention as events): the moment from which events are recorded. Both SHALL be stored on the first load that finds no stored tracking start, even when no event occurs. Dropping invalid stored events SHALL NOT change them.

#### Scenario: First launch persists the tracking start

- **WHEN** the app loads with no `daybox-history` key and the user records no event
- **THEN** the tracking start is stored even though the event list is empty

#### Scenario: Tracking start survives reloads

- **WHEN** the app is reloaded on a later day
- **THEN** `trackingStartedAt` keeps its first-launch value

#### Scenario: Invalid records do not move the tracking start

- **WHEN** the stored event list contains records that fail validation
- **THEN** those records are dropped and `trackingStartedAt` keeps its stored value

## ADDED Requirements

### Requirement: Activity history persists in IndexedDB

The system SHALL persist activity events in the IndexedDB database `daybox`, object store `historyEvents`: one record per event, keyed by event `id`, with an index on `at`. Recording an event SHALL write only that event. The running app SHALL NOT read or write the `daybox-history` localStorage key once migration has finished.

#### Scenario: One event write adds one record

- **WHEN** user completes a task while history already holds 5000 events
- **THEN** exactly one record is added to `historyEvents`
- **AND** stored records are not rewritten

#### Scenario: History survives reload

- **WHEN** user completes a task and reloads the page
- **THEN** the `task.completed` event is still in the history

#### Scenario: No history key in localStorage

- **WHEN** user inspects localStorage after using the app
- **THEN** `daybox-history` is absent

### Requirement: Invalid stored records are dropped individually

On load the system SHALL validate every stored event against the activity-history event schema. A record that fails validation SHALL be skipped and one `console.warn` SHALL report how many records were skipped. Valid records SHALL be kept and SHALL NOT be deleted from storage.

#### Scenario: One corrupt record among valid ones

- **WHEN** the event store holds four valid records and one record with an unknown `type`
- **THEN** history loads with the four valid events
- **AND** `console.warn` is called once

### Requirement: Legacy history migrates once

When localStorage holds a `daybox-history` blob, the system SHALL validate it, write its events and tracking start into IndexedDB, and remove the key only after the write succeeds. Re-running the migration SHALL NOT duplicate events. A blob that fails validation SHALL be removed with one `console.warn`, as the pre-migration app would have reset it on its next write.

#### Scenario: Migration keeps events and tracking start

- **WHEN** the app loads with a valid `daybox-history` blob holding seven events
- **THEN** `historyEvents` holds those seven events
- **AND** the tracking start equals the stored one
- **AND** `daybox-history` is gone

#### Scenario: Migration is not repeated

- **WHEN** the app loads again after a successful migration
- **THEN** no event is duplicated

#### Scenario: First load after upgrade

- **WHEN** the app loads with tasks that have `pomoCompleted > 0` and `completedAt` values
- **THEN** the history is empty
- **AND** tracking starts at that load

### Requirement: History loads before it is exported

Snapshot export and Google Drive backup SHALL build the `history` slice only after the in-memory history has finished loading.

#### Scenario: Export immediately after startup

- **WHEN** user opens settings and exports as soon as the app renders
- **THEN** the exported snapshot contains the stored history events
