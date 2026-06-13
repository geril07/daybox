## Why

DayBox is not in production, so carrying boot-time migrations for obsolete localStorage layouts adds complexity without protecting real users. `src/app/bootstrap.ts` only exists to translate legacy `daybox-app-store` and `daybox-settings` blobs into the current feature-owned persistence keys, and those compatibility paths can be removed before launch.

## What Changes

- **BREAKING**: Stop migrating existing `daybox-app-store` localStorage data on app load.
- **BREAKING**: Stop migrating existing `daybox-settings` localStorage data on app load.
- Remove the boot-time migration calls from app startup.
- Delete `src/app/bootstrap.ts` and the tests that only cover those legacy migrations.
- Keep current persistence unchanged: feature stores continue to own `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`.
- Keep file/Drive snapshot import/export behavior scoped to the separate `trim-legacy-data-portability` change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-persistence`: Remove requirements for one-shot localStorage migrations from obsolete `daybox-app-store` and `daybox-settings` keys.
- `architecture`: Remove stale architecture examples/text that mention `src/app/bootstrap.ts` or legacy migrations as current app-layer orchestration.

## Impact

- `src/app/App.tsx` no longer imports or invokes bootstrap migration functions.
- `src/app/bootstrap.ts` is removed.
- `src/app/bootstrap.test.ts` is removed.
- `openspec/specs/data-persistence/spec.md` no longer requires legacy boot migrations after this change is synced.
- `openspec/specs/architecture/spec.md` no longer references the deleted bootstrap file after this change is synced.
