## MODIFIED Requirements

### Requirement: Editing a series affects only occurrences that do not yet exist

The system SHALL apply series edits — `title`, `groupId`, `pomoEstimate`, `weekdays`, `active`, and `sortOrder` — to future generation. As an exception, a validated change to the series title SHALL also rename existing tasks with the same `seriesId` whose title exactly equals the series title before the change, whose current scheduled `date` is the effective planner date or later, and which are unfinished. The effective planner date SHALL respect the configured day-start time. Past, completed, unscheduled, differently named, and unrelated tasks SHALL remain unchanged. The rename SHALL preserve all task fields other than `title`. Invalid updates SHALL change neither the series nor its tasks.

Editing a series SHALL NOT rewrite the group or pomodoro estimate of any task already carrying that `seriesId`.

Deactivating a series SHALL stop future generation. It SHALL NOT remove the series or any of its existing occurrences from the store.

A task's inline title edit, group reassignment, or pomodoro estimate edit SHALL apply to that task alone and SHALL NOT modify its series.

#### Scenario: Rename matching upcoming tasks

- **WHEN** the user renames a series from "Exercise" to "Stretching"
- **THEN** its unfinished tasks scheduled for today or later and titled "Exercise" are renamed to "Stretching"
- **AND** newly generated tasks use "Stretching"
- **AND** no task field other than title changes

#### Scenario: Preserve exceptions and history

- **WHEN** the user renames a series
- **THEN** past, completed, unscheduled, and differently named tasks are unchanged
- **AND** tasks belonging to another series or no series are unchanged

#### Scenario: Respect rescheduling and the planner day boundary

- **WHEN** the user renames a series before the configured day-start time
- **THEN** the effective planner date is used rather than the calendar date
- **AND** task eligibility uses its current scheduled date rather than its original occurrence date

#### Scenario: Reject an invalid rename

- **WHEN** a series update fails validation
- **THEN** neither the series nor any task is changed

#### Scenario: Changing the estimate affects only future occurrences

- **WHEN** the user changes the series "Работа" `pomoEstimate` from `4` to `3` after the occurrence for `'2026-10-06'` has been generated
- **THEN** the existing occurrence for `'2026-10-06'` keeps `pomoEstimate` `4`
- **AND** the occurrence generated for a later matching date has `pomoEstimate` `3`

#### Scenario: Renaming an occurrence does not rename the series

- **WHEN** the user renames the generated task "Отжимания" for `'2026-10-06'` inline
- **THEN** only that task's `title` changes
- **AND** the series title is unchanged
- **AND** a later occurrence is generated with the series' original title

#### Scenario: Narrowing the weekdays stops future generation

- **WHEN** the user changes the series "Работа" `weekdays` from `[1, 2, 3, 4, 5]` to `[1, 3, 5]`
- **AND** the occurrence for `'2026-10-06'` (a Tuesday) already exists
- **THEN** that occurrence remains in the store
- **AND** no occurrence is generated for a later Tuesday inside the horizon

#### Scenario: Deactivating stops generation without deleting

- **WHEN** the user sets the series "Работа" `active` to `false`
- **THEN** the series remains in the store with `active: false`
- **AND** its existing occurrences remain in the store
- **AND** a later `ensureOccurrences` run writes no new occurrence for it
