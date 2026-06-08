## MODIFIED Requirements

### Requirement: User can set pomodoro estimate

The system SHALL display a task's pomodoro progress as an `X/Y` text label (where `X` is `pomoCompleted` and `Y` is `pomoEstimate`) with a thin progress bar directly below the number whose width is proportional to `pomoCompleted / pomoEstimate`. The system SHALL allow the user to set or change `pomoEstimate` via a popup containing a `NumberInput` bounded to `[0, 99]`. When the user lowers `pomoEstimate` below the current `pomoCompleted`, the system SHALL set both fields in a single store call so the invariant `pomoCompleted <= pomoEstimate` is preserved.

#### Scenario: Display shows X/Y with a progress bar

- **WHEN** a task has `pomoEstimate = 5` and `pomoCompleted = 2`
- **THEN** the pomo trigger on the task row displays the text `2/5`
- **AND** a progress bar is rendered below the number whose width corresponds to `2/5`

#### Scenario: Display shows X/Y for an estimate above the legacy 9 cap

- **WHEN** a task has `pomoEstimate = 12` and `pomoCompleted = 7`
- **THEN** the pomo trigger on the task row displays the text `7/12`
- **AND** a progress bar is rendered below the number whose width corresponds to `7/12`

#### Scenario: Open pomodoro editor

- **WHEN** user clicks the pomo trigger on a task row
- **THEN** a popup appears containing two `NumberInput`s: one labelled for `pomoEstimate` and one for `pomoCompleted`

#### Scenario: Increase estimate above completed

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user increases `pomoEstimate` to `5` via the editor
- **THEN** the task's `pomoEstimate` is updated to `5`
- **AND** `pomoCompleted` remains `1`

#### Scenario: Increase estimate above the legacy 9 cap

- **WHEN** a task has `pomoEstimate = 9`, `pomoCompleted = 4`, and the user increases `pomoEstimate` to `25` via the editor
- **THEN** the task's `pomoEstimate` is updated to `25`
- **AND** `pomoCompleted` remains `4`

#### Scenario: Lower estimate clamps completed

- **WHEN** a task has `pomoEstimate = 5`, `pomoCompleted = 5`, and the user lowers `pomoEstimate` to `3` via the editor
- **THEN** the task's `pomoEstimate` is updated to `3`
- **AND** the task's `pomoCompleted` is also updated to `3` in the same store call

#### Scenario: Lowering a high estimate clamps completed to the new value

- **WHEN** a task has `pomoEstimate = 20`, `pomoCompleted = 14`, and the user lowers `pomoEstimate` to `10` via the editor
- **THEN** the task's `pomoEstimate` is updated to `10`
- **AND** the task's `pomoCompleted` is also updated to `10` in the same store call

#### Scenario: Progress bar animates on estimate change

- **WHEN** `pomoCompleted` or `pomoEstimate` changes for a rendered task
- **THEN** the progress bar transitions to its new width smoothly via CSS
