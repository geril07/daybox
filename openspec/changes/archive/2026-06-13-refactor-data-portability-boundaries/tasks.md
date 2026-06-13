## 1. Shared Save-Slice Contract

- [x] 1.1 Add `src/shared/save-slice/` with a barrel and implementation file exporting `SaveSlicePrepareResult`, `MissingSliceStrategy`, and `SaveSlice`.
- [x] 1.2 Update feature save adapters and data-portability registry/types to import generic save-slice contracts from `@/shared/save-slice`.
- [x] 1.3 Remove save-slice contract exports from `src/modules/data-portability/index.ts` and delete `src/modules/data-portability/types.ts` when no imports remain.

## 2. Feature-Owned Slice Preparation

- [x] 2.1 Move default-group restoration and its warning into `groupsSaveSlice.prepareImport` without exposing group-domain defaults through shared.
- [x] 2.2 Move duplicate group id and duplicate default-group validation into `groupsSaveSlice.prepareImport`, preserving existing error wording where tests assert it.
- [x] 2.3 Move duplicate task id validation into `tasksSaveSlice.prepareImport`, preserving existing error wording where tests assert it.
- [x] 2.4 Confirm timer settings and planner save slices continue to own their missing-slice defaults and current slice parsing.

## 3. Data-Portability Boundary Cleanup

- [x] 3.1 Narrow `normalizeCrossSliceInvariants` so it only handles cross-slice task-to-group repair and no longer constructs group-domain values.
- [x] 3.2 Remove direct imports from data-portability into feature save version internals, using registry-derived typing or public feature barrel exports instead.
- [x] 3.3 Remove or consolidate duplicate/unused parsing helpers and rename misleading schema/type surfaces if needed.
- [x] 3.4 Keep `buildSnapshot`, `prepareSnapshotImport`, and `commitSnapshotImport` behavior and public imports stable for app and Google Drive callers.

## 4. Tests And Verification

- [x] 4.1 Update `pipeline.test.ts` to verify missing default group repair still succeeds and that store mutation still only happens during commit.
- [x] 4.2 Add or adjust tests proving duplicate task ids and duplicate group ids are rejected by feature slice preparation.
- [x] 4.3 Search for forbidden imports from `@/modules/data-portability/types` or save-slice contracts through `@/modules/data-portability` and remove all occurrences.
- [x] 4.4 Run `npm run format`.
- [x] 4.5 Run `npm run typecheck`.
- [x] 4.6 Run `npm run lint`.
- [x] 4.7 Run `npm run test`.
