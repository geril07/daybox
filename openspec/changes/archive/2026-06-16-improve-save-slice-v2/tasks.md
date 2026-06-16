## 1. Shared Infrastructure

- [x] 1.1 Add `map.ts` — empty `SaveSliceMap` interface in `src/shared/save-slice/map.ts` with barrel re-export from `src/shared/save-slice/index.ts`.
- [x] 1.2 Update `save-slice.ts` — rewrite the `SaveSlice` contract to v2: add `validateExport?`, `postPrepare?`, `migrateFrom?` fields; constrain `TCurrent extends { version: number }`; rename `SaveSlicePrepareResult` to `PrepareResult`; change `missing.getDefault` to `missing.defaultValue`; add `SliceMigration` type; add optional `TSlices` parameter defaulting to `SaveSliceMap` for `postPrepare.allSlices`.
- [x] 1.3 Create `src/shared/utils/save-helpers/` — implement `parseSliceInput<T>(sliceName, schema, input): PrepareResult<T>` and `detectDuplicateId<T>(items, getId, label, sliceName): string | null`. Add barrel `index.ts`. Add `save-helpers.test.ts` covering zod success, zod failure formatting, and duplicate-id detection.
- [x] 1.4 Run `npm run typecheck` to confirm shared layer compiles cleanly (no feature imports leaked).

## 2. Data-Portability Pipeline

- [x] 2.1 Update `registry.ts` — add `declare module '@/shared/save-slice/map'` block augmenting `SaveSliceMap` with `groups`, `tasks`, `timerSettings`, `planner` typed as each slice's `TCurrent`. Export a `knownSliceNames` set for envelope key validation. Remove the now-redundant `SaveSliceExportSlice` type (the `SaveSliceMap` interface subsumes it).
- [x] 2.2 Update `envelope.ts` — change `parseSaveEnvelope` return type to `PrepareResult<SaveEnvelope>` (replace custom `ParseEnvelopeResult`). Report structured zod errors with path+message instead of opaque `"Not a DayBox export file."`. After zod validation, manually loop over `Object.keys(envelope.slices)` and reject keys not in `knownSliceNames` from the registry with a clear message.
- [x] 2.3 Update `build.ts` — wrap `exportSlice` call: after calling `slice.exportSlice()`, if `slice.validateExport` exists, call it; on failure, return `{ ok: false, reason }` from `buildSnapshot`. After assembling envelope, `SaveEnvelopeSchema.safeParse(snapshot)` — abort on failure. Change return type from `CurrentSnapshot` to `PrepareResult<CurrentSnapshot>`.
- [x] 2.4 Update `import.ts` — implement `prepareSlice()` function that walks `migrateFrom` chain; insert migration stage before `prepareImport` in `prepareSlices()`. Add postPrepare loop after all slices prepare, calling each slice's `postPrepare(current, allSlices)` if present. Remove `MissingSliceStrategy` switch (now handled by `defaultValue`). Wrap `commitSnapshotImport` loop in try/catch returning `{ ok, committed: string[] }` on failure. Update `parseSaveEnvelope` consumer to use `PrepareResult` shape.
- [x] 2.5 Delete `normalize.ts` and remove its export from the data-portability barrel (`index.ts`). Remove its import in `import.ts`.
- [x] 2.6 Update `SettingsDrawer.tsx` — unwrap `PrepareResult` from `buildSnapshot()`: call `const result = buildSnapshot()`, check `result.ok`, show error on failure, stringify `result.value` on success.
- [x] 2.7 Update `google-drive/store.ts` `backup()` — unwrap `PrepareResult` from `buildSnapshot()`. On failure, reject or return early.
- [x] 2.8 Run `npm run typecheck`.

## 3. Feature Slices — Shared Helper Adoption

- [x] 3.1 Update `groups/save/slice.ts` — replace manual zod `safeParse` + error formatting with `parseSliceInput`. Replace manual duplicate-id detection with `detectDuplicateId`. Change `missing` from `{ kind: 'required' }` to `{ kind: 'required' }` (unchanged behavior, just contract changes). Add `validateExport` using `parseSliceInput` with the groups save schema. Keep `currentVersion: 1`.
- [x] 3.2 Update `tasks/save/slice.ts` — same shared-helper adoption as groups. Add `postPrepare` that repairs dangling `groupId` references (moved from deleted `normalize.ts`). Add `validateExport`. Keep `currentVersion: 1`.
- [x] 3.3 Update `timer/save/timer-settings-slice.ts` — replace manual zod error formatting with `parseSliceInput`. Change `missing.getDefault: () => (...)` to `missing.defaultValue: { version: 1, settings: DEFAULT_TIMER_SETTINGS }`. Add `validateExport`. Keep `currentVersion: 1`.
- [x] 3.4 Update `planner/save/slice.ts` — replace manual zod error formatting with `parseSliceInput`. Change `missing.getDefault: () => (...)` to `missing.defaultValue: { version: 1, weekStartDay: 1, browseDate: null }`. Add `validateExport`. Keep `currentVersion: 1`.
- [x] 3.5 Run `npm run typecheck` and fix any type errors (slices now implement the v2 contract).

## 4. Tests

- [x] 4.1 Add `save-helpers.test.ts` — covered in task 1.3 (shared helpers created with tests).
- [x] 4.2 Update `pipeline.test.ts` — unwrap `buildSnapshot()` calls to access `.value`. Add test cases for: export validation failure (slice with `validateExport` that rejects), export-time envelope schema validation failure, migration chain walk (synthetic slice with `migrateFrom`), postPrepare repair (tasks dangling groupId via `postPrepare`), commit error handling (slice `applyImport` throws, check `committed` list), missing-slice default via `defaultValue`. Add test cases for envelope parsing: structured zod errors (path+message), unknown slice key rejection, standardized `PrepareResult` shape (`value` not `envelope`).
- [x] 4.3 Update `google-drive/store.test.ts` — unwrap `buildSnapshot()` calls to access `.value`.
- [x] 4.4 Update individual slice tests — verify `prepareImport` still works with shared helpers, verify `postPrepare` on tasks slice repairs group references, verify `missing.defaultValue` works for timer and planner.
- [x] 4.5 Update `SettingsDrawer` test or integration — confirm build snapshot calls `validateExport` (success path) and handles failure (aborts export).
- [x] 4.6 Run `npm run test` and fix any failures.

## 5. Verification

- [x] 5.1 Run `npm run format`.
- [x] 5.2 Run `npm run typecheck`.
- [x] 5.3 Run `npm run lint`.
- [x] 5.4 Run `npm run test`.
- [ ] 5.5 Manual smoke test: export current data → import it back → verify tasks, groups, timer settings, and planner preferences are restored correctly.
- [ ] 5.6 Manual smoke test: export current data → delete localStorage → import → verify all state is back.
