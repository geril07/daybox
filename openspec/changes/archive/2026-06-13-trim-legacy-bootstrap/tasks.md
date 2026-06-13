## 1. Remove Legacy Bootstrap Wiring

- [x] 1.1 Remove the `@/app/bootstrap` import from `src/app/App.tsx`.
- [x] 1.2 Remove the migration refs and `useEffect` blocks that invoke `migrateLegacyAppStore` and `migrateLegacySettings`.
- [x] 1.3 Clean up React imports in `src/app/App.tsx` after removing the migration effects.

## 2. Delete Legacy Compatibility Code

- [x] 2.1 Delete `src/app/bootstrap.ts`.
- [x] 2.2 Delete `src/app/bootstrap.test.ts` because it only covers removed legacy migrations.
- [x] 2.3 Search the codebase for `migrateLegacyAppStore`, `migrateLegacySettings`, `daybox-app-store`, and `daybox-settings`; confirm no current runtime code depends on those keys.

## 3. Verify Current Persistence

- [x] 3.1 Confirm current feature-owned persistence keys still appear in the relevant stores/specs: `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`.
- [x] 3.2 Run `npm run format`.
- [x] 3.3 Run `npm run typecheck`.
- [x] 3.4 Run `npm run lint`.
- [x] 3.5 Run `npm run test`.
