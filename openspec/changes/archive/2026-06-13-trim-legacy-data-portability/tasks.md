## 1. Remove Legacy Snapshot Import Path

- [x] 1.1 Remove the `adaptLegacySnapshot` fallback from `prepareSnapshotImport` so parsed JSON must satisfy the current `SaveEnvelopeSchema`.
- [x] 1.2 Delete `src/features/data-portability/legacy.ts` and any imports that only existed for flat v2/v3 adaptation.
- [x] 1.3 Remove `SUPPORTED_SNAPSHOT_VERSIONS`, `readSnapshotVersion`, and old `CURRENT_SNAPSHOT_VERSION`/`CURRENT_VERSION` aliases from the data-portability public barrel unless a current-envelope consumer still requires them.
- [x] 1.4 Confirm localStorage boot migrations in `src/app/bootstrap.ts` are unchanged.

## 2. Update Tests

- [x] 2.1 Remove tests that expect flat `version: 2` or `version: 3` snapshots to prepare successfully.
- [x] 2.2 Add or update tests asserting flat `version: 2` and `version: 3` snapshots return `{ ok: false, reason: 'Not a DayBox export file.' }` without mutating stores.
- [x] 2.3 Keep current-envelope tests for build, prepare, normalization, missing-slice defaults, and commit behavior.

## 3. Verify

- [x] 3.1 Run `npm run format`.
- [x] 3.2 Run `npm run typecheck`.
- [x] 3.3 Run `npm run lint`.
- [x] 3.4 Run `npm run test`.
