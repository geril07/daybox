## MODIFIED Requirements

### Requirement: User can set pomodoro estimate

The system SHALL display a task's pomodoro progress as an `X/Y` text label (where `X` is `pomoCompleted` and `Y` is `pomoEstimate`) with a thin progress bar directly below the number whose width is proportional to `pomoCompleted / pomoEstimate`. The system SHALL allow the user to set or change `pomoEstimate` via a popup containing a `NumberInput` bounded to `[0, 99]`. The system SHALL NOT modify `pomoCompleted` as a side effect of changing `pomoEstimate`; the two fields are independent. Lowering `pomoEstimate` below `pomoCompleted` is allowed and leaves `pomoCompleted` unchanged.

#### Scenario: Display shows X/Y with a progress bar

- **WHEN** a task has `pomoEstimate = 5` and `pomoCompleted = 2`
- **THEN** the pomo trigger on the task row displays the text `2/5`
- **AND** a progress bar is rendered below the number whose width corresponds to `2/5`

#### Scenario: Open pomodoro editor

- **WHEN** user clicks the pomo trigger on a task row
- **THEN** a popup appears containing two `NumberInput`s: one labelled for `pomoEstimate` and one for `pomoCompleted`

#### Scenario: Increase estimate above completed

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user increases `pomoEstimate` to `5` via the editor
- **THEN** the task's `pomoEstimate` is updated to `5`
- **AND** `pomoCompleted` remains `1`

#### Scenario: Lower estimate does not change completed

- **WHEN** a task has `pomoEstimate = 5`, `pomoCompleted = 5`, and the user lowers `pomoEstimate` to `3` via the editor
- **THEN** the task's `pomoEstimate` is updated to `3`
- **AND** `pomoCompleted` remains `5` (unaffected)

#### Scenario: Lowering a high estimate below completed does not change completed

- **WHEN** a task has `pomoEstimate = 20`, `pomoCompleted = 14`, and the user lowers `pomoEstimate` to `10` via the editor
- **THEN** the task's `pomoEstimate` is updated to `10`
- **AND** `pomoCompleted` remains `14` (unaffected)

#### Scenario: Progress bar animates on estimate change

- **WHEN** `pomoCompleted` or `pomoEstimate` changes for a rendered task
- **THEN** the progress bar transitions to its new width smoothly via CSS

### Requirement: User can edit pomodoro completed count

The system SHALL allow the user to set or change `pomoCompleted` via the same popup that edits `pomoEstimate`, using a `NumberInput` bounded to `[0, 99]` — the global cap, NOT the task's current `pomoEstimate`. Increment and decrement controls SHALL be disabled at `0` and `99` respectively. Editing `pomoCompleted` SHALL NOT toggle `task.completed`. Setting `pomoCompleted` to a value above `pomoEstimate` is allowed and is the user's explicit choice.

#### Scenario: Increase completed below estimate

- **WHEN** a task has `pomoEstimate = 5`, `pomoCompleted = 2`, and the user increases `pomoCompleted` to `4` via the editor
- **THEN** the task's `pomoCompleted` is updated to `4`
- **AND** `task.completed` remains its prior value

#### Scenario: Increase completed above estimate

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user increases `pomoCompleted` to `7` via the editor
- **THEN** the task's `pomoCompleted` is updated to `7`
- **AND** `pomoEstimate` remains `3`

#### Scenario: Completed input caps at the global limit

- **WHEN** a task has `pomoCompleted = 99`
- **THEN** the `+` control on the `pomoCompleted` `NumberInput` is disabled

#### Scenario: Completed input floors at zero

- **WHEN** a task has `pomoCompleted = 0`
- **THEN** the `−` control on the `pomoCompleted` `NumberInput` is disabled

#### Scenario: Manually reaching estimate does not complete the task

- **WHEN** an incomplete task has `pomoEstimate = 5`, `pomoCompleted = 3`, and the user sets `pomoCompleted` to `5` via the editor
- **THEN** the task's `pomoCompleted` is updated to `5`
- **AND** `task.completed` remains `false`

#### Scenario: Clearing the input is a no-op

- **WHEN** the user clears the value of either `NumberInput` in the popover (selects all, deletes) and the field becomes empty
- **THEN** the corresponding task field is NOT updated in the store
- **AND** the prior valid value is preserved
