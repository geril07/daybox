## ADDED Requirements

### Requirement: Routines are reusable daily checklists

The system SHALL model a routine as a reusable checklist definition with embedded routine steps. A routine SHALL have a stable `id`, `name`, `active` flag, `sortOrder`, `steps`, and `createdAt` timestamp. A routine step SHALL have a stable `id`, `title`, `active` flag, `sortOrder`, and `createdAt` timestamp.

#### Scenario: Create routine definition

- **WHEN** the user creates a routine named "Morning Routine"
- **THEN** the routines store contains a new routine with that name, `active: true`, a generated id, an empty `steps` array, and a `createdAt` timestamp

#### Scenario: Add routine step

- **WHEN** the user adds the step "Drink water" to "Morning Routine"
- **THEN** that routine's `steps` array contains a new routine step with title "Drink water", `active: true`, a generated id, and a `sortOrder` after the existing steps in that routine

#### Scenario: Routine steps are scoped to their routine

- **WHEN** a routine has steps and another routine is created
- **THEN** the existing steps remain embedded only in their original routine

### Requirement: User can manage routines and routine steps

The system SHALL allow users to create, rename, activate/deactivate, delete, and reorder routines. The system SHALL allow users to add, edit, activate/deactivate, delete, and reorder steps inside a routine.

#### Scenario: Rename routine

- **WHEN** the user renames a routine
- **THEN** the routine's `name` is updated without changing its id, steps, or completion history

#### Scenario: Deactivate routine

- **WHEN** the user deactivates a routine
- **THEN** the routine remains in the store with `active: false`
- **AND** the routine no longer appears in the Today routines section

#### Scenario: Delete routine

- **WHEN** the user deletes a routine
- **THEN** the routine is removed from the routines store
- **AND** completion entries for that routine's steps are removed from `stepCompletionsByDate`

#### Scenario: Edit routine step title

- **WHEN** the user edits a routine step title
- **THEN** the step's `title` is updated without changing its id or completion history

#### Scenario: Deactivate routine step

- **WHEN** the user deactivates a routine step
- **THEN** the step remains embedded in its routine with `active: false`
- **AND** the step no longer appears in the Today routines section

#### Scenario: Reorder routine steps

- **WHEN** the user reorders the steps inside a routine
- **THEN** only steps inside that routine receive updated `sortOrder` values
- **AND** steps in other routines are unchanged

### Requirement: Routine step completion is tracked per date

The system SHALL track routine step completion in sparse state named `stepCompletionsByDate`, keyed by `YYYY-MM-DD` date and then by routine step id. Missing completion entries SHALL mean incomplete.

#### Scenario: Complete routine step for today

- **WHEN** the user checks a routine step on `2026-06-11`
- **THEN** `stepCompletionsByDate['2026-06-11'][stepId]` is written with a `completedAt` timestamp

#### Scenario: Uncomplete routine step for today

- **WHEN** the user unchecks a routine step on `2026-06-11`
- **THEN** the `stepCompletionsByDate['2026-06-11'][stepId]` entry is removed

#### Scenario: Missing completion means incomplete

- **WHEN** a routine step has no entry for `2026-06-11`
- **THEN** the step is treated as incomplete for `2026-06-11`

#### Scenario: Completion does not affect other dates

- **WHEN** a routine step is completed on `2026-06-11`
- **THEN** the same step is still incomplete on `2026-06-12` unless that date also has a completion entry

### Requirement: Today view shows routine checklist cards

The system SHALL show active routines in a dedicated "Routines" section of the Today view. Each active routine SHALL render as a checklist card with its name, active steps, and progress count for the current date.

#### Scenario: Active routine appears in Today

- **WHEN** Today is rendered and an active routine has active steps
- **THEN** the Today view shows a "Routines" section containing that routine card
- **AND** the card shows each active step with a checkbox

#### Scenario: Routine progress is shown

- **WHEN** a routine has five active steps and three are completed for today
- **THEN** the routine card shows progress equivalent to `3/5`

#### Scenario: Completed routine step styling

- **WHEN** a routine step is completed for today
- **THEN** the step appears checked and visually completed

#### Scenario: Inactive content is hidden from Today

- **WHEN** a routine or routine step has `active: false`
- **THEN** that routine or step is not rendered in the Today routines section

### Requirement: Routines do not behave like tasks

The system SHALL NOT treat routines or routine steps as tasks. Routine steps SHALL NOT have task date picker, group tag, Pomodoro estimate, timer focus action, task drag-and-drop behavior, or overdue behavior.

#### Scenario: Routine step has no task affordances

- **WHEN** a routine step is rendered in Today
- **THEN** it does not show task group, date picker, Pomodoro progress, focus, or delete-row controls

#### Scenario: Missed routine step is not overdue

- **WHEN** a routine step is incomplete yesterday and Today is rendered
- **THEN** the step does not appear in the Overdue task section
- **AND** Today's routine step state starts from today's completion entries only

#### Scenario: Completing routine step does not create task data

- **WHEN** the user completes a routine step
- **THEN** no task is created or updated in `daybox-tasks`

### Requirement: Routines persist locally

The system SHALL persist routine state in the routines feature's own store under `daybox-routines`. The persisted state SHALL include routines and `stepCompletionsByDate`.

#### Scenario: Routine survives reload

- **WHEN** the user creates a routine and reloads the app
- **THEN** the routine and its steps are restored from `daybox-routines`

#### Scenario: Completion survives reload

- **WHEN** the user completes a routine step for today and reloads the app
- **THEN** the step remains completed for today
