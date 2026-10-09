## ADDED Requirements

### Requirement: Group deletion resolves series and occurrences

Moving a deleted group's tasks to default SHALL also reassign its series to the default group. Deleting a group's tasks SHALL also delete its series and every task carrying those series ids, including occurrences reassigned to other groups. Destructive actions SHALL clear focus when the focused task is removed.

#### Scenario: Move a deleted group's content to default

- **WHEN** the user deletes a group and chooses to move its tasks to default
- **THEN** both its tasks and its series reference the default group
- **AND** future generation uses the default group

#### Scenario: Delete a group's content

- **WHEN** the user deletes a group and chooses to delete its tasks
- **THEN** its series and every occurrence of those series are removed
- **AND** generation cannot recreate those occurrences

### Requirement: A series is a reusable weekday rule

The system SHALL model a recurring series as a persisted `Series` record owned by the tasks feature. A `Series` SHALL have a stable `id`, a `title` of 1 to 280 characters after trim, a `groupId` referencing an existing group, a `pomoEstimate` in `[0, 99]`, a `weekdays` array of day-of-week numbers in `[0, 6]` with at least one entry, an `active` flag, a `skipDates` array of `YYYY-MM-DD` strings, a `sortOrder`, and a `createdAt` timestamp.

The grammar of recurrence SHALL be exactly "which weekdays". The system SHALL NOT support monthly, yearly, interval-based, or end-dated recurrence in this capability.

#### Scenario: Create a daily series

- **WHEN** the user creates a series titled "Отжимания" with `weekdays` `[0, 1, 2, 3, 4, 5, 6]`
- **THEN** the tasks store contains a series with that title, `active: true`, an empty `skipDates`, a generated `id`, and a `createdAt` timestamp

#### Scenario: Create a weekday-only series

- **WHEN** the user creates a series titled "Работа" with `weekdays` `[1, 2, 3, 4, 5]` and `pomoEstimate` `4`
- **THEN** the stored series has `weekdays` `[1, 2, 3, 4, 5]` and `pomoEstimate` `4`

#### Scenario: An empty weekday list is rejected

- **WHEN** a series is created with `weekdays` `[]`
- **THEN** the schema rejects the series
- **AND** the store emits a `console.warn` and does not add it

#### Scenario: An overlong title is rejected

- **WHEN** a series is created with a 281-character title
- **THEN** the schema rejects the series
- **AND** the store emits a `console.warn` and does not add it

#### Scenario: A series without a group falls back to the default group

- **WHEN** a series is created without an explicit `groupId`
- **THEN** the stored series uses the canonical `DEFAULT_GROUP_ID`

### Requirement: A series matches a date when its weekday list contains that date's weekday

The system SHALL determine whether a series applies to a given `YYYY-MM-DD` date by reading the local day of week of that date and testing membership in `series.weekdays`. A series SHALL NOT apply to a date listed in `series.skipDates`.

#### Scenario: Weekday list matches that weekday

- **WHEN** the system evaluates the series "Работа" with `weekdays` `[1, 2, 3, 4, 5]` against `2026-10-06` (a Tuesday, day-of-week `2`)
- **THEN** the series matches the date

#### Scenario: Weekday list excludes the weekend

- **WHEN** the system evaluates the series "Работа" with `weekdays` `[1, 2, 3, 4, 5]` against `2026-10-10` (a Saturday, day-of-week `6`)
- **THEN** the series does not match the date

#### Scenario: A skipped date never matches

- **WHEN** the series "Язык" has `skipDates` `["2026-10-08"]`
- **AND** the system evaluates it against `2026-10-08` (a Thursday, day-of-week `4`) whose weekday is in `weekdays`
- **THEN** the series does not match the date

### Requirement: Generation writes one ordinary task per matching date in the horizon

The system SHALL provide an `ensureOccurrences` action on the tasks store. Given a horizon of dates, the action SHALL, for every active series and every date in the horizon that the series matches and that has no existing occurrence, append one `Task` to the store.

A generated task SHALL copy `title`, `groupId`, and `pomoEstimate` from the series, SHALL set `date` and `occurrenceDate` to the generated date, SHALL set `seriesId` to the series id, SHALL start with `completed: false`, `completedAt: null`, and `pomoCompleted: 0`, and SHALL receive a generated `id` and `createdAt`.

A generated task SHALL carry no field, marker, or behaviour beyond `seriesId` and `occurrenceDate`. It SHALL be an ordinary `Task` in every other respect.

#### Scenario: A matching series produces a task for today

- **WHEN** `ensureOccurrences` runs with a horizon containing `2026-10-06` (a Tuesday)
- **AND** the series "Работа" has `weekdays` `[1, 2, 3, 4, 5]` and no occurrence for that date
- **THEN** the store contains one task with `seriesId` equal to that series, `occurrenceDate` `'2026-10-06'`, `date` `'2026-10-06'`, `title` `'Работа'`, and `pomoEstimate` `4`

#### Scenario: A series that does not match produces nothing

- **WHEN** `ensureOccurrences` runs with a horizon containing `2026-10-10` (a Saturday)
- **AND** the series "Работа" has `weekdays` `[1, 2, 3, 4, 5]`
- **THEN** the store contains no task with that series and `occurrenceDate` `'2026-10-10'`

#### Scenario: A generated task starts incomplete with no pomodoros

- **WHEN** an occurrence is generated for a series
- **THEN** the task has `completed: false`, `completedAt: null`, and `pomoCompleted: 0`

#### Scenario: A generated task starts at the end of its date bucket

- **WHEN** an occurrence is generated for `2026-10-06` and that bucket already contains three tasks
- **THEN** the generated task is ordered after those three tasks in the visible list for `2026-10-06`
- **AND** the bucket's `sortOrder` values remain unique

#### Scenario: Generation is idempotent

- **WHEN** `ensureOccurrences` runs twice with the same horizon and no series changed in between
- **THEN** the store contains exactly one task per `(seriesId, occurrenceDate)` and no duplicate is written

#### Scenario: A past date outside the horizon is not backfilled

- **WHEN** the app reopens on `2026-10-09` and the series "Отжимания" matches every weekday
- **AND** no occurrence exists for `2026-10-06`
- **THEN** `ensureOccurrences` writes no task for `2026-10-06`

### Requirement: Occurrence identity is the pair of series id and occurrence date

A task SHALL be considered an occurrence of a series when it has `seriesId` equal to that series and `occurrenceDate` equal to the date the series generated it for. The deduplication key SHALL be the pair `(seriesId, occurrenceDate)`.

`seriesId` and `occurrenceDate` SHALL be present together or absent together. The schema SHALL reject a persisted or imported task that has one without the other.

`date` SHALL remain independent of `occurrenceDate`. Rescheduling a task through the existing date control SHALL change only `date` and SHALL NOT change `occurrenceDate` or `seriesId`.

#### Scenario: An ordinary task has neither field

- **WHEN** a task is created through the quick-add row
- **THEN** the task has `seriesId: null` and `occurrenceDate: null`

#### Scenario: Rescheduling an occurrence does not recreate it

- **WHEN** an occurrence for `occurrenceDate` `'2026-10-06'` is rescheduled to `date` `'2026-10-07'`
- **AND** `ensureOccurrences` runs with a horizon containing `'2026-10-06'`
- **THEN** no new task is written for that series and `'2026-10-06'`
- **AND** the store still contains exactly one task for that `(seriesId, occurrenceDate)` pair

#### Scenario: A half-populated pair is rejected

- **WHEN** a task is validated with `seriesId` set and `occurrenceDate` `null`
- **THEN** validation fails
- **AND** rehydration resets the tasks state to its empty default

#### Scenario: The pair must be unique across the store

- **WHEN** a persisted store contains two tasks with the same `seriesId` and the same `occurrenceDate`
- **THEN** rehydration resets the tasks state to its empty default

### Requirement: Deleting or skipping an occurrence records the date on the series

When the user deletes a generated task, the system SHALL offer a choice between skipping that occurrence and deleting the whole series. Skipping SHALL remove the task from the store and append the task's `occurrenceDate` to that series' `skipDates`. Deleting the whole series SHALL remove the series from the store and remove every task carrying that `seriesId`.

The system SHALL NOT write a `skipDates` entry when a task without a `seriesId` is deleted.

#### Scenario: Skipping an occurrence stops regeneration

- **WHEN** the user skips the occurrence of series "Язык" for `'2026-10-08'`
- **THEN** that task is removed from the store
- **AND** `skipDates` for that series contains `'2026-10-08'`
- **AND** a later `ensureOccurrences` run with a horizon containing `'2026-10-08'` writes no task for it

#### Scenario: Deleting the series removes all its occurrences

- **WHEN** the user deletes the series "Работа"
- **THEN** the series is removed from the store
- **AND** every task carrying that series' `id` is removed from the store
- **AND** tasks without that `seriesId` are untouched

#### Scenario: Deleting an ordinary task writes no skip

- **WHEN** the user deletes a task whose `seriesId` is `null`
- **THEN** no series' `skipDates` is modified

### Requirement: Editing a series affects only occurrences that do not yet exist

The system SHALL apply series edits — `title`, `groupId`, `pomoEstimate`, `weekdays`, `active`, and `sortOrder` — to future generation only. Editing a series SHALL NOT rewrite the title, group, or pomodoro estimate of any task already carrying that `seriesId`.

Deactivating a series SHALL stop future generation. It SHALL NOT remove the series or any of its existing occurrences from the store.

A task's inline title edit, group reassignment, or pomodoro estimate edit SHALL apply to that task alone and SHALL NOT modify its series.

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

### Requirement: Rehydrate normalizes recurrence state before exposing it

After successful schema validation, the tasks store SHALL normalize recurrence state before making it visible: tasks missing `seriesId` and `occurrenceDate` SHALL receive `null` for both, `skipDates` entries SHALL be kept only when their date format is valid, and `sortOrder` on every series SHALL be normalized to a dense `0..N-1` sequence in its current order. Rehydration SHALL NOT remove occurrences of a series that no longer exists; such tasks SHALL be treated as ordinary tasks from that point on.

The normalization SHALL run through the `afterValidate` hook of `createValidatedRehydrate` and SHALL NOT run when schema validation fails.

#### Scenario: Tasks persisted before recurrence existed load cleanly

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a valid blob whose tasks have no `seriesId` or `occurrenceDate` keys
- **AND** the app rehydrates the tasks store
- **THEN** every task has `seriesId: null` and `occurrenceDate: null`
- **AND** `series` is empty
- **AND** no rehydrate-reset warning is emitted

#### Scenario: Series sort orders are densified on load

- **WHEN** a persisted blob has series with `sortOrder` values `[0, 1, 4]`
- **AND** the app rehydrates the tasks store
- **THEN** the series `sortOrder` values are `[0, 1, 2]` in the same order

#### Scenario: An orphaned occurrence becomes an ordinary task

- **WHEN** a persisted task carries a `seriesId` that no series in the blob declares
- **AND** the app rehydrates the tasks store
- **THEN** the task remains in the store
- **AND** `ensureOccurrences` writes no further occurrences for that absent series

### Requirement: Settings manages series definitions

The Settings drawer SHALL expose a Recurring section that mounts a panel owned by the tasks feature. The panel SHALL let the user create, rename, change the weekday selection, change the group, change the pomodoro estimate, activate or deactivate, reorder, and delete series. The panel SHALL NOT offer a natural-language recurrence syntax.

The weekday selector SHALL render the seven days beginning with the planner's configured `weekStartDay` for display, while storing absolute day-of-week numbers in `0..6`. Series SHALL NOT be editable from a planner view, from a task row, or from the sidebar.

#### Scenario: Create a series from Settings

- **WHEN** the user enters a title and a weekday selection in the Recurring panel and confirms
- **THEN** a new active series is stored with that title and those weekdays
- **AND** no task is created immediately; occurrences appear on the next generation run

#### Scenario: Toggle a series off from Settings

- **WHEN** the user deactivates the series "Работа" in the Recurring panel
- **THEN** the series is stored with `active: false`
- **AND** its existing occurrences are still visible in the dates they belong to

#### Scenario: Weekday toggles follow the first day of week

- **WHEN** the planner preference `weekStartDay` is `0` (Sunday)
- **AND** the user opens the Recurring panel
- **THEN** the weekday toggles are ordered Sunday through Saturday
- **AND** the stored `weekdays` values are absolute day-of-week numbers

#### Scenario: Delete a series from Settings

- **WHEN** the user deletes the series "Приседания" in the Recurring panel
- **THEN** the series and all of its occurrences are removed from the store
