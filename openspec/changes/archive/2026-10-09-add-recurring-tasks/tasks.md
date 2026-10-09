## 1. Schema and types

- [x] 1.1 Add `TaskV2Schema` in `src/modules/tasks/schema/v2.ts` — `TaskV1Schema` plus nullable `seriesId` and `occurrenceDate`, with a refinement rejecting a half-populated pair.
- [x] 1.2 Add `SeriesSchema` in the same file — `id`, `title` 1-280 trimmed, `groupId`, `pomoEstimate` in `[0, 99]`, `weekdays` as non-empty duplicate-free integers in `[0, 6]`, `active`, `skipDates` as duplicate-free `YYYY-MM-DD` strings, `sortOrder`, `createdAt`.
- [x] 1.3 Add `TaskStateSchema` for `{ tasks, series }` with a refinement rejecting duplicate `(seriesId, occurrenceDate)` pairs.
- [x] 1.4 Repoint `src/modules/tasks/schema.ts` at `v2` and export `Series` from `types.ts`.
- [x] 1.5 Add schema tests: fractional series estimate accepted, empty/duplicate/out-of-range/non-integer `weekdays` rejected, duplicate `skipDates` rejected, half-populated pair rejected, duplicate occurrence identity rejected, all-null identities accepted, legacy v1 blob-shaped task without the new keys parses.

## 2. Pure generation logic

- [x] 2.1 Add `getWeekEndDate(today, weekStartDay)` to `src/shared/dates/dates.ts` returning the last date of the week containing `today` for the given first day of week.
- [x] 2.2 Add date-range helpers to iterate the horizon from the effective planner date through that week end.
- [x] 2.3 Add `seriesMatchesDate(series, date)` to `src/modules/tasks/store.helpers.ts` — weekday membership plus `skipDates` exclusion.
- [x] 2.4 Add a pure `planOccurrences(series, tasks, horizon)` returning the `Task` shapes that would be created, with no store access.
- [x] 2.5 Add `PINNED_SORT_ORDER_BASE = 1_000_000` and have `planOccurrences` assign each generated task `sortOrder = PINNED_SORT_ORDER_BASE + index`.
- [x] 2.6 Tests for the pure helpers: weekday match and mismatch, weekend exclusion, `skipDates` exclusion, an already-existing `(seriesId, occurrenceDate)` producing no plan entry, a rescheduled occurrence still suppressing regeneration, inactive series producing nothing, dates outside the horizon producing nothing.

## 3. Store state and actions

- [x] 3.1 Add `series: Series[]` to `TaskState` and `planOccurrences`-backed `ensureOccurrences(today, weekStartDay)` to the tasks store; generation SHALL append missing occurrences for the horizon only.
- [x] 3.2 Assign new occurrences `sortOrder` from the pinned base and follow the append with `compactBucket(today)` so the visible bucket stays dense and ordinary tasks keep their relative order above the occurrences.
- [x] 3.3 Implement series actions: `addSeries`, `updateSeries(id, updates)`, `setSeriesActive(id, active)`, `reorderSeries(ids)`, `deleteSeries(id)`.
- [x] 3.4 Implement `deleteSeries` to remove the series plus every task carrying its `id`, and to cascade-clear `focusedTaskId` when a removed task was focused.
- [x] 3.5 Implement `skipOccurrence(taskId)` — remove the task, append its `occurrenceDate` to the series' `skipDates`, and cascade-clear focus when it was the focused task.
- [x] 3.6 Make series `addSeries` reject an empty or over-280 title and an invalid `weekdays` array with `console.warn`, defaulting `groupId` to the canonical `DEFAULT_GROUP_ID` when omitted.
- [x] 3.7 Extend the existing `afterValidate` to normalize recurrence state before `compactAllBuckets`: fill null `seriesId`/`occurrenceDate` on tasks, densify series `sortOrder`, and keep only well-formed `skipDates` entries.
- [x] 3.8 Store tests: idempotent `ensureOccurrences` across two runs, no backfill for past dates, no generation beyond the horizon end, skip suppresses regeneration, delete-series removes occurrences, series edits leave existing occurrences untouched, and a state failure on duplicate occurrence identity resets to the empty default.
- [x] 3.9 Extend group bulk actions: reassign both tasks and series to the target group; deleting a group's tasks also deletes its series and all their occurrences, clearing focus for removed tasks. Test both paths and confirm deleted occurrences cannot regenerate.

## 4. Overdue exclusion

- [x] 4.1 Add `t.seriesId === null` to the filter in `selectOverdue` in `src/modules/tasks/queries.ts`.
- [x] 4.2 Add query tests: an incomplete occurrence dated before today is excluded from `selectOverdue`, an ordinary incomplete task is still included, and the exclusion holds for `groupId` `null` and non-null occurrences alike.

## 5. Save slice and data portability

- [x] 5.1 Add `TasksSaveSliceV2Schema` in `src/modules/tasks/save/versions/v2.ts` exporting `{ version, tasks, series }`.
- [x] 5.2 Bump `tasksSaveSlice` to `currentVersion: 2`, extend `exportSlice` with `series`, and add `migrateFrom[1]` setting `series: []` and nulling the two task fields.
- [x] 5.3 Extend `parseTasksSlice` to reject duplicate occurrence identity and half-populated pairs, reusing `detectDuplicateId` for task ids.
- [x] 5.4 Extend the existing `postPrepare` to repair dangling `groupId` on series the same way it repairs tasks, emitting one warning per repaired series.
- [x] 5.5 Extend `applyImport` to write both `tasks` and `series` in one `setState`.
- [x] 5.6 Add pipeline tests: v2 export shape, v1 import migrating to v2 with unchanged task fields, v2 round trip preserving `skipDates`, invalid `weekdays` rejecting the import, malformed `skipDates` rejecting the import, duplicate occurrence identity rejecting the import, and series group repair emitting a warning.
- [x] 5.7 Confirm `src/modules/data-portability/registry.ts` needs no change and add no entry there.

## 6. Generation trigger

- [x] 6.1 Add a hook in `src/app/App.tsx` that recomputes the effective planner date via `getPlannerDate(new Date(), dayStartMinutes)` and calls `ensureOccurrences` with the current `weekStartDay`.
- [x] 6.2 Fire that hook on mount, on `visibilitychange` to visible, on window `focus`, on a bounded interval, and whenever `dayStartMinutes` or `weekStartDay` changes; clean up every listener and the interval on unmount.
- [x] 6.3 Add a component test that advancing the mocked clock past the day boundary and firing the interval produces today's occurrences without a reload.

## 7. Settings panel

- [x] 7.1 Add `RecurringSettingsPanel` under `src/modules/tasks/components/` listing series with title, weekday toggles ordered from `weekStartDay`, group select, pomodoro estimate, active toggle, reorder, and delete.
- [x] 7.2 Implement create and inline rename through `addSeries` / `updateSeries`, with the 1-280 bound enforced on submit.
- [x] 7.3 Implement delete with a confirmation that surfaces how many occurrences will be removed.
- [x] 7.4 Mount the panel in `SettingsDrawer` under a `Recurring` section heading, imported through the tasks barrel.
- [x] 7.5 Panel tests: create a series, rename it, toggle weekdays, deactivate, reorder, delete with confirmation, and confirm weekday toggles render from `weekStartDay` while storing absolute day numbers.

## 8. Task row

- [x] 8.1 Render a `Repeat` marker on rows whose `seriesId` is set, without altering any existing row affordance.
- [x] 8.2 Replace the one-step delete on an occurrence with a choice between skipping the occurrence and deleting the whole series, using the existing alert-dialog primitive.
- [x] 8.3 Extend the coarse-pointer action sheet so an occurrence's delete action opens that choice rather than deleting immediately.
- [x] 8.4 Row tests: the marker appears only on occurrences, skipping writes `skipDates` and removes the row, deleting the series from the row removes every occurrence of it, and all ordinary-row behaviour is unchanged.

## 9. Housekeeping and verification

- [x] 9.1 Delete `openspec/changes/add-daily-routines/` now that this change supersedes it.
- [x] 9.2 Run `npm run format`.
- [x] 9.3 Run `npm run typecheck`.
- [x] 9.4 Run `npm run lint`.
- [x] 9.5 Run `npm run test`.
- [x] 9.6 Manually verify a tab left open across the day boundary generates the new day's occurrences without a reload.
- [ ] 9.7 Manually verify export, reimport into a cleared store, and Google Drive backup and restore preserve series and occurrences.

Verification notes: browser rollover and local export/reimport passed with one daily series and seven occurrences. Live Google Drive backup/restore remains unverified because the isolated browser has no connected Google account. Automated save-pipeline tests cover series, occurrences, skip dates, and v1 migration.

Archive decision: the user approved syncing and archiving with task 9.7 still open. This is a verification gap, not a known backup/restore failure.
