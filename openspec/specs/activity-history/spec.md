## Purpose

Keeps an append-only, timestamped record of task and focus events so that future history and analytics views can be computed from facts that the current-state stores overwrite or delete.

## Requirements

### Requirement: Activity history is an append-only event list

The system SHALL keep activity history as an ordered list of events. Recording SHALL only append. No user action SHALL edit or remove a recorded event; deleting, editing, or reopening a task SHALL NOT change events that were already recorded. Only a confirmed data import or restore MAY replace the list.

#### Scenario: Later task changes do not rewrite history

- **WHEN** user completes a task, then edits its title, then deletes it
- **THEN** the history contains the `task.completed` event with the title at completion time
- **AND** the history also contains a `task.deleted` event
- **AND** the `task.completed` event is unchanged

#### Scenario: Events keep their record order

- **WHEN** user reschedules a task and then completes it
- **THEN** the `task.rescheduled` event comes before the `task.completed` event in the list

### Requirement: Every event carries identity and time

Every event SHALL have a unique `id`, a `type`, an `at` UTC ISO timestamp of when it was recorded, and `utcOffsetMinutes`: the local offset from UTC at record time, east positive, an integer from `-840` through `840`.

#### Scenario: Event records local offset

- **WHEN** an event is recorded in a browser whose local time is UTC+3
- **THEN** the event has `utcOffsetMinutes = 180`
- **AND** `at` is the UTC instant of recording

### Requirement: Rescheduling a task records task.rescheduled

When a task's `date` changes to a different value, the system SHALL record `task.rescheduled` with `taskId`, `from` (previous date or `null`), and `to` (new date or `null`). An update that keeps the same date SHALL NOT record an event.

#### Scenario: Move a task to tomorrow

- **WHEN** user moves a task dated `2026-10-28` to `2026-10-29`
- **THEN** a `task.rescheduled` event is recorded with `from = '2026-10-28'` and `to = '2026-10-29'`

#### Scenario: Unschedule a task

- **WHEN** user sets a dated task to Unscheduled
- **THEN** a `task.rescheduled` event is recorded with `to = null`

#### Scenario: Same-date update records nothing

- **WHEN** a task update sets `date` to the task's current date, or does not change `date`
- **THEN** no `task.rescheduled` event is recorded

### Requirement: Checking a task records task.completed and task.uncompleted

When a task changes from not completed to completed, the system SHALL record `task.completed` with `taskId`, `title`, `groupId`, and `date` as they are at that moment. When a task changes from completed to not completed, the system SHALL record `task.uncompleted` with `taskId`.

#### Scenario: Complete a task

- **WHEN** user checks a task "Write report" in group `work` dated `2026-10-28`
- **THEN** a `task.completed` event is recorded with `title = 'Write report'`, `groupId = 'work'`, and `date = '2026-10-28'`

#### Scenario: Reopen and complete again

- **WHEN** user checks a task, unchecks it, and checks it again
- **THEN** the history contains `task.completed`, `task.uncompleted`, and `task.completed` for that task in this order

### Requirement: Removing a task records task.deleted

When a task is removed by task deletion, series deletion, or group deletion with its tasks, the system SHALL record one `task.deleted` event per removed task with `taskId`, `title`, `groupId`, and `completed` as they are at that moment. Skipping a recurring occurrence SHALL NOT record `task.deleted`, because the series already records the skipped date.

#### Scenario: Delete a task

- **WHEN** user deletes a completed task "Old note"
- **THEN** a `task.deleted` event is recorded with `title = 'Old note'` and `completed = true`

#### Scenario: Delete a series

- **WHEN** user deletes a series that has three occurrence tasks
- **THEN** three `task.deleted` events are recorded, one per occurrence

#### Scenario: Skip an occurrence

- **WHEN** user skips one occurrence of a series
- **THEN** no `task.deleted` event is recorded

### Requirement: Ending a focus interval records focus.ended

When a focus-phase interval ends, the system SHALL record `focus.ended` with `taskId` and `groupId` of the focused task (or `null` when no task is focused), `outcome`, `plannedMs` (the interval's resolved duration), and `focusedMs` (elapsed focus time, at most `plannedMs`). Outcomes are `completed` (the countdown reached zero), `skipped` (user pressed Skip), and `abandoned` (user restarted the interval or switched phase after focus time elapsed). Break intervals SHALL NOT record events.

#### Scenario: Focus interval completes

- **WHEN** a 25-minute focus interval on task `t1` reaches zero
- **THEN** a `focus.ended` event is recorded with `outcome = 'completed'`, `taskId = 't1'`, `plannedMs = 1500000`, and `focusedMs = 1500000`

#### Scenario: Focus without a task

- **WHEN** a focus interval completes and no task is focused
- **THEN** a `focus.ended` event is recorded with `taskId = null` and `groupId = null`

#### Scenario: User skips focus

- **WHEN** user presses Skip after 10 minutes of a 25-minute focus interval
- **THEN** a `focus.ended` event is recorded with `outcome = 'skipped'` and `focusedMs` of about `600000`

#### Scenario: User restarts focus

- **WHEN** user presses Restart after 5 minutes of a focus interval
- **THEN** a `focus.ended` event is recorded with `outcome = 'abandoned'`

#### Scenario: User switches phase during focus

- **WHEN** user switches to Short break after 5 minutes of a focus interval
- **THEN** a `focus.ended` event is recorded with `outcome = 'abandoned'`

#### Scenario: Untouched interval is not abandoned

- **WHEN** user switches phase while the focus interval has no elapsed time
- **THEN** no `focus.ended` event is recorded

#### Scenario: Break end records nothing

- **WHEN** a short or long break completes or is skipped
- **THEN** no event is recorded

### Requirement: Activity history persists under daybox-history

The system SHALL persist the event list under the localStorage key `daybox-history` and restore it on reload. A persisted blob that fails validation SHALL reset history to an empty list according to the shared rehydration policy. History SHALL start empty when the feature ships; existing task data SHALL NOT be converted into events.

#### Scenario: History survives reload

- **WHEN** user completes a task and reloads the page
- **THEN** the `task.completed` event is still in the history

#### Scenario: First load after upgrade

- **WHEN** the app loads for the first time with this feature and existing tasks have `pomoCompleted > 0` and `completedAt` values
- **THEN** the history is empty
