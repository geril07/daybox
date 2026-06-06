## MODIFIED Requirements

### Requirement: Timer cycles through focus/break phases

The system SHALL cycle through focus → short break → focus → ... → long break intervals. The number of focus intervals completed since the last long break SHALL be tracked by `sessionPomoCount`, which increments when a focus interval completes, is left unchanged when a short break completes, and resets to `0` when a long break completes. A long break SHALL occur when the count of completed focus intervals reaches the configured long-break interval.

#### Scenario: Focus to short break

- **WHEN** a focus interval completes and fewer than `longBreakInterval` focus intervals have completed since the last long break
- **THEN** a short break interval begins (automatically or based on the auto-start setting)
- **AND** `sessionPomoCount` has incremented by 1

#### Scenario: Long break after interval

- **WHEN** the configured number of focus intervals (default 4) completes since the last long break
- **THEN** a long break interval begins instead of a short break

#### Scenario: Count resets only after a long break

- **WHEN** a long break interval completes
- **THEN** `sessionPomoCount` resets to 0
- **AND** completing a short break does NOT reset `sessionPomoCount`

### Requirement: Session dots show progress

The system SHALL show fixed, read-only session dots indicating how many focus intervals have completed since the last long break, one dot per focus interval in the cycle (count equal to the long-break interval). The system SHALL also show a short text label describing cycle position (e.g. "2 of 4 · long next"). The dots SHALL NOT be interactive.

#### Scenario: Session progress dots

- **WHEN** the user has completed 2 of 4 focus intervals since the last long break
- **THEN** 2 dots are filled and 2 are dimmed
- **AND** a text label conveys the same position (e.g. "2 of 4 · long next")

#### Scenario: Dots are display-only

- **WHEN** the user clicks a session dot
- **THEN** nothing happens (the dots do not switch phase or alter timer state)

### Requirement: User can start/pause/skip/reset timer

The system SHALL provide play/pause, skip, and a single progressive reset control. The reset control SHALL behave as follows: if the current interval is dirty (time has elapsed or the timer is running) it restarts the current interval; otherwise, if the timer is mid-cycle (a focus interval has completed since the last long break, or the phase is not focus) it resets the whole session to the first focus interval with `sessionPomoCount` 0; otherwise (already a pristine first focus at full duration) the control is disabled. The control's label/tooltip SHALL reflect the action it will perform.

#### Scenario: Start timer

- **WHEN** the user clicks the play button
- **THEN** the timer starts counting down

#### Scenario: Pause timer

- **WHEN** the user clicks the pause button while the timer is running
- **THEN** the timer pauses and remaining time is preserved

#### Scenario: Skip interval

- **WHEN** the user clicks the skip button
- **THEN** the current interval ends and the next phase in sequence begins

#### Scenario: Reset restarts the current interval

- **WHEN** the current interval has elapsed time or is running, and the user activates reset
- **THEN** the current interval's clock returns to its full duration and stops
- **AND** the phase and `sessionPomoCount` are unchanged
- **AND** the control's label reflects "Restart"

#### Scenario: Reset returns to the first focus when the interval is clean

- **WHEN** the current interval is at full duration and stopped, but the timer is mid-cycle (count > 0 or phase is not focus), and the user activates reset
- **THEN** the phase becomes focus, `sessionPomoCount` becomes 0, and the clock is at the full focus duration, stopped
- **AND** the control's label reflects "Reset session"

#### Scenario: Reset is disabled when pristine

- **WHEN** the timer is a stopped first focus interval at full duration with `sessionPomoCount` 0
- **THEN** the reset control is disabled

## ADDED Requirements

### Requirement: Phase identity is shown on the timer

The system SHALL convey the current phase on the timer itself rather than on the focused-task label. The timer bar background SHALL take a faint phase tint during break phases (focus stays neutral), and a phase label (FOCUS / SHORT BREAK / LONG BREAK) SHALL be shown as a caption above the time digits. The focused-task label SHALL NOT carry the phase label.

#### Scenario: Break phase is visible at a glance

- **WHEN** the timer is in a short or long break phase
- **THEN** the bar background shows a faint tint in the phase color
- **AND** the phase chip reads the corresponding break label

#### Scenario: Focus phase background is neutral

- **WHEN** the timer is in the focus phase
- **THEN** the bar background is neutral (no break tint)
- **AND** the phase chip reads FOCUS

#### Scenario: Task label is independent of phase

- **WHEN** a task is focused
- **THEN** the task label shows the task title without a phase label

### Requirement: User can switch to a specific phase

The system SHALL let the user switch directly to a specific phase (focus, short break, or long break) via the phase chip. Switching SHALL reset the current interval's clock to the target phase's full duration and SHALL NOT change `sessionPomoCount`.

#### Scenario: Switch to a break directly

- **WHEN** the user opens the phase chip and selects "Short break" while in focus
- **THEN** the phase becomes short break with its full duration, stopped
- **AND** `sessionPomoCount` is unchanged

#### Scenario: Switching does not advance the cycle

- **WHEN** the user manually switches phases
- **THEN** `sessionPomoCount` only ever changes through interval completion, never through a manual switch

#### Scenario: Selecting a phase closes the menu

- **WHEN** the user selects a phase from the phase chip menu
- **THEN** the menu closes
