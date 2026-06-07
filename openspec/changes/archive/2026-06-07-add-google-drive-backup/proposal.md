## Why

DayBox is local-first — every task, group, and setting lives in `localStorage`. The existing file-based Export/Import covers accidental data loss, but it is a manual, easy-to-forget ritual. Adding a manual two-way Google Drive backup gives users a one-click path to back up and restore, while keeping the local-first promise intact: no account is required to use the app, the cloud side is opt-in, and there is no real-time sync, polling, or backend.

This change is also the chance to fix three architectural issues in the same diff: the layering between `src/shared/`, `src/features/`, and `src/app/` was not codified, the six-file feature shape was overstated, and the existing snapshot/restore logic in `src/app/bootstrap.ts` knew about every feature's data shape. The Google Drive feature is the motivating case; the data-portability feature and the architecture spec updates are what make it architecturally honest.

## What Changes

- **New feature `src/features/google-drive/`** following the standard feature shape: `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, `index.ts`. The new feature genuinely uses all six, so it happens to match the full shape.
- **New shared module `src/shared/google-drive/`** containing the thin transport layer — a Google Identity Services loader and a small set of Drive REST API helpers (`uploadAppDataFile`, `downloadAppDataFile`, `findAppDataFile`, `getUserEmail`). The feature owns state and UX; the shared module owns the wire.
- **New `GoogleDrivePanel`** mounted in `SettingsDrawer` alongside the existing file-based Export/Import section. The existing buttons stay — they remain the right tool for moving data between accounts on different providers.
- **New persisted store** under `daybox-google-drive` via `createValidatedPersist` with the same rehydrate-validate pattern used by the four feature stores. Schema: `GoogleDriveAuthSchema` (access token, expiry, optional email, optional `dayboxFileId`, optional `lastBackupAt`).
- **OAuth** uses Google Identity Services loaded as a script (no npm dependency). Scope is `https://www.googleapis.com/auth/drive.appdata` so the app only ever sees its own hidden appDataFolder.
- **Restore** continues to gate on a confirmation dialog matching the current file-based Import behaviour. No automatic overwrite, no last-write-wins, no diff UI.
- **Last-backup timestamp and account email** are shown in the panel when connected — quiet, informational, no nagging.
- **New `data-portability` feature at `src/features/data-portability/`** that owns the cross-cutting snapshot/restore logic. The feature has no `store.ts` and no `components/` (no persisted state, no UI), which the new softened six-file rule permits. Its public surface is `buildSnapshot`, `validateSnapshot`, `applySnapshot`, `downloadAsFile`, the v2/v3 envelope schemas, and the slice registry. It imports the `Slice<T>` interface from `src/shared/utils/slice.ts` and each participating feature's slice from the feature's barrel. It does not import from `src/app/*`.
- **Per-feature slices** added to `src/features/tasks/slice.ts`, `src/features/groups/slice.ts`, `src/features/timer/slice.ts`, and `src/features/planner/slice.ts`. Each slice implements `Slice<T>`: `name`, `schema` (the feature's existing zod schema), `export` (reads the feature's store via `getState()`), `apply` (writes via `setState()`). Re-exported from each feature's barrel so data-portability can import them. No slice for theme — the next bullet explains why.
- **Theme is excluded from the snapshot.** The v3 envelope loses the `theme` field. Each device keeps its own theme. The v2-to-v3 migration also drops `settings.theme`. The `Slice<T>` interface and the slice registry deliberately omit theme; `src/app/theme.ts` and `src/shared/utils/theme.ts` are untouched by this change. Backward compatibility: the v3 envelope schema still accepts an incoming `theme` field silently (using a loose parse), so old exports parse cleanly; the apply function does not read the value.
- **Refactor (export/import out of `app/`)**: the existing `exportData`, `parseImport`, `applyImport`, `downloadExport`, and the v2/v3 envelope schemas move from `src/app/bootstrap.ts` into the new `data-portability` feature. `src/app/bootstrap.ts` shrinks to just the two one-shot legacy migration functions (`migrateLegacyAppStore`, `migrateLegacySettings`), which legitimately belong in app-init.
- **Refactor (file-based flow)**: `src/app/shell/SettingsDrawer.tsx` switches from calling the moved helpers to calling `buildSnapshot` / `validateSnapshot` / `applySnapshot` / `downloadAsFile` from `@/features/data-portability`. The user-visible behaviour is unchanged except for the theme field no longer appearing in the exported file.
- **Refactor (tests)**: `src/app/bootstrap.test.ts` keeps only the legacy migration tests. The export/import tests now live in `src/features/data-portability/envelope.test.ts` and `src/features/data-portability/apply.test.ts`.
- **Architecture spec delta**: the `architecture` capability is updated in three ways (all in the same change because they are all part of the same underlying confusion about layering).
  1. **Layered dependency direction is added as a hard rule.** The new rule codifies: `src/shared/` is leaf, `src/features/` is middle, `src/app/` is top, with imports flowing only downward or sideways. This is what the refactor above is structurally forced to follow, and the data-portability feature is the new canonical example of a feature that imports from many other features' barrels.
  2. **The "every feature folder SHALL contain these six files" rule is softened.** The current wording treats a missing `store.ts` or `components/` folder as a violation, which forces features that legitimately have no state or no UI (such as the new data-portability feature) to invent placeholder files. The new wording keeps the list as a description of what a typical feature contains and makes omissions explicitly allowed. The `index.ts` barrel stays required.
  3. **The cross-cutting allowlist is updated to match the new layering.** The current rule lists `src/app/bootstrap.ts`, `src/app/App.tsx`, and `src/app/shell/` as the only files allowed to import from more than one feature. With the snapshot/restore logic now in `src/features/data-portability/`, that feature is the new canonical example of a feature that imports from many other features' barrels — and the rule is updated to make it clear that the "feature-to-feature-via-barrel" pattern is the standard way for a feature to consume other features' public surfaces.
- **Configuration**: a new `VITE_GOOGLE_CLIENT_ID` env var holds the OAuth Web Client ID. A missing value is handled gracefully — the new feature shows "Google Drive is not configured" and the rest of the app keeps working.

## Capabilities

### New Capabilities

- `data-portability`: covers the `Slice<T>` interface, the v3 envelope schema, the v2-to-v3 migration, the slice registry, the `buildSnapshot` / `validateSnapshot` / `applySnapshot` / `downloadAsFile` functions, the cross-reference check (task → group), and the per-feature migration contract.
- `google-drive-backup`: covers connect, disconnect, manual backup, manual restore, last-backup display, account email display, and the failure-mode behaviour (expired token auto re-prompt, network error inline, missing-file inline, invalid-envelope surfaced through the same `validateSnapshot` error path the file-based flow uses).

### Modified Capabilities

- `architecture`: three issues are fixed in the same change because they are all part of the same underlying confusion about layering.
  1. **Layered dependency direction is added as a hard rule.** Today the spec only constrains cross-feature imports, leaving the relationship between `src/shared/`, `src/features/`, and `src/app/` undefined in the direction the code now actually needs. The new rule codifies: `shared/` is leaf, `features/` is middle, `app/` is top, with imports flowing only downward or sideways.
  2. **The "every feature folder SHALL contain these six files" rule is softened.** The current wording treats a missing `store.ts` or `components/` folder as a violation, which forces features that legitimately have no state or no UI (such as the data-portability feature) to invent placeholder files. The new wording keeps the list as a description of what a typical feature contains and makes omissions explicitly allowed.
  3. **The cross-cutting allowlist is updated to match the new layering.** The current rule lists `src/app/bootstrap.ts`, `src/app/App.tsx`, and `src/app/shell/` as the only files allowed to import from more than one feature. With the snapshot/restore logic now in `src/features/data-portability/`, that feature is the new canonical example of a feature that imports from many other features' barrels.

## Impact

- **Layered architecture, made explicit.** Before this change, the directory layout already implied a layering but the spec didn't say so. After this change, the layering is a hard rule: `shared/` cannot reach up, `features/` cannot reach into `app/`, and `app/` is the only orchestrator. This is what makes the new feature possible without adding a new "feature that crosses feature boundaries" outside the rules.

- **New `data-portability` feature (medium)**:
  - `src/features/data-portability/envelope.ts` — v3 envelope zod schema (with a loose variant for backward-compatible parsing of old `theme` fields).
  - `src/features/data-portability/migrations.ts` — `migrateV2ToV3` envelope transform (drops `settings.theme`).
  - `src/features/data-portability/registry.ts` — imports each feature's slice, exports the canonical ordered list.
  - `src/features/data-portability/build.ts` — `buildSnapshot` iterates slices, assembles the envelope (no theme).
  - `src/features/data-portability/validate.ts` — `validateSnapshot` parses, detects version, migrates if v2, runs envelope schema.
  - `src/features/data-portability/apply.ts` — `applySnapshot` iterates slices, validates each, applies, then runs cross-reference checks (task → group, reassign dangling refs to default group with a warning).
  - `src/features/data-portability/index.ts` — barrel.
  - `src/features/data-portability/envelope.test.ts` and `src/features/data-portability/apply.test.ts` — round-trip, v2 migration, dropped-field warnings, cross-reference reassignment.

- **Per-feature slices (small per feature, four features)**:
  - `src/features/tasks/slice.ts` — `tasksSlice: Slice<Task[]>`. Re-exported from `src/features/tasks/index.ts`.
  - `src/features/groups/slice.ts` — `groupsSlice: Slice<Group[]>`. Re-exported.
  - `src/features/timer/slice.ts` — `timerSlice: Slice<TimerSettings>`. Re-exported. Only the settings slice is exported, not the runtime state.
  - `src/features/planner/slice.ts` — `plannerSlice: Slice<{ weekStartDay, browseDate }>`. Re-exported.
  - No theme slice.

- **Shared primitives (small)**:
  - `src/shared/utils/slice.ts` — the `Slice<T>` interface (just a type, imports nothing).
  - `src/shared/utils/download.ts` — `downloadAsFile(content, filename)` browser helper, plus a co-located test.

- **Google Drive feature (small)**:
  - `src/features/google-drive/` — six files plus a co-located component test. The feature imports from `@/features/data-portability` (for the snapshot round-trip) and from `@/shared/google-drive/` (for the transport). It does not import from `src/app/*` and does not import individual feature stores directly.
  - `src/shared/google-drive/` — `client.ts` (GIS loader) and `drive-api.ts` (REST wrappers) plus a `drive-api.test.ts` that mocks `fetch`. No features are imported here.

- **Refactor scope (medium)**:
  - `src/app/bootstrap.ts` loses ~210 lines (export/import/download/envelope helpers) and keeps ~120 lines (legacy migrations).
  - `src/app/bootstrap.test.ts` is trimmed to the two legacy migration tests.
  - `src/app/shell/SettingsDrawer.tsx` switches four import paths to `@/features/data-portability` and the two function calls become data-portability calls. The user-visible behaviour is unchanged except for the exported file no longer containing a `theme` field.
  - `src/app/theme.ts` and `src/shared/utils/theme.ts` are untouched.

- **Dependencies**: no new npm packages. Google Identity Services is loaded as a script from `https://accounts.google.com/gsi/client`. Drive API is called via `fetch` with `Authorization: Bearer <token>` — no SDK.

- **Configuration**: `VITE_GOOGLE_CLIENT_ID` (developer-set, public identifier, safe to ship in the bundle). `.env.local` is gitignored by Vite's defaults.

- **One-time external setup (not in this change)**: Google Cloud project, OAuth consent screen, Web client ID with authorized JS origins for dev and production, Drive API enabled. The required steps are listed in `design.md` as a pre-deploy checklist.
