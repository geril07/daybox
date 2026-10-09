## Why

Every day the user re-types the same handful of activities — "работа", "отжимания", "приседания", "язык" — into the quick-add row, because DayBox has no way to say "this task repeats". Weekday-only work is worse: it is noise on Saturday and Sunday. Rewriting four tasks every morning is pure friction, and the friction is why the two previous attempts at this (`add-daily-routines`, `feat/add-daily-tasks`) were both abandoned: each introduced a second task-shaped entity that could not carry groups, pomodoros, drag order, or focus, so the routine and the plan lived in two places that could not be mixed.

The fix is not a routine concept. It is recurrence on the task the app already has.

## What Changes

- Add a `Series` template record: `title`, `groupId`, `pomoEstimate`, `weekdays`, `active`, `skipDates`, `createdAt`.
- Add two nullable fields to `Task`: `seriesId` and `occurrenceDate`. `occurrenceDate` identifies which recurrence produced the task; `date` remains where the task currently sits.
- Generate one ordinary `Task` per matching day, from the effective planner date through the end of the configured week. Generated tasks carry no marker beyond the two fields and behave like every other task.
- Deduplicate on `(seriesId, occurrenceDate)`, so rescheduling a generated task never causes the generator to recreate the original occurrence.
- Exclude generated tasks from the Overdue section. A missed routine is history, not a deadline.
- Record `skipDates` when the user deletes or skips a generated task, so the generator does not resurrect it.
- Reject occurrences past the end of the configured week. Series edits affect future occurrences only; an already-generated task is never rewritten.
- Detect the planner-day rollover while the page stays open (`visibilitychange`, `focus`, and a bounded interval), and re-run generation when `dayStartMinutes` changes.
- Persist series in the existing `daybox-tasks` store. The tasks save slice moves from version 1 to version 2 with a migration; no new store, no new envelope version.
- Add a Recurring section to the Settings drawer for creating, renaming, deactivating, reordering, and deleting series, and for editing their weekdays, group, and pomodoro estimate.
- Show a recurring marker on generated task rows. Deleting such a row offers "skip this occurrence" and "delete the whole series".
- Delete `openspec/changes/add-daily-routines/`, which specified a separate routine entity that Today-only and pomodoro-less.

## Capabilities

### New Capabilities

- `recurring-tasks`: Series templates, per-occurrence generation, the generation trigger, skip/delete semantics, series editing rules, and the Settings management surface.

### Modified Capabilities

- `task-management`: `Task` gains `seriesId` and `occurrenceDate`; a mutual-presence invariant between them; generated tasks are excluded from Overdue; deleting a generated task records a skip; the settings delta covers series title bounds.
- `time-views`: The generation horizon is the effective planner date through the end of the configured week; generated tasks need no dedicated section; crossing the day boundary while the page is open is now detected.
- `settings`: The drawer mounts a recurring-tasks panel owned by the tasks feature.
- `data-persistence`: The tasks store persists `series` alongside `tasks` under the unchanged `daybox-tasks` key.
- `data-portability`: The tasks save slice is version 2 and migrates version 1 exports.
- `data-validation`: `Series.title` is a bounded user-input field.

## Impact

- `src/modules/tasks/schema/` gains a `v2` entity schema with `seriesId`/`occurrenceDate` on `Task` and the `Series` schema; `schema.ts` re-aliases the current version.
- `src/modules/tasks/store.ts` gains a `series` array plus series CRUD and the `ensureOccurrences` action; `afterValidate` normalizes orphaned tasks and series.
- `src/modules/tasks/queries.ts` excludes generated tasks from `selectOverdue`.
- `src/modules/tasks/store.helpers.ts` gains occurrence-matching and generation helpers.
- `src/modules/tasks/components/RecurringSettingsPanel.tsx` is new; `TaskRow.tsx` gains a recurring marker and delete confirmation.
- `src/modules/tasks/save/` gains a `v2` slice schema and a `migrateFrom[1]` entry; `registry.ts` is unchanged.
- `src/app/App.tsx` mounts the day-rollover trigger.
- No new store key, no new envelope version, no new dependency, and no change to `TaskRow`, `TaskList`, `TimerBar`, or `useTimerStore`.
