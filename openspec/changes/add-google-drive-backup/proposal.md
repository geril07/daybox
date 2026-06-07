## Why

DayBox is local-first — every task, group, and setting lives in `localStorage`. The existing file-based Export/Import covers accidental data loss, but it is a manual, easy-to-forget ritual that puts the burden on the user to email files to themselves. Adding a manual two-way Google Drive backup gives users a one-click path to back up and restore, while keeping the local-first promise intact: no account is required to use the app, the cloud side is opt-in, and there is no real-time sync, polling, or backend.

## What Changes

- **New feature `src/features/google-drive/`** with the standard six-file shape (`store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, `index.ts`) following the `architecture` spec.
- **New shared module `src/shared/google-drive/`** containing the thin transport layer — a Google Identity Services loader and a small set of Drive REST API helpers (`uploadAppDataFile`, `downloadAppDataFile`, `findAppDataFile`, `getUserEmail`). The feature owns state and UX; the shared module owns the wire.
- **New `GoogleDrivePanel`** mounted in `SettingsDrawer` alongside the existing file-based Export/Import section. The existing buttons stay — they remain the right tool for moving data between accounts on different providers.
- **New persisted store** under `daybox-google-drive` via `createValidatedPersist` with the same rehydrate-validate pattern used by the four feature stores. Schema: `GoogleDriveAuthSchema` (access token, expiry, optional email, optional `dayboxFileId`, optional `lastBackupAt`).
- **Backup** reuses `exportData()` from `@/app/bootstrap` unchanged — same v3 envelope, same shape, no schema bump.
- **Restore** reuses `parseImport()` and `applyImport()` from `@/app/bootstrap` unchanged — the v3 envelope is round-tripped end-to-end.
- **OAuth** uses Google Identity Services loaded as a script (no npm dependency). Scope is `https://www.googleapis.com/auth/drive.appdata` so the app only ever sees its own hidden appDataFolder.
- **Restore** continues to gate on a confirmation dialog matching the current file-based Import behaviour. No automatic overwrite, no last-write-wins, no diff UI.
- **Last-backup timestamp and account email** are shown in the panel when connected — quiet, informational, no nagging.
- **Configuration**: a new `VITE_GOOGLE_CLIENT_ID` env var holds the OAuth Web Client ID. No other configuration required at runtime; the developer must complete a one-time Google Cloud project setup (consent screen, Web client, Drive API enabled, authorized JS origins) — documented in `design.md` rather than automated.

## Capabilities

### New Capabilities

- `google-drive-backup`: covers connect, disconnect, manual backup, manual restore, last-backup display, account email display, and the failure-mode behaviour (expired token auto re-prompt, network error inline, missing-file inline, invalid-envelope surfaced through the existing `parseImport` error path).

### Modified Capabilities

_None._ The `data-persistence` and `settings` capability requirements are not changing: the v3 export/import contract is unchanged, and the `settings` capability already specifies that the drawer hosts feature-owned panels — adding a new panel satisfies that requirement without modifying it.

## Impact

- **New code**:
  - `src/features/google-drive/` — six files plus a co-located component test.
  - `src/shared/google-drive/` — `client.ts` (GIS loader) and `drive-api.ts` (REST wrappers) plus a `drive-api.test.ts` that mocks `fetch`.
- **Settings drawer** (`src/app/shell/SettingsDrawer.tsx`): one new section that mounts `<GoogleDrivePanel />`. The existing Data section (Export / Import) is untouched.
- **Cross-cutting integration**: the new feature imports `exportData`, `parseImport`, `applyImport` from `@/app/bootstrap`. `src/app/bootstrap.ts` is on the cross-cutting allowlist in the `architecture` spec, and `src/features/google-drive/` is allowed to depend on `src/app/*` and `src/shared/*`. No other feature is touched.
- **Dependencies**: no new npm packages. Google Identity Services is loaded as a script from `https://accounts.google.com/gsi/client`. Drive API is called via `fetch` with `Authorization: Bearer <token>` — no SDK.
- **Configuration**: `VITE_GOOGLE_CLIENT_ID` (developer-set, public identifier, safe to ship in the bundle). `.env.local` is gitignored by Vite's defaults.
- **One-time external setup (not in this change)**: Google Cloud project, OAuth consent screen, Web client ID with authorized JS origins for dev and production, Drive API enabled. The required steps are listed in `design.md` as a pre-deploy checklist; the app surfaces a clear "Google Drive is not configured" state if the env var is missing so the app still works without it.
