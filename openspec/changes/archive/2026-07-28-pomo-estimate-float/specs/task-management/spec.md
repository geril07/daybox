## MODIFIED Requirements

### Requirement: User can set pomodoro estimate

The system SHALL display a task's pomodoro progress as an `X/Y` text label (where `X` is `pomoCompleted` and `Y` is `pomoEstimate`) with a thin progress bar directly below the number whose width is proportional to `pomoCompleted / pomoEstimate`. The system SHALL allow the user to set or change `pomoEstimate` via a popup containing a `NumberInput` bounded to `[0, 99]`. `pomoEstimate` SHALL accept any finite number in that range, including non-integers (fractional pomodoros). The system SHALL NOT modify `pomoCompleted` as a side effect of changing `pomoEstimate`; the two fields are independent. Lowering `pomoEstimate` below `pomoCompleted` is allowed and leaves `pomoCompleted` unchanged.

#### Scenario: Display shows X/Y with a progress bar

- **WHEN** a task has `pomoEstimate = 5` and `pomoCompleted = 2`
- **THEN** the pomo trigger on the task row displays the text `2/5`
- **AND** a progress bar is rendered below the number whose width corresponds to `2/5`

#### Scenario: Display shows X/Y for an estimate above the legacy 9 cap

- **WHEN** a task has `pomoEstimate = 12` and `pomoCompleted = 7`
- **THEN** the pomo trigger on the task row displays the text `7/12`
- **AND** a progress bar is rendered below the number whose width corresponds to `7/12`

#### Scenario: Display shows X/Y for a fractional estimate

- **WHEN** a task has `pomoEstimate = 1.5` and `pomoCompleted = 1`
- **THEN** the pomo trigger on the task row displays text reflecting `1` and `1.5`
- **AND** a progress bar is rendered below the number whose width corresponds to `1/1.5`

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

#### Scenario: Set a fractional estimate

- **WHEN** a task has `pomoEstimate = 3`, `pomoCompleted = 1`, and the user sets `pomoEstimate` to `2.5` via the editor
- **THEN** the task's `pomoEstimate` is updated to `2.5`
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

## ADDED Requirements

### Requirement: Task schema accepts fractional pomoEstimate

`TaskSchema` SHALL validate `pomoEstimate` as a finite number in `[0, 99]` without requiring an integer. Integer values SHALL remain valid. `pomoCompleted` SHALL remain an integer in `[0, 99]`. Persisted or imported task state that includes a fractional `pomoEstimate` within bounds SHALL pass schema validation and SHALL NOT trigger tasks-store rehydrate reset solely for that reason.

#### Scenario: Fractional estimate parses

- **WHEN** a task object with `pomoEstimate = 1.5` (and otherwise valid fields) is validated with `TaskSchema`
- **THEN** validation succeeds

#### Scenario: Integer estimate still parses

- **WHEN** a task object with `pomoEstimate = 3` (and otherwise valid fields) is validated with `TaskSchema`
- **THEN** validation succeeds

#### Scenario: Out-of-range fractional estimate is rejected

- **WHEN** a task object with `pomoEstimate = 99.5` is validated with `TaskSchema`
- **THEN** validation fails

#### Scenario: Rehydrate keeps tasks when estimate is fractional

- **WHEN** the app loads and `localStorage` `daybox-tasks` contains a valid task list where at least one task has `pomoEstimate = 2.5`
- **THEN** the task store rehydrates to that persisted list
- **AND** no rehydrate-reset warning is emitted for that blob
