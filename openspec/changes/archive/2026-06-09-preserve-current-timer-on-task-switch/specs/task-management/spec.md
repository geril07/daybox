## MODIFIED Requirements

### Requirement: User can focus on a task

The system SHALL allow users to bind the Pomodoro timer to a task by clicking its focus button. The rebind SHALL only change `focusedTaskId`; it SHALL NOT reset the timer, alter its phase, or auto-start it. The timer keeps doing whatever it was doing — running, paused, on focus, or on a break — with the new task id as the binding target. Clicking the focus button on the already-focused task SHALL toggle `focusedTaskId` to `null` and SHALL NOT mutate any other timer state.

#### Scenario: Focus on new task while idle

- **WHEN** user clicks the focus button on a task row and the timer is idle
- **THEN** `focusedTaskId` is set to that task
- **AND** the row is highlighted
- **AND** the timer state (`phase`, `elapsed`, `startedAt`, `isRunning`) is unchanged

#### Scenario: Focus on new task while running

- **WHEN** user clicks the focus button on a different task row and the timer is running
- **THEN** `focusedTaskId` is set to the new task
- **AND** the timer state (`phase`, `elapsed`, `startedAt`, `isRunning`) is unchanged
- **AND** the timer's running clock is not reset to full focus duration
- **AND** the timer does not auto-start as a result of the click
