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

Every event SHALL have a unique `id`, a `type`, an `at` UTC ISO timestamp of when the event occurred, and `utcOffsetMinutes`: the local offset from UTC at that instant, east positive, an integer from `-840` through `840`. A user action occurs when it is performed; a natural focus completion occurs when its countdown reached zero.

#### Scenario: Late-detected focus completion keeps its real time

- **WHEN** a focus interval reaches zero at 10:25 while the device sleeps, and the app detects the completion at 13:00
- **THEN** the `focus.ended` event has `at` at 10:25

#### Scenario: Event records local offset

- **WHEN** an event is recorded in a browser whose local time is UTC+3
- **THEN** the event has `utcOffsetMinutes = 180`
- **AND** `at` is the UTC instant of the event

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

When a focus interval ends, the system SHALL record `focus.ended` with the focused task's `taskId`, `groupId`, and `groupName` (`null` without a task), `outcome`, `plannedMs` (resolved duration), and `focusedMs` (elapsed focus time, at most `plannedMs`). Outcome is `completed` (countdown reached zero), `skipped` (Skip), or `abandoned` (Restart or phase switch after focus time elapsed). Breaks SHALL NOT record events.

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

### Requirement: Group snapshots include the group name

Events that snapshot a `groupId` SHALL also snapshot `groupName`: the name of that group when the event occurs, or `null` when no group with that id exists. Later renames or deletion of the group SHALL NOT change recorded names.

#### Scenario: Renamed group keeps the old name in history

- **WHEN** user completes a task in group "Work" and then renames the group to "Job"
- **THEN** the `task.completed` event still has `groupName = 'Work'`

#### Scenario: Missing group

- **WHEN** an event is recorded for a task whose `groupId` matches no group
- **THEN** the event has `groupName = null`

### Requirement: History records when tracking started

The history SHALL store `trackingStartedAt` (UTC ISO timestamp) and `trackingUtcOffsetMinutes` (same convention as events): the moment from which events are recorded. Both SHALL be stored on the first load that finds no stored tracking start, even when no event occurs. Dropping invalid stored events SHALL NOT change them.

#### Scenario: First launch persists the tracking start

- **WHEN** the app loads with no stored history and the user records no event
- **THEN** the tracking start is stored even though the event list is empty

#### Scenario: Tracking start survives reloads

- **WHEN** the app is reloaded on a later day
- **THEN** `trackingStartedAt` keeps its first-launch value

#### Scenario: Invalid records do not move the tracking start

- **WHEN** the stored event list contains records that fail validation
- **THEN** those records are dropped and `trackingStartedAt` keeps its stored value

### Requirement: Activity history persists in IndexedDB

The system SHALL persist activity events in the IndexedDB database `daybox`, object store `historyEvents`: one record per event, keyed by event `id`, with an index on `at`. Recording an event SHALL write only that event. The running app SHALL NOT read or write the `daybox-history` localStorage key once migration has finished.

#### Scenario: One event write adds one record

- **WHEN** user completes a task while history already holds 5000 events
- **THEN** exactly one record is added to `historyEvents`
- **AND** stored records are not rewritten

#### Scenario: History survives reload

- **WHEN** user completes a task and reloads the page
- **THEN** the `task.completed` event is still in the history

#### Scenario: No history key in localStorage

- **WHEN** user inspects localStorage after using the app
- **THEN** `daybox-history` is absent

### Requirement: Invalid stored records are dropped individually

On load the system SHALL validate every stored event against the activity-history event schema. A record that fails validation SHALL be skipped and one `console.warn` SHALL report how many records were skipped. Valid records SHALL be kept and SHALL NOT be deleted from storage.

#### Scenario: One corrupt record among valid ones

- **WHEN** the event store holds four valid records and one record with an unknown `type`
- **THEN** history loads with the four valid events
- **AND** `console.warn` is called once

### Requirement: Legacy history migrates once

When localStorage holds a `daybox-history` blob, the system SHALL validate it, write its events and tracking start into IndexedDB, and remove the key only after the write succeeds. Re-running the migration SHALL NOT duplicate events. A blob that fails validation SHALL be removed with one `console.warn`, as the pre-migration app would have reset it on its next write.

#### Scenario: Migration keeps events and tracking start

- **WHEN** the app loads with a valid `daybox-history` blob holding seven events
- **THEN** `historyEvents` holds those seven events
- **AND** the tracking start equals the stored one
- **AND** `daybox-history` is gone

#### Scenario: Migration is not repeated

- **WHEN** the app loads again after a successful migration
- **THEN** no event is duplicated

#### Scenario: First load after upgrade

- **WHEN** the app loads with tasks that have `pomoCompleted > 0` and `completedAt` values
- **THEN** the history is empty
- **AND** tracking starts at that load

### Requirement: History loads before it is exported

Snapshot export and Google Drive backup SHALL build the `history` slice only after the in-memory history has finished loading.

#### Scenario: Export immediately after startup

- **WHEN** user opens settings and exports as soon as the app renders
- **THEN** the exported snapshot contains the stored history events
