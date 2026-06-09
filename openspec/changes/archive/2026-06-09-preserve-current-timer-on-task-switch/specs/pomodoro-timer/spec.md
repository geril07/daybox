## MODIFIED Requirements

### Requirement: User play/pause gesture produces a click sound

The system SHALL play a short click sound when the user toggles the timer between paused and running via either the play button in the timer bar or the spacebar shortcut. The click for the paused-or-idle → running transition SHALL ascend in pitch, and the click for the running → paused transition SHALL descend in pitch. The system SHALL NOT play a click sound on system-initiated state changes such as auto-rolling into the next phase after an interval ends, switching the focused task while the timer is running, or any other state change that is not triggered by a direct user play/pause gesture. The click volume and the click waveform/frequencies SHALL be hardcoded and SHALL NOT be user-configurable.

#### Scenario: Click play from idle

- **WHEN** the user clicks the play button while the timer is at full duration and stopped
- **THEN** a short ascending click sound plays
- **AND** the timer transitions to running

#### Scenario: Spacebar resume

- **WHEN** the user presses the spacebar while the timer is paused with elapsed time greater than zero
- **THEN** a short ascending click sound plays
- **AND** the timer transitions to running

#### Scenario: Click pause

- **WHEN** the user clicks the play button while the timer is running
- **THEN** a short descending click sound plays
- **AND** the timer transitions to paused

#### Scenario: Spacebar pause

- **WHEN** the user presses the spacebar while the timer is running
- **THEN** a short descending click sound plays
- **AND** the timer transitions to paused

#### Scenario: Auto-roll does not click

- **WHEN** an interval ends and the next phase auto-starts (autoStart is enabled for that transition)
- **THEN** no click sound plays
- **AND** only the end-of-interval alarm sound plays

#### Scenario: Skip does not click

- **WHEN** the user clicks the skip button
- **THEN** no click sound plays
- **AND** the current interval ends and the next phase begins stopped

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

#### Scenario: Click is not user-configurable

- **WHEN** the user inspects the timer settings panel
- **THEN** there is no toggle, volume, sound picker, or other control for the click sound
- **AND** no `daybox-timer` localStorage key changes when the user toggles play/pause
