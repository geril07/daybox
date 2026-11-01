## MODIFIED Requirements

### Requirement: The history save slice carries the activity event list

The `history` save slice SHALL export the full activity event list and the tracking start at slice version `1`, read from the loaded in-memory history. Import preparation SHALL validate every event against the activity-history event schema and SHALL fail on duplicate event ids. A current envelope without a `history` slice SHALL prepare to an empty event list whose tracking starts at import time.

#### Scenario: History round-trips through export and import

- **WHEN** user exports a snapshot that contains activity events and imports it in another browser
- **THEN** the imported history contains the same events in the same order
- **AND** the same `trackingStartedAt`

#### Scenario: Export before the history load finishes

- **WHEN** a snapshot is built before the stored history finished loading
- **THEN** the snapshot still contains the stored events

#### Scenario: Commit replaces the whole history

- **WHEN** user confirms an import whose `history` slice holds three events
- **THEN** the in-memory history holds exactly those three events
- **AND** the stored history is replaced with them

#### Scenario: Invalid history event fails preparation

- **WHEN** a snapshot's `history` slice contains an event with an unknown `type`
- **THEN** import preparation fails with a reason that names the `history` slice
- **AND** no store is modified

#### Scenario: Duplicate history event id fails preparation

- **WHEN** a snapshot's `history` slice contains two events with the same `id`
- **THEN** import preparation fails

#### Scenario: Missing history slice prepares as empty

- **WHEN** a current envelope has no `history` slice
- **THEN** preparation succeeds with an empty history event list
- **AND** `trackingStartedAt` is the time of the import
