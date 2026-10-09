## Context

DayBox models one thing: a `Task` with a `date`. Everything else in the app is built on that — `selectForDate`, `selectInRange`, `selectOverdue`, `selectUndated` filter by date; `sortOrder` is unique per date bucket; the Pomodoro timer binds to `task.id`; the group lens filters `task.groupId`. The date is the primary axis of the whole product.

The user wants four activities to appear every day without retyping them, one of which (work) is weekday-only. Two previous attempts each broke that axis:

- `add-daily-routines` (unimplemented, 0/29 tasks) introduced a `Routine` with nested `steps`, a second store, and a dedicated Today section. It explicitly scoped out weekday schedules and pomodoros, so it could not express two of the four cases.
- `feat/add-daily-tasks` (implemented on a branch, never merged) introduced `DailyTask` templates with virtual occurrences in `stateByDate`, a 225-line `DailyTaskRow`, and retyped `useTimerStore.focusedTaskId` into a `focusedTarget` discriminated union. The diff is ~2900 lines, roughly a third of which exists only so that a daily item is not a task.

Both fail the same test: the routine becomes a second, weaker kind of task that cannot be grouped, ordered, focused, or rescheduled with the rest of the day.

Constraints that shape this change:

- The store is `persist`-backed zustand per feature, validated on rehydrate through `createValidatedRehydrate`.
- `localStorage` is the only store. A recurring feature that materializes rows grows that store linearly in days.
- The app is a browser tab. Nothing fires at midnight.
- `openspec/specs/time-views/spec.md` currently states the app is _not required_ to react to the day boundary being crossed while the page stays open. That clause is the normal case for a Pomodoro user, so this change must override it.
- `Series` is user input. It needs schema-level bounds and a `DEFAULT_GROUP_ID` fallback like `Group.name` and `Task.title` already have.

## Goals / Non-Goals

**Goals:**

- Four recurring activities exist without daily retyping, including one that is weekday-only.
- A generated occurrence is an ordinary `Task`. No new row component, no separate section, no timer change.
- A missed routine never appears as overdue and never creates guilt backlog.
- Rescheduling a generated task does not cause the generator to recreate the original occurrence.
- The series survives reload, export/import, and Google Drive backup through the existing slice pipeline.
- The planner-day rollover is detected while the page stays open.

**Non-Goals:**

- No streaks, habit counters, or "N times per day" amounts.
- No natural-language parse syntax (`every mon-fri`) in the quick-add row. Series are created in Settings.
- No `Routine`, `Habit`, or `DailyTask` entity. No new store key.
- No backfill of missed days. Days the app was not open stay empty.
- No two-way sync from an edited occurrence back to its series. The occurrence is the user's data; the series is the template.
- No monthly, yearly, or interval-based rules. `weekdays: number[]` is the whole grammar.
- No "apply change to whole series" convenience action on an edited occurrence.
- No separate Today section for recurring content, and no sidebar capability for series management.

## Decisions

### Recurrence is a template that produces ordinary tasks

A `Series` is a rule. On each generation pass the system writes an ordinary `Task` carrying `seriesId` and `occurrenceDate`. After the write, nothing about the task is special: it is filtered by date like any other, drag-sorted inside its bucket, focused by the timer, and completed.

The alternative — a separate entity with its own row component — was implemented and abandoned in `feat/add-daily-tasks`. The measured cost of that route is a second row component, a second list, a second drag context, and a retyped timer focus contract, in exchange for nothing a normal task cannot already do. This design accepts that cost only if a requirement appears that a task cannot satisfy, such as a per-day amount or a streak.

### Two fields, not one: `occurrenceDate` and `date`

`occurrenceDate` answers "which recurrence produced this task" and is the deduplication key. `date` answers "where does this task currently live" and remains the only field every existing query reads.

If deduplication used `(seriesId, date)`, rescheduling Monday's occurrence to Tuesday would leave Monday without a matching task, and the generator would recreate it. With `(seriesId, occurrenceDate)` the moved task still satisfies Monday's slot, so nothing is recreated. Under a today-only horizon this bug is latent rather than active, but it fires the moment the horizon is widened, and adopting the field later means migrating every existing row. The cost of adding it now is one nullable field; the cost of adding it later is a data migration.

### Dedup key is `(seriesId, occurrenceDate)`

Stated explicitly because the pair, not the single field, is the invariant. `(seriesId, null)` is not a valid key: an ordinary task must carry both fields or neither. The schema enforces this with a refinement so an inconsistent pair cannot be persisted or imported.

### Horizon is the effective planner date through the end of the configured week

Generation covers every date `d` such that `today <= d <= lastDayOfWeek`, where `today` is the effective planner date from `dayStartMinutes` and `lastDayOfWeek` respects `weekStartDay`.

Generating only `today` was the cheaper option and was rejected. `time-views` defines Tomorrow as "a staging area for the next day... lets you pre-load tomorrow before you end today". A today-only horizon makes that view permanently empty of routines, which reads as a regression rather than a design choice. The week horizon costs a loop bound instead of a single iteration and has a second benefit: the week view shows the routine already laid out, which is the planning the app exists for. The expensive machinery — the window, skip handling, occurrence-keyed dedup — is identical in both designs, so the "simpler v1, richer v2" split cuts the cost line in the wrong place.

Dates beyond the horizon are rejected on creation: a series occurrence never carries `date > lastDayOfWeek`, so the `Later` view stays sparse and the store does not accumulate far-future rows.

### Rollover is detected, not waited for

The planner's effective date is computed inside `useMemo` over `[tasks, view, weekStartDay, dayStartMinutes]`. Nothing re-renders when wall-clock time crosses `dayStartMinutes`. A tab left open across midnight would keep showing yesterday's Today and yesterday's occurrences until a manual reload.

Generation therefore runs from an explicit trigger in `src/app/App.tsx`, which is the only file allowed to orchestrate across features: on mount, on `visibilitychange` to visible, on window `focus`, on a bounded interval, and whenever `dayStartMinutes` changes. Each run recomputes the effective date and calls `ensureOccurrences`. The interval is a backstop for a tab that stays focused all night, not the primary path.

This modifies `time-views`, which currently permits the stale behaviour. The clause existed when no feature depended on the date changing under the user.

### Series live in the tasks store

`TaskState` becomes `{ tasks, series }` under the unchanged `daybox-tasks` key. One domain, one store, one save slice.

The alternative is a `src/modules/series/` folder with its own store and its own registry entry. That was measured in `feat/add-daily-tasks`: a new barrel, a new registry entry, and ~112 extra lines of `pipeline.test.ts`. Storage layout is not the user-facing model, and splitting one concept across two stores buys nothing the single store cannot express. The cost is a schema change plus a slice migration, both of which this codebase already has machinery for.

### The tasks save slice moves to version 2 with a migration

The envelope stays at `envelopeVersion: 1`. Only the slice version moves: `migrateFrom[1]` adds `series: []` and normalizes pre-existing tasks to `seriesId: null, occurrenceDate: null`. A v1 export therefore imports cleanly into an app with no series, and a v1 export importing into a v2 app does not lose the user's existing tasks.

Rehydrate uses the same additive fixup as `planner/store.ts` already does for `dayStartMinutes`: `afterValidate` fills the two nullable fields, then `compactAllBuckets` runs unchanged. No persisted data is rewritten by a schema bump alone.

### Generated tasks are never overdue

`selectOverdue` gains `&& t.seriesId === null`.

A routine is not a deadline. Without this rule, one skipped workout accumulates one overdue row per day and the Overdue section — which currently means "one-off work you owe someone" — becomes a guilt list. With it, a missed routine stays in its own past date as history and is visible through the Date Browser, where it belongs.

### Skips are recorded as dates on the series

Deleting a generated task appends its `occurrenceDate` to `series.skipDates`. Generation checks that list before writing.

`skipDates` is preferred over a `lastGeneratedDate` cursor because a cursor cannot express "skip Wednesday" — the cursor would have to advance past Wednesday and take Thursday and Friday with it. `skipDates` also survives a widened horizon unchanged, and it is readable: the user can see which days are skipped.

The side effect is that deleting a row writes to the series. The delete affordance therefore offers two explicit choices — skip this occurrence, or delete the whole series — rather than hiding the write behind a trash icon.

### Series edits affect future occurrences only

Editing a series rewrites the template. Already-generated tasks keep the title, group, and estimate they were created with.

Bidirectional sync was rejected. It requires deciding what a later series edit does to a completed occurrence, and whether an occurrence edit propagates backwards or forwards, and every answer either surprises the user or adds a conflict rule. One-way is predictable and matches the fact that the occurrence is the real record of the day.

The visible consequence is that renaming an occurrence does not change tomorrow's title. This is stated as a requirement rather than left as a surprise.

### Pinned estimates occupy the upper sort-order range

A generated task's `sortOrder` is assigned from a reserved upper band `[PINNED_BASE, ∞)`, where `PINNED_BASE = 1_000_000`, then normalised by the existing `compactBucket` so the visible list still reads `0..N-1`.

Putting routines at the bottom would bury them under whatever the user happens to be working on, which is the opposite of what a routine is for. Putting them at the top fights the existing drag-sort behaviour, where dropping a task at index 0 must land at `sortOrder = 0` — a fixed position cannot be expressed in that model. Reserving the upper band and letting the existing compaction fold it back to a dense sequence gets both: routines sort last, drag-sort still produces `0..N-1`, and no new reorder logic is introduced.

Without compaction the visible order would still be correct but `sortOrder` values would no longer be dense, and `compactBucket` is the one place in the codebase already responsible for density.

### Missing days are not backfilled, and the user can see the difference

If the app was closed for three days, generation writes only from the effective planner date forward. Those three dates stay empty in the Date Browser.

This is intentional: backfilling would write three days of unchecked rows and manufacture exactly the guilt backlog that the overdue exclusion avoids. The cost is that an empty past date is ambiguous — it may mean "no routines existed" or "the app was closed". The mitigation is that `skipDates` is persisted data: the user can see and edit skipped days, so the interpretation is recoverable without a `lastGeneratedDate` field.

## Risks / Trade-offs

- [Risk] The store grows linearly with time: roughly one row per series per day, about 350 KB per series per year of task data. → Mitigation: rows are ordinary tasks with no extra payload beyond the two nullable fields, which localStorage absorbs for years. If it ever becomes a problem, pruning completed generated rows older than a retention window is a local change to `afterValidate` and does not alter the model.

- [Risk] A tab open across the day boundary relies on the interval or focus event; a suspended laptop that never fires either shows stale occurrences until it wakes and refocuses. → Mitigation: the effective date is recomputed on every trigger, so the first event after wake corrects the view. The failure is limited to a tab nobody is looking at.

- [Risk] `ensureOccurrences` runs inside a store action and is triggered from the app shell, so the trigger is not unit-testable in isolation. → Mitigation: the generation logic is a pure function over `(series, existingTasks, horizon)` with no store access, so the tests cover it directly and only the thin wrapper needs a component test.

- [Risk] Deleting a generated task writes to the series, which is a side effect the user did not ask for and could not discover. → Mitigation: the delete affordance requires an explicit choice between skipping the occurrence and deleting the series. A plain one-click delete is not offered for generated rows.

- Group deletion resolves both tasks and series. Moving to default reassigns both templates and tasks. Deleting tasks also deletes that group's series and every occurrence of those series, including occurrences moved to another group. This prevents generation from recreating deleted tasks or referencing a deleted group. Import repair remains a separate safeguard.

- [Risk] Two overlapping series with the same title on the same day produce two visually identical rows. → Mitigation: accepted. Each series is independently managed, and collapsing them would require a grouping concept this design deliberately avoids.

- [Trade-off] Recurrence granularity stops at weekdays. A monthly or fortnightly task cannot be expressed and must stay a manually created one-off. → Accepted: none of the reported cases need it, and a general interval rule is more grammar to maintain for no current use.

- [Trade-off] Series management lives in Settings, which means creating one is a multi-field form rather than a single typed line. → Accepted for this change. The `#group` quick-add suffix in `AddTaskRow` is the precedent for inline syntax if it becomes annoying.

## Migration Plan

1. Add the `v2` task schema and the `Series` schema; repoint `schema.ts` at them.
2. Add `series: []` to the tasks store state and the `afterValidate` fill for the two new task fields. Existing installs rehydrate without data loss and with `series` empty.
3. Ship the tasks save slice at version 2 with `migrateFrom[1]` returning `series: []` and the two fields null. Existing `daybox-export.json` files and Drive backups import unchanged.
4. Rollback is a revert of the release. No data written by v2 can be read by the v1 app: the extra `series` array and the two task fields are ignored by the v1 store schema. Series themselves are lost on rollback, which is acceptable because they are recreated from the recurring rows that remain visible in the past dates.

## Open Questions

None blocking. Two follow-ups are deliberately deferred and should only be pursued if the first use is unsatisfying:

- Inline recurrence syntax in the quick-add row (`работа every mon-fri`), parsed and stripped the way `#group` already is.
- A "apply to whole series" action on an edited occurrence, for when one-way sync becomes the annoyance rather than a non-issue.
