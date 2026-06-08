## MODIFIED Requirements

### Requirement: Switching focus while running does not click

The system SHALL not produce a click sound when the user rebinds the focused task mid-run. The rebind SHALL only change `focusedTaskId`; it SHALL NOT mutate `phase`, `elapsed`, `startedAt`, or `isRunning`. A break in progress at the moment of the switch continues running and auto-rolls to the next focus phase on schedule via the normal `advancePhase` path, so `sessionPomoCount` is adjusted correctly when the break ends.

#### Scenario: Switching focus while running does not click

- **WHEN** the user clicks a different task to focus while the timer is running
- **THEN** no click sound plays
- **AND** `focusedTaskId` is updated to the new task
- **AND** the timer's `phase`, `elapsed`, `startedAt`, and `isRunning` are unchanged

#### Scenario: Switching focus mid-break preserves the break

- **WHEN** the user clicks a different task to focus while the timer is running on a short or long break
- **THEN** `focusedTaskId` is updated to the new task
- **AND** `phase` remains on the break
- **AND** `isRunning` remains `true`
- **AND** `elapsed` is unchanged
- **AND** when the break's `remainingMs` reaches zero, `advancePhase` runs normally and `sessionPomoCount` advances as it would have without the switch
