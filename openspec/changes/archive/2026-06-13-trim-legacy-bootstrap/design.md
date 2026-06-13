## Context

Current app startup calls `migrateLegacyAppStore` and `migrateLegacySettings` from `src/app/bootstrap.ts`. Those functions only read obsolete localStorage keys (`daybox-app-store`, `daybox-settings`), validate/adapt their contents, write into current feature stores/theme, and delete the legacy keys.

The current runtime persistence model is already feature-owned: tasks, groups, timer, planner, and theme persist under their own keys. Since DayBox is not in production, there is no shipped user data that requires these boot migrations.

## Goals / Non-Goals

**Goals:**

- Remove boot-time compatibility code for obsolete localStorage layouts.
- Keep current localStorage persistence under feature-owned keys unchanged.
- Remove tests/spec requirements whose only purpose is preserving obsolete key migration.
- Remove stale architecture references to `src/app/bootstrap.ts`.

**Non-Goals:**

- Do not change feature store schemas or current persist keys.
- Do not change current-envelope file import/export behavior in this change.
- Do not add a replacement migration or feature flag for old localStorage blobs.

## Decisions

### Delete the bootstrap module instead of emptying it

`src/app/bootstrap.ts` has no current-runtime responsibility once old key migration is removed. Deleting the file avoids a misleading app startup hook and prevents future code from treating legacy migration as still supported.

Alternative considered: keep no-op migration functions so `App.tsx` changes less. Rejected because no-op compatibility functions preserve the same mental overhead this cleanup is meant to remove.

### Remove boot effects from `App.tsx`

The two `useEffect` blocks and refs exist only to guard one-shot migration calls. Current persistence rehydrates through each feature store's zustand `persist` configuration, so app startup does not need a replacement boot step.

Alternative considered: replace the effects with defensive deletion of legacy keys. Rejected because deleting obsolete keys is still compatibility behavior for unsupported data; unsupported stale blobs can be ignored.

### Remove legacy migration tests

`src/app/bootstrap.test.ts` only asserts migration behavior for `daybox-app-store` and `daybox-settings`. Once those requirements are removed, the file should be deleted rather than rewritten.

## Risks / Trade-offs

- Existing pre-production localStorage using `daybox-app-store` or `daybox-settings` will no longer migrate -> accepted because the app has not shipped to production and the user explicitly does not care about old versions.
- Stale localStorage blobs may remain in a developer browser -> accepted because the current app will ignore them and current feature-owned keys remain authoritative.
- Pending OpenSpec changes may also edit `data-persistence` -> apply/sync order should be checked when implementing or archiving this alongside `trim-legacy-data-portability`.
