# Tasks

## 1. Storage layer

- [ ] 1.1 Add `storage/db.ts`: open the `daybox` database at version 1 with `historyEvents` (keyPath `id`, index `at`) and `historyMeta` (keyPath `key`); a reset hook for tests
- [ ] 1.2 Add `storage/repository.ts`: append one event, load all events with per-record validation, replace everything, read and write the tracking start; verify with repository tests
- [ ] 1.3 Add `storage/legacy.ts`: migrate a valid `daybox-history` blob, remove the key after a successful write, drop an invalid blob with one warning; verify with migration tests including a repeated run

## 2. Store

- [ ] 2.1 Drop zustand `persist`; load stored history once at startup and merge events recorded before the load finished, deduplicated by id; verify with store tests
- [ ] 2.2 `recordEvent` appends to memory and writes exactly one stored record without blocking; a failed write warns once; verify with store tests
- [ ] 2.3 Store the tracking start on the first load that finds none; verify that a later load keeps it and that dropped records do not move it
- [ ] 2.4 Ignore late-arriving stored events when a data import already replaced the history; verify with a store test

## 3. Save slice and call sites

- [ ] 3.1 Export the slice from the loaded in-memory history and make commit replace memory first, storage second; verify with slice tests and the portability pipeline tests
- [ ] 3.2 Await `ensureHistoryLoaded()` in the settings export path and in the Google Drive backup path
- [ ] 3.3 Add `fake-indexeddb` to the test setup together with a per-test reset helper

## 4. Integration checks

- [ ] 4.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test`; all pass
- [ ] 4.2 Verify in a real browser: a legacy blob migrates and the key disappears, events survive a reload, localStorage holds only five keys, the export contains the history slice, and an import replaces it

## Workflow follow-up

- Sync delta specs to main specs.
- Archive the change.
- Push and open a pull request.
