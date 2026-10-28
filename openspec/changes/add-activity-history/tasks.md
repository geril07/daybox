# Tasks

## 1. History module

- [x] 1.1 Add `src/modules/history/schema/v1.ts`, `schema.ts`, and `types.ts` with the event discriminated union and state schema; verify with schema tests for each event type, unknown types, and offset bounds
- [x] 1.2 Add `src/modules/history/store.ts` (`useHistoryStore`, `recordEvent`, `daybox-history`, validated rehydrate) and the barrel; verify store tests for append order, filled `id`/`at`/`utcOffsetMinutes`, persistence round trip, and corrupt-blob reset
- [x] 1.3 Add the `history` save slice (`save/slice.ts`, `save/versions/v1.ts`) with duplicate-id validation and empty missing default; verify with slice tests

## 2. Task events

- [x] 2.1 Record `task.rescheduled` in `updateTask` only when `date` changes; verify with task store tests for changed, unchanged, and null dates
- [x] 2.2 Record `task.completed` / `task.uncompleted` in `toggleTask` with snapshots; verify with task store tests for complete, reopen, and complete again
- [x] 2.3 Record `task.deleted` in `deleteTask`, `deleteSeries`, and `deleteTasksByGroupId`, and nothing in `skipOccurrence`; verify with task store tests

## 3. Focus events

- [x] 3.1 Record `focus.ended` in `TimerBar` for natural completion (`completed`), Skip (`skipped`), and Restart/phase switch with elapsed focus time (`abandoned`); verify with TimerBar tests including no-task focus, break endings, and untouched intervals

## 4. Portability

- [x] 4.1 Register the `history` slice last in `saveSlices` and update pipeline fixtures; verify pipeline tests for export content, round trip, missing slice default, invalid event, and duplicate ids

## 5. Integration checks

- [x] 5.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test`; all pass
- [ ] 5.2 Verify in the running app (browser) that completing, rescheduling, deleting tasks, and finishing/skipping a focus interval write the expected events to `daybox-history`, and that export contains the `history` slice

## Workflow follow-up

- Sync delta specs to main specs.
- Archive the change.
- Open a pull request ready to merge.
