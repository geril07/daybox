## 1. Rework the helper

- [x] 1.1 In `src/shared/utils/persistence.ts`, import `PersistOptions` (alongside `PersistStorage`) from `zustand/middleware`.
- [x] 1.2 Make `createValidatedPersist` generic over the full store type `S`: change the signature to `createValidatedPersist<S>(name, schema, init: Partial<S>, options?: ValidatedPersistOptions<S>): PersistOptions<S, S>`.
- [x] 1.3 Redefine `ValidatedPersistOptions<S>` to `{ storage?: PersistStorage<S>; onRehydrateStorage?: PersistOptions<S, S>['onRehydrateStorage'] }`.
- [x] 1.4 Type the rehydrate callback's `state` parameter as `S` (not `Record<string, unknown>`) and assign defaults via `Object.assign(state, init)` with `init: Partial<S>`; keep the once-only `console.warn` and the success-path delegation to the user's `onRehydrateStorage`.
- [x] 1.5 Remove the `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and the `TInit = any` default from the helper.
- [x] 1.6 Omit the `storage` key from the returned options when no storage is provided (`...(storage ? { storage } : {})`), so `storage: undefined` no longer clobbers zustand's localStorage default and disables persistence for `tasks`/`groups`/`planner`.

## 2. Update call sites

- [x] 2.1 `src/features/tasks/store.ts`: replace `createValidatedPersist('daybox-tasks', TaskStateSchema, taskInit) as any` and its eslint-disable with `createValidatedPersist<TaskStore>('daybox-tasks', TaskStateSchema, taskInit)`.
- [x] 2.2 `src/features/groups/store.ts`: replace the `as any` + eslint-disable with `createValidatedPersist<GroupStore>('daybox-groups', GroupStateSchema, groupInit)`.
- [x] 2.3 `src/features/planner/store.ts`: replace the `as any` + eslint-disable with `createValidatedPersist<PlannerStore>('daybox-planner', PlannerStateSchema, plannerInit)`.
- [x] 2.4 `src/features/timer/store.ts`: replace the `as any` + eslint-disable with `createValidatedPersist<TimerStore>('daybox-timer', TimerStateSchema, {...}, { storage, onRehydrateStorage })`, confirming the custom `storage` and rehydrate hook now type-check against `PersistOptions<TimerStore, TimerStore>`.

## 3. Verify

- [x] 3.1 Run `tsc` (typecheck) and confirm no errors and no remaining `as any` / `no-explicit-any` disables on the persist call sites.
- [x] 3.2 Run the four store test suites (`tasks`, `groups`, `planner`, `timer` `store.test.ts`) and confirm they pass unchanged.
- [x] 3.3 Run eslint and confirm no new warnings/errors.
- [ ] 3.4 Manually verify a store without explicit storage persists: create a task, confirm `localStorage.getItem('daybox-tasks')` is populated and the "given storage is currently unavailable" warning is gone. (Pending live confirmation in the running app.)
