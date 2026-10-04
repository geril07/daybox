## MODIFIED Requirements

### Requirement: Timer cycles through focus/break phases

The system SHALL cycle through focus → short break → focus → ... → long break intervals. The number of focus intervals completed since the last long break SHALL be tracked by `sessionPomoCount`, which increments when a focus interval completes or is skipped, is left unchanged when a short break completes or is skipped, and resets to `0` when a long break completes or is skipped. After focus ends, a long break SHALL occur when the incremented count reaches or exceeds the configured long-break interval. Manual phase selection and changes to the long-break interval SHALL preserve the completed count and SHALL NOT immediately advance the current phase.

#### Scenario: Focus to short break

- **WHEN** a focus interval completes and fewer than `longBreakInterval` focus intervals have completed since the last long break
- **THEN** a short break interval begins (automatically or based on the auto-start setting)
- **AND** `sessionPomoCount` has incremented by 1

#### Scenario: Long break after interval

- **WHEN** the configured number of focus intervals (default 4) completes since the last long break
- **THEN** a long break interval begins instead of a short break

#### Scenario: Count resets only after a long break

- **WHEN** a long break interval completes or is skipped
- **THEN** `sessionPomoCount` resets to 0
- **AND** completing or skipping a short break does NOT reset `sessionPomoCount`

#### Scenario: Focus after manually bypassing a long break

- **WHEN** a long break is ready at count 4 with `longBreakInterval` 4
- **AND** the user selects Focus through the phase chip
- **THEN** the count remains 4
- **WHEN** that focus interval completes or is skipped
- **THEN** the count becomes 5 and the next phase is long break

#### Scenario: Reducing the interval below completed progress

- **WHEN** the completed count is 5, the phase is focus, and the user reduces `longBreakInterval` from 8 to 4
- **THEN** the phase and completed count remain unchanged
- **WHEN** the current focus interval completes or is skipped
- **THEN** the count becomes 6 and the next phase is long break

### Requirement: Session dots show progress

The system SHALL show fixed, read-only session dots indicating how many focus intervals have completed since the last long break, one dot per focus interval in the cycle (count equal to the long-break interval). The dots SHALL NOT be interactive. Outside the long-break phase, the system SHALL show the existing `N of M` text, where N is the completed count and M is the configured long-break target, including when N exceeds M. Excess counts SHALL NOT be clamped. The label SHALL append ` · long next` exactly when completing the next focus interval reaches or exceeds the long-break target. During a long break, the text SHALL remain `long break`.

#### Scenario: Session progress dots

- **WHEN** the user has completed 2 of 4 focus intervals since the last long break
- **THEN** 2 dots are filled and 2 are dimmed
- **AND** the text label is `2 of 4` without a long-break hint

#### Scenario: The next scheduled break is long

- **WHEN** the phase is focus or short break, the completed count is 3, and `longBreakInterval` is 4
- **THEN** the text label is `3 of 4 · long next`

#### Scenario: Excess progress remains visible

- **WHEN** the phase is focus or short break, the completed count is 7, and `longBreakInterval` is 4
- **THEN** all four dots are filled
- **AND** the text label remains `7 of 4 · long next`

#### Scenario: A long break is current

- **WHEN** the phase is long break, including with an excess completed count
- **THEN** the text label is `long break`

#### Scenario: Dots are display-only

- **WHEN** the user clicks a session dot
- **THEN** nothing happens (the dots do not switch phase or alter timer state)
