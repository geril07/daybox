## 1. Refactor the persistence helper

- [x] 1.1 In `src/shared/utils/persistence.ts`, rename the exported `createValidatedPersist` to `createValidatedRehydrate`. Change its return type to zustand's `OnRehydrateStorage<S>` (drop the `PersistOptions<S, U, R>` return type, drop the `Pick<PersistOptions, 'onRehydrateStorage' | 'partialize' | 'storage'>` input type, drop the second and third generic parameters).
- [x] 1.2 Switch the helper to a single options-object argument. Declare and export a `ValidatedRehydrateOptions<S>` interface with four fields: `name: string`, `schema: ZodSchemaLike`, `init: Partial<S>`, `afterValidate?: (state: S) => void`. The helper signature becomes `createValidatedRehydrate<S>(options: ValidatedRehydrateOptions<S>): OnRehydrateStorage<S>` — no positional parameters.
- [x] 1.3 Internally produce the curried `() => (state, error) => void` shape that zustand expects from the flat `afterValidate` field. The rehydration `error` is NOT surfaced to `afterValidate` — the helper bails on error before calling the hook (YAGNI; current consumers never observe the error). Keep the existing validation, single-`console.warn`, and `Object.assign(state, init)` reset logic.
- [x] 1.4 Remove the `storage ? { storage } : {}` defensive spread and its 3-line comment. Remove the `name` / `storage` / `partialize` proxy fields from the returned object. The returned value is now only a function.

## 2. Update the four baseline feature stores

- [x] 2.1 In `src/features/tasks/store.ts`, change the `persist(state, createValidatedPersist<TaskStore>(...))` call to `persist(state, { name: 'daybox-tasks', onRehydrateStorage: createValidatedRehydrate<TaskStore>({ name: 'daybox-tasks', schema: TaskStateSchema, init: taskInit }) })`. Update the import in the same file.
- [x] 2.2 In `src/features/groups/store.ts`, same shape: `persist(state, { name: 'daybox-groups', onRehydrateStorage: createValidatedRehydrate<GroupStore>({ name: 'daybox-groups', schema: GroupStateSchema, init: groupInit }) })`. Update the import.
- [x] 2.3 In `src/features/planner/store.ts`, same shape: `persist(state, { name: 'daybox-planner', onRehydrateStorage: createValidatedRehydrate<PlannerStore>({ name: 'daybox-planner', schema: PlannerStateSchema, init: plannerInit }) })`. Update the import.

## 3. Update the timer store (custom storage + user rehydrate hook)

- [x] 3.1 In `src/features/timer/store.ts`, change the `persist(state, createValidatedPersist<TimerStore>(...))` call to `persist(state, { name: 'daybox-timer', storage: createJSONStorage(() => timerStorage), onRehydrateStorage: createValidatedRehydrate<TimerStore>({ name: 'daybox-timer', schema: TimerStateSchema, init: timerInit, afterValidate: (state) => { /* wall-clock correction */ } }) })`. The wall-clock-correction body is unchanged, but the outer `() => (state) =>` curried shape collapses to a flat `afterValidate: (state) =>` field.
- [x] 3.2 Remove the now-unused `(state as TimerState | undefined)` cast inside the rehydrate hook (the helper's `S` generic is `TimerStore`, so the `state` parameter is correctly typed as `TimerStore | undefined` by the helper's own type, and `afterValidate`'s `(state: S) => void` parameter strips the `| undefined` for the hook's body).

## 4. Update the Google Drive store (fixes the partialize bug)

- [x] 4.1 In `src/features/google-drive/store.ts`, change the `persist(state, createValidatedPersist<GoogleDriveStore, PersistedSlice>(...))` call to `persist(state, { name: 'daybox-google-drive', partialize: (state) => ({ accessToken: state.accessToken, expiresAt: state.expiresAt, email: state.email, dayboxFileId: state.dayboxFileId, lastBackupAt: state.lastBackupAt }), onRehydrateStorage: createValidatedRehydrate<GoogleDriveStore>({ name: 'daybox-google-drive', schema: PersistedSliceSchema, init: googleDriveInit }) })`. Update the import.
- [x] 4.2 Verify that `partialize` is now present in the produced `PersistOptions` (TypeScript will catch a missing or mistyped field at the call site).

## 5. Verify the project

- [x] 5.1 Run `npm run typecheck`. All five call sites compile without `as any` or `@typescript-eslint/no-explicit-any` suppressions, and `tsc -b` exits clean.
- [x] 5.2 Run `npm run lint`. No new warnings or errors.
- [x] 5.3 Run `npm run test`. All five `store.test.ts` suites (`tasks`, `groups`, `planner`, `timer`, `google-drive`) pass with no edits to the test files.
- [x] 5.4 Run `npm run format`. No formatting diffs.
- [ ] 5.5 (Optional, manual) In a throwaway branch, deliberately mistype the `name` field on one store and confirm `tsc` reports a compile error, then revert. Confirms the "A misconfigured persist option fails to compile" scenario.

## 6. Archive the change

- [ ] 6.1 Run `/opsx-archive refactor-validated-persist-helper` to sync the two spec deltas (`data-persistence`, `architecture`) into the main specs and archive the change directory.
