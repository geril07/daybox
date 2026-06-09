## MODIFIED Requirements

### Requirement: Timer increments task pomodoros

The system SHALL increment a task's completed-pomodoro count when a focus interval finishes and a task is bound. The increment happens unconditionally — it does NOT depend on, and is NOT capped by, the task's `pomoEstimate`.

#### Scenario: Increment on focus complete

- **WHEN** a focus interval finishes while a task is focused
- **THEN** the task's pomoCompleted count increases by 1

#### Scenario: Increment is not capped by the task's estimate

- **WHEN** a focus interval finishes while a focused task has `pomoEstimate = 0` and `pomoCompleted = 0`
- **THEN** the task's `pomoCompleted` becomes `1`
- **AND** the task's `pomoEstimate` remains `0`

#### Scenario: Increment past the task's estimate

- **WHEN** a focus interval finishes while a focused task has `pomoEstimate = 3` and `pomoCompleted = 3`
- **THEN** the task's `pomoCompleted` becomes `4`
- **AND** the task's `pomoEstimate` remains `3`

#### Scenario: Skip during focus also increments

- **WHEN** the user clicks skip during a focus interval while a task is focused
- **THEN** the task's pomoCompleted count increases by 1
- **AND** `pomoEstimate` is not modified
