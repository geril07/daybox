## 1. Remove Legacy Snapshot Import Path

- [ ] 1.1 Remove the `adaptLegacySnapshot` fallback from `prepareSnapshotImport` so parsed JSON must satisfy the current `SaveEnvelopeSchema`.
- [ ] 1.2 Delete `src/features/data-portability/legacy.ts` and any imports that only existed for flat v2/v3 adaptation.
- [ ] 1.3 Remove `SUPPORTED_SNAPSHOT_VERSIONS`, `readSnapshotVersion`, and old `CURRENT_SNAPSHOT_VERSION`/`CURRENT_VERSION` aliases from the data-portability public barrel unless a current-envelope consumer still requires them.
- [ ] 1.4 Confirm localStorage boot migrations in `src/app/bootstrap.ts` are unchanged.

## 2. Update Tests

- [ ] 2.1 Remove tests that expect flat `version: 2` or `version: 3` snapshots to prepare successfully.
- [ ] 2.2 Add or update tests asserting flat `version: 2` and `version: 3` snapshots return `{ ok: false, reason: 'Not a DayBox export file.' }` without mutating stores.
- [ ] 2.3 Keep current-envelope tests for build, prepare, normalization, missing-slice defaults, and commit behavior.

## 3. Verify

- [ ] 3.1 Run `npm run format`.
- [ ] 3.2 Run `npm run typecheck`.
- [ ] 3.3 Run `npm run lint`.
- [ ] 3.4 Run `npm run test`.
