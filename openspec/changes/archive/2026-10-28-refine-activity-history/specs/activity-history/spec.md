# Spec Delta

## MODIFIED Requirements

### Requirement: Every event carries identity and time

Every event SHALL have a unique `id`, a `type`, an `at` UTC ISO timestamp of when the event occurred, and `utcOffsetMinutes`: the local offset from UTC at that instant, east positive, an integer from `-840` through `840`. A user action occurs when it is performed; a natural focus completion occurs when its countdown reached zero.

#### Scenario: Late-detected focus completion keeps its real time

- **WHEN** a focus interval reaches zero at 10:25 while the device sleeps, and the app detects the completion at 13:00
- **THEN** the `focus.ended` event has `at` at 10:25

#### Scenario: Event records local offset

- **WHEN** an event is recorded in a browser whose local time is UTC+3
- **THEN** the event has `utcOffsetMinutes = 180`
- **AND** `at` is the UTC instant of the event

### Requirement: Checking a task records task.completed and task.uncompleted

When a task changes from not completed to completed, the system SHALL record `task.completed` with `taskId`, `title`, `groupId`, `groupName`, and `date` as they are at that moment. When a task changes from completed to not completed, the system SHALL record `task.uncompleted` with `taskId`.

#### Scenario: Complete a task

- **WHEN** user checks a task "Write report" in group `work` dated `2026-10-28`
- **THEN** a `task.completed` event is recorded with `title = 'Write report'`, `groupId = 'work'`, the current name of group `work` as `groupName`, and `date = '2026-10-28'`

#### Scenario: Reopen and complete again

- **WHEN** user checks a task, unchecks it, and checks it again
- **THEN** the history contains `task.completed`, `task.uncompleted`, and `task.completed` for that task in this order

### Requirement: Removing a task records task.deleted

When a task is removed by task deletion, series deletion, or group deletion with its tasks, the system SHALL record one `task.deleted` event per removed task with `taskId`, `title`, `groupId`, `groupName`, and `completed` as they are at that moment. Skipping a recurring occurrence SHALL NOT record `task.deleted`, because the series already records the skipped date.

#### Scenario: Delete a task

- **WHEN** user deletes a completed task "Old note"
- **THEN** a `task.deleted` event is recorded with `title = 'Old note'` and `completed = true`

#### Scenario: Delete a series

- **WHEN** user deletes a series that has three occurrence tasks
- **THEN** three `task.deleted` events are recorded, one per occurrence

#### Scenario: Delete a group with its tasks

- **WHEN** user deletes group "Work" together with its tasks
- **THEN** each `task.deleted` event has `groupName = 'Work'`

#### Scenario: Skip an occurrence

- **WHEN** user skips one occurrence of a series
- **THEN** no `task.deleted` event is recorded

### Requirement: Ending a focus interval records focus.ended

When a focus-phase interval ends, the system SHALL record `focus.ended` with `taskId`, `groupId`, and `groupName` of the focused task (or `null` when no task is focused), `outcome`, `plannedMs` (the interval's resolved duration), and `focusedMs` (elapsed focus time, at most `plannedMs`). Outcomes are `completed` (the countdown reached zero), `skipped` (user pressed Skip), and `abandoned` (user restarted the interval or switched phase after focus time elapsed). Break intervals SHALL NOT record events.

#### Scenario: Focus interval completes

- **WHEN** a 25-minute focus interval on task `t1` reaches zero
- **THEN** a `focus.ended` event is recorded with `outcome = 'completed'`, `taskId = 't1'`, `plannedMs = 1500000`, and `focusedMs = 1500000`

#### Scenario: Focus without a task

- **WHEN** a focus interval completes and no task is focused
- **THEN** a `focus.ended` event is recorded with `taskId = null`, `groupId = null`, and `groupName = null`

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

## ADDED Requirements

### Requirement: Group snapshots include the group name

Events that snapshot a `groupId` SHALL also snapshot `groupName`: the name of that group when the event occurs, or `null` when no group with that id exists. Later renames or deletion of the group SHALL NOT change recorded names.

#### Scenario: Renamed group keeps the old name in history

- **WHEN** user completes a task in group "Work" and then renames the group to "Job"
- **THEN** the `task.completed` event still has `groupName = 'Work'`

#### Scenario: Missing group

- **WHEN** an event is recorded for a task whose `groupId` matches no group
- **THEN** the event has `groupName = null`

### Requirement: History records when tracking started

The history SHALL store `trackingStartedAt` (UTC ISO timestamp) and `trackingUtcOffsetMinutes` (same convention as events): the moment from which events are recorded. The values SHALL be set and persisted on the first launch without stored history, even when no event occurs. When history resets because the stored blob is invalid, tracking SHALL start again at that load.

#### Scenario: First launch persists the tracking start

- **WHEN** the app loads with no `daybox-history` key and the user records no event
- **THEN** `daybox-history` is written with `trackingStartedAt` and an empty event list

#### Scenario: Tracking start survives reloads

- **WHEN** the app is reloaded on a later day
- **THEN** `trackingStartedAt` keeps its first-launch value
