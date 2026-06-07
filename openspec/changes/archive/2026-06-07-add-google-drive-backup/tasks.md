## 1. Spec foundation

- [x] 1.1 Apply the architecture spec delta from `specs/architecture/spec.md` (layered rule + softened six-file shape + updated cross-cutting allowlist) — no code, run via `/opsx-sync` after the change is approved

## 2. Add the Slice interface and download helper

- [x] 2.1 Create `src/shared/utils/slice.ts` exporting the `Slice<T>` interface: `{ name: string, schema: ZodType<T>, export: () => T, apply: (data: T) => void }`. Import `z.ZodType` from `zod`. No other imports.
- [x] 2.2 Create `src/shared/utils/download.ts` exporting `downloadAsFile(content: string, filename: string): void`. Implement with `Blob` + `URL.createObjectURL` + temporary `<a download>` + `URL.revokeObjectURL`. No other imports.
- [x] 2.3 Add a co-located test file for `downloadAsFile` that mocks `URL.createObjectURL`, `document.createElement('a')`, and `a.click`. Verify the Blob is constructed with the right MIME type and the filename is set.

## 3. Add a slice to each participating feature

- [x] 3.1 Create `src/features/tasks/slice.ts` exporting `tasksSlice: Slice<Task[]>`: `name: 'tasks'`, `schema: z.array(TaskSchema)`, `export: () => useTaskStore.getState().tasks`, `apply: (tasks) => useTaskStore.setState({ tasks })`. Use relative imports within the feature (`../../shared/utils/slice` is forbidden because that would cross out of the feature — instead, the slice's `ZodType` reference is the local one and the consumer imports the slice interface via the data-portability barrel at use time).
- [x] 3.2 Re-export `tasksSlice` from `src/features/tasks/index.ts`.
- [x] 3.3 Create `src/features/groups/slice.ts` exporting `groupsSlice: Slice<Group[]>`: same pattern as tasks, with `name: 'groups'`.
- [x] 3.4 Re-export `groupsSlice` from `src/features/groups/index.ts`.
- [x] 3.5 Create `src/features/timer/slice.ts` exporting `timerSlice: Slice<TimerSettings>`: `name: 'timer'`, schema `TimerSettingsSchema`, `export: () => useTimerStore.getState().settings`, `apply: (settings) => useTimerStore.getState().setTimerSettings(settings)`. (Only the settings slice is exported, not the runtime state — matches today's behaviour.)
- [x] 3.6 Re-export `timerSlice` from `src/features/timer/index.ts`.
- [x] 3.7 Create `src/features/planner/slice.ts` exporting `plannerSlice: Slice<{ weekStartDay: WeekStartDay, browseDate: string | null }>`: `name: 'planner'`, schema `PlannerStateSchema`, `export: () => ({ weekStartDay: usePlannerStore.getState().weekStartDay, browseDate: usePlannerStore.getState().browseDate })`, `apply: ({ weekStartDay, browseDate }) => { usePlannerStore.getState().setWeekStartDay(weekStartDay); usePlannerStore.getState().setBrowseDate(browseDate) }`.
- [x] 3.8 Re-export `plannerSlice` from `src/features/planner/index.ts`.

## 4. Build the data-portability feature

- [x] 4.1 Create `src/features/data-portability/envelope.ts` with the v3 envelope zod schema: `version: literal(3)`, `exportedAt: string`, and one `z.unknown()` field per registered slice (initially `tasks`, `groups`, `timer`, `planner`). Theme is intentionally absent from the required fields. The schema may still accept an incoming `theme` field silently (backward compat with files exported by an earlier version) — if so, define a `looseEnvelopeV3Schema` that allows extra fields and use it for parse.
- [x] 4.2 Create `src/features/data-portability/migrations.ts` with `migrateV2ToV3(v2: unknown): unknown`. Handle the v2 shape: `version: 2`, `exportedAt?`, `tasks: unknown[]`, `groups: unknown[]`, `settings?: { timer?, weekStartDay?, theme? }`. Output a v3 envelope: `version: 3`, `exportedAt: <now if missing>`, `tasks`, `groups`, `timer: settings.timer`, `planner: { weekStartDay: settings.weekStartDay ?? 1, browseDate: null }`. Do NOT include `theme` in the output.
- [x] 4.3 Create `src/features/data-portability/registry.ts` importing `tasksSlice` from `@/features/tasks`, `groupsSlice` from `@/features/groups`, `timerSlice` from `@/features/timer`, `plannerSlice` from `@/features/planner`. Export `slices: Slice[]` as the canonical ordered array.
- [x] 4.4 Create `src/features/data-portability/build.ts` with `buildSnapshot(): Record<string, unknown>`. Iterate `slices`, call each `slice.export()`, and assemble the object with `version: 3` and `exportedAt: new Date().toISOString()`. Return the object (not a string).
- [x] 4.5 Create `src/features/data-portability/validate.ts` with `validateSnapshot(json: string): ParseResult` and the `ParseResult` type. Steps: try `JSON.parse`; check `version`; if `version === 2`, run `migrateV2ToV3`; run the v3 envelope schema; return `{ ok: true, data }` or `{ ok: false, reason }`.
- [x] 4.6 Create `src/features/data-portability/apply.ts` with `applySnapshot(data: unknown): ApplyResult` and the `ApplyResult` type. Steps: iterate `slices`; for each, read `data[slice.name]`, run `slice.schema.safeParse`, on success call `slice.apply(result.data)`, on failure push a warning naming the slice and reason; after all slices, run the cross-reference check (every task's `groupId` references an existing group; if not, reassign to the default group and warn). Return `{ ok: true, warnings? }`.
- [x] 4.7 Create `src/features/data-portability/index.ts` re-exporting `buildSnapshot`, `validateSnapshot`, `applySnapshot`, `downloadAsFile`, the `ParseResult` and `ApplyResult` types, and the `slices` array (for tests and tooling).
- [x] 4.8 Create `src/features/data-portability/envelope.test.ts` covering: v3 envelope round-trip via build/validate/apply, v2 envelope migrated to v3, malformed JSON rejected, missing version rejected, missing required field rejected, theme field silently ignored on input.
- [x] 4.9 Create `src/features/data-portability/apply.test.ts` covering: clean apply with no warnings, dropped slice field generates a warning, dangling groupId is reassigned to default group with a warning, all slices' apply called in registry order.

## 5. Trim bootstrap.ts and update SettingsDrawer

- [x] 5.1 Remove `exportData`, `parseImport`, `applyImport`, `downloadExport`, the `ExportV2Schema` and `ExportV3Schema` envelope schemas, and the `ExportData` / `ImportPayload` / `ImportResult` types from `src/app/bootstrap.ts`. Keep `migrateLegacyAppStore`, `migrateLegacySettings`, and their `LegacyAppStoreSchema` / `LegacySettingsSchema`.
- [x] 5.2 Update `src/app/shell/SettingsDrawer.tsx` to import `buildSnapshot`, `validateSnapshot`, `applySnapshot`, `downloadAsFile` from `@/features/data-portability`. Replace the file-based Export with `downloadAsFile(JSON.stringify(buildSnapshot()), 'daybox-export.json')`. Replace the file-based Import with `JSON.parse(text)` → `validateSnapshot` → on success `applySnapshot` with the same AlertDialog confirmation flow. Behaviour from the user's perspective is unchanged.
- [x] 5.3 Trim `src/app/bootstrap.test.ts` to keep only the legacy migration tests (`migrateLegacyAppStore` valid/invalid, `migrateLegacySettings` valid/invalid). The export/import tests no longer apply to this file.

## 6. Build the Google Drive feature

- [x] 6.1 Create `src/shared/google-drive/client.ts` exporting `loadGoogleIdentityScript(): Promise<void>` (injects the GIS `<script>` tag pointing at `https://accounts.google.com/gsi/client` and resolves when `google.accounts.oauth2` is defined) and `createTokenClient({ onToken, onError }): TokenClient` (initialises the OAuth `TokenClient` with the `drive.appdata` scope and the `VITE_GOOGLE_CLIENT_ID` from `import.meta.env`). No React, no feature imports.
- [x] 6.2 Create `src/shared/google-drive/drive-api.ts` exporting `uploadAppDataFile({ token, name, content, existingId? })`, `downloadAppDataFile({ token, id })`, `findAppDataFile({ token, name })`, `getUserEmail({ token })`. All wrap `fetch` with `Authorization: Bearer <token>`. Upload uses the multipart upload URL; download uses `alt=media`; find lists the appDataFolder and matches by name; getUserEmail calls the userinfo endpoint. Surface typed errors.
- [x] 6.3 Create `src/shared/google-drive/drive-api.test.ts` mocking `fetch`. Cover: successful upload (POST), upload-with-update-by-id (PATCH), download happy path, download 404 surfaced, list-and-find hit and miss, getUserEmail success.
- [x] 6.4 Create `src/features/google-drive/schema.ts` with `GoogleDriveAuthSchema` (accessToken string, expiresAt positive integer, email optional email, dayboxFileId optional string, lastBackupAt optional ISO string) and a `BackupError` union type.
- [x] 6.5 Create `src/features/google-drive/types.ts` re-exporting the zod-inferred `GoogleDriveAuth` and `BackupError`.
- [x] 6.6 Create `src/features/google-drive/store.ts` with `useGoogleDriveStore` (zustand + `createValidatedPersist('daybox-google-drive', …)`), exposing actions `connect`, `disconnect`, `backup`, `restore`, and the read state. `backup` calls `buildSnapshot` from `@/features/data-portability`, `JSON.stringify`s it, uploads via `uploadAppDataFile` (using stored or freshly-found `dayboxFileId`), and writes `dayboxFileId` + `lastBackupAt`. `restore` downloads via `downloadAppDataFile`, runs `validateSnapshot` then `applySnapshot` from data-portability, and surfaces any warnings. No imports from `src/app/*` or from individual feature stores.
- [x] 6.7 Create `src/features/google-drive/queries.ts` with `useIsConnected`, `useAccountEmail`, `useLastBackupAge` (returns a human string like "2 days ago" or `null`).
- [x] 6.8 Create `src/features/google-drive/components/GoogleDrivePanel.tsx` rendering the three states (disconnected / connected + no backup yet / connected + backed up) with the Back up / Restore / Disconnect buttons. Restore opens the same `AlertDialog` primitive used by the file-based Import. Inline error display. Calls the store actions.
- [x] 6.9 Create `src/features/google-drive/components/GoogleDrivePanel.test.tsx` covering: disconnected state shows Connect button, connected-without-backup state has Restore disabled, backup click calls store action and updates lastBackupAt display, restore confirm dialog gates apply, disconnect clears state.
- [x] 6.10 Create `src/features/google-drive/index.ts` re-exporting `GoogleDrivePanel` from `./components/GoogleDrivePanel` and the public store + types.

## 7. Wire the panel into the settings drawer

- [x] 7.1 In `src/app/shell/SettingsDrawer.tsx`, add a new "Google Drive" section below the existing "Data" section. Render `<GoogleDrivePanel />` from `@/features/google-drive`.
- [x] 7.2 Add `VITE_GOOGLE_CLIENT_ID=` to `.env.example` (create the file if it doesn't exist) with a one-line comment pointing to the Google Cloud project setup steps. The actual value is not committed.
- [x] 7.3 In `AGENTS.md`, add a one-line note that a missing `VITE_GOOGLE_CLIENT_ID` shows a graceful "not configured" state.

## 8. Verification

- [x] 8.1 Run `npm run format` — confirm zero diffs
- [x] 8.2 Run `npm run typecheck` — confirm zero errors
- [x] 8.3 Run `npm run lint` — confirm zero errors
- [x] 8.4 Run `npm run test` — all existing tests still pass, new tests pass
- [x] 8.5 Manual smoke test of the file-based Export/Import in the settings drawer — round-trip produces a valid v3 envelope, Import with a valid file replaces state, Import with a malformed file shows the inline error, **the resulting file has no `theme` field**
- [x] 8.6 Manual smoke test of the Google Drive flow (requires one-time Google Cloud setup): connect, backup, restore from the same browser, restore from a different browser after signing into the same Google account
- [x] 8.7 Run the `simplify-codebase-architecture` skill against the post-change codebase to confirm the layered rule is satisfied: no `src/features/*` imports from `src/app/*`, no `src/shared/*` imports from `src/features/*` or `src/app/*`, and each feature that participates in snapshot/restore exports a slice from its barrel
