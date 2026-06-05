## 1. Dependency

- [x] 1.1 Install `zod` v4 (latest) as a runtime dependency. Run `npm install zod` and verify `package.json` reflects the new dep and `node_modules/zod/package.json` shows v4.

## 2. Schemas (schema-first source of truth)

- [x] 2.1 Create `src/features/tasks/schema.ts` exporting `TaskSchema` (zod) — fields: id (string, min 1), title (string, trim, min 1, max 280), groupId (string, min 1), date (string YYYY-MM-DD | null), pomoEstimate (int, 0..9), pomoCompleted (int, 0..9, ≤ estimate), sortOrder (number), completed (boolean), completedAt (ISO datetime | null), createdAt (ISO datetime).
- [x] 2.2 Create `src/features/groups/schema.ts` exporting `GroupSchema` — fields: id (string, min 1), name (string, trim, min 1, max 40), color (string), createdAt (ISO datetime).
- [x] 2.3 Create `src/features/timer/schema.ts` exporting `TimerSettingsSchema` and `TimerPhaseSchema` — settings match `TimerSettings` shape; phase is `z.enum(['focus', 'shortBreak', 'longBreak'])`. Add a `TimerStateSchema` for the full persisted state (phase, startedAt nullable number, elapsed number, sessionPomoCount int, isRunning boolean, focusedTaskId string|null, settings).
- [x] 2.4 Create `src/features/planner/schema.ts` exporting `PlannerStateSchema` — `weekStartDay` (0..6), `browseDate` (string YYYY-MM-DD | null).
- [x] 2.5 Create `src/app/theme.ts` re-export of `ThemeSchema` (z.enum of 'light' | 'dark'); replace the existing `getTheme`/coerce surface so it reads from a typed value (no behavior change).

## 3. Type refactor (types.ts becomes inferred)

- [x] 3.1 Refactor `src/features/tasks/types.ts` to `export type Task = z.infer<typeof TaskSchema>`.
- [x] 3.2 Refactor `src/features/groups/types.ts` to `export type Group = z.infer<typeof GroupSchema>`.
- [x] 3.3 Refactor `src/features/timer/types.ts` to re-export the inferred `TimerSettings` and `TimerPhase`. (Move the `TimerSettings` interface out of `store.ts`; the store imports it from `types.ts` via the schema.)
- [x] 3.4 Run `npm run typecheck` to confirm all consumers still compile after the inferred-type refactor.

## 4. Shared validation helpers

- [x] 4.1 Create `src/shared/lib/persistence.ts` exporting `createValidatedPersist(name, schema, init, options?)`. Implementation: wraps zustand `persist`; in `onRehydrateStorage`, runs `schema.safeParse(state)`. On failure, returns `init` and emits `console.warn` once (gated by a per-name `Set` to avoid repeat warns across HMR). Options accept an additional `validate` shape and a passthrough for existing `onRehydrateStorage` callers (timer store has its own elapsed-recompute hook).
- [x] 4.2 Create `src/shared/lib/import-validation.ts` exporting `safeParseAndRoute({ value, schema, layer, defaultValue? })` and a `Layer` union. The five layers map per the design table; the helper returns a discriminated result the caller pattern-matches on.

## 5. Store integration

- [x] 5.1 Update `src/features/tasks/store.ts` to use `createValidatedPersist('daybox-tasks', TaskStateSchema, init)`. The schema for the persisted slice is `z.object({ tasks: z.array(TaskSchema) })`. Add length-cap enforcement to `addTask` (trim + max 280, reject + warn on violation).
- [x] 5.2 Update `src/features/groups/store.ts` to use `createValidatedPersist('daybox-groups', z.object({ groups: z.array(GroupSchema), stickyGroupId: z.string().nullable() }), init)`. Add length-cap to `addGroup`/`renameGroup` (trim + max 40).
- [x] 5.3 Update `src/features/timer/store.ts` to use `createValidatedPersist('daybox-timer', TimerStateSchema, init)`. Preserve the existing elapsed-recompute logic in `onRehydrateStorage` (compose with validation). Add post-merge validation in `setTimerSettings` (validate the merged result, reject + warn on failure).
- [x] 5.4 Update `src/features/planner/store.ts` to use `createValidatedPersist('daybox-planner', PlannerStateSchema, init)`.

## 6. Import pipeline (parseImport rewrite)

- [x] 6.1 In `src/app/localStorage.ts`, define `ExportV2Schema` and `ExportV3Schema`. v3: `{ version: 3, exportedAt: string, tasks: TaskSchema[], groups: GroupSchema[], timer: TimerSettingsSchema, planner: PlannerStateSchema, theme: ThemeSchema }`. v2: `{ version: 2, exportedAt?: string, tasks: TaskSchema[], groups: GroupSchema[], settings?: { timer?: TimerSettingsSchema, theme?: ThemeSchema, weekStartDay?: z.number() } , appStore?: ... }`.
- [x] 6.2 Rewrite `parseImport` to: (a) `JSON.parse` inside try/catch (existing); (b) envelope-check via `safeParseAndRoute({ layer: 'envelope' })` with a wrapper that picks V2 or V3 schema based on `version`; (c) per-record parse for `tasks` and `groups` via `safeParseAndRoute({ layer: 'record' })`, dropping invalid rows and pushing reasons to `warnings`; (d) cross-reference check on `tasks[].groupId` against the parsed `groups[].id`, reassigning to `default` and warning on misses; (e) coerce `theme` via `safeParseAndRoute({ layer: 'optional' })`; (f) preserve the existing "no valid data" hard-fail when both arrays are empty after validation.
- [x] 6.3 Keep `ImportResult` shape unchanged: `{ success, data?, error?, warnings? }`. The `data` payload continues to be `{ tasks, groups, timer, planner, theme }`. `applyImport` is unchanged.
- [x] 6.4 Update `src/app/localStorage.test.ts` to assert: (a) malformed task is dropped and named in `warnings`; (b) dangling `groupId` is reassigned with a warning; (c) `theme: 'sepia'` coerces to `'light'` silently; (d) envelope failure returns `{ success: false, error: ... }` and includes the new wording; (e) all previously passing cases still pass.

## 7. Legacy migrations

- [x] 7.1 Create `migrateLegacyAppStore()` and `migrateLegacySettings()` pure functions in `src/app/localStorage.ts`. Each: reads its key, runs a zod schema (`LegacyAppStoreSchema`, `LegacySettingsSchema`) on the parsed JSON, on success calls the relevant store actions, on failure logs `console.warn`. Always removes the legacy key, even on failure.
- [x] 7.2 Replace the two `useEffect` blocks in `src/app/App.tsx` with calls to the new pure functions, gated by the existing `useRef` flags.
- [x] 7.3 Add a unit test for each migration: valid shape migrates correctly; invalid shape logs (mock `console.warn`) and removes the key.

## 8. Verification

- [x] 8.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, `npm run test`. All green.
- [ ] 8.2 Manual smoke: import a v3 export, an old v2 export, a hand-edited export with a missing task id, a corrupt JSON blob. Confirm warnings show up correctly and the app doesn't crash.
- [ ] 8.3 Manual smoke: open DevTools, corrupt a `daybox-tasks` blob in localStorage, reload. Confirm tasks reset to empty and a warn appears in the console.
- [x] 8.4 Re-run the full test suite with `npx vitest run` (non-watch) for the final pass.
