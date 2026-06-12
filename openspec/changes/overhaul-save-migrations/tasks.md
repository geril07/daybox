## 1. Save envelope and shared slice API

- [ ] 1.1 Add the current save envelope schema with `envelopeVersion: 1`, `exportedAt`, and nested `slices`.
- [ ] 1.2 Add shared data-portability types for `SaveSlice`, `SaveSlicePrepareResult`, and `MissingSliceStrategy<TCurrent>`.
- [ ] 1.3 Add the canonical save slice registry in dependency order: groups, tasks, timerSettings, planner.
- [ ] 1.4 Ensure file export/import and Google Drive backup/restore continue using only data-portability public APIs.

## 2. Feature-owned save slices

- [ ] 2.1 Add a groups save slice with versioned schema, `exportSlice`, `prepareImport`, `applyImport`, and missing-slice strategy.
- [ ] 2.2 Add a tasks save slice with versioned schema, `exportSlice`, `prepareImport`, `applyImport`, and missing-slice strategy.
- [ ] 2.3 Add a timer settings save slice named `timerSettings` with versioned schema, `exportSlice`, `prepareImport`, `applyImport`, and missing-slice strategy.
- [ ] 2.4 Add a planner save slice with versioned schema, `exportSlice`, `prepareImport`, `applyImport`, and missing-slice strategy.
- [ ] 2.5 Ensure old/current slice schemas are owned by the feature and do not import future/current schemas for historical versions.

## 3. Build and import orchestration

- [ ] 3.1 Update `buildSnapshot()` to emit the nested envelope and call each slice's `exportSlice`.
- [ ] 3.2 Update import preparation to parse the envelope, collect raw slice inputs, and call each slice's `prepareImport`.
- [ ] 3.3 Implement missing-slice behavior from each slice's policy.
- [ ] 3.4 Preserve all-or-nothing import semantics: no `applyImport` call until every slice prepares successfully and cross-slice normalization succeeds.
- [ ] 3.5 Update commit to call each slice's `applyImport` in registry order.

## 4. Legacy flat snapshot adapters

- [ ] 4.1 Add adapter support for existing flat `version: 2` save files.
- [ ] 4.2 Add adapter support for existing flat `version: 3` save files.
- [ ] 4.3 Map legacy `settings.timer` and v3 `timer` into the new `timerSettings` slice.
- [ ] 4.4 Drop legacy `settings.theme` during adaptation.
- [ ] 4.5 Ensure unsupported legacy versions still fail with `Not a DayBox export file.`.

## 5. Cross-slice validation and normalization

- [ ] 5.1 Keep default-group restoration centralized in data-portability.
- [ ] 5.2 Keep dangling `task.groupId` repair centralized in data-portability.
- [ ] 5.3 Preserve normalization warnings through to file import and Google Drive restore callers.
- [ ] 5.4 Ensure invalid slice payloads hard-fail the whole import before commit.

## 6. Tests

- [ ] 6.1 Add or update tests proving new exports contain `envelopeVersion`, `exportedAt`, and nested `slices`.
- [ ] 6.2 Add or update tests proving new exports contain `slices.timerSettings` and do not contain top-level `timer` or timer runtime fields.
- [ ] 6.3 Add or update tests proving existing flat v2 files import through the legacy adapter.
- [ ] 6.4 Add or update tests proving existing flat v3 files import through the legacy adapter.
- [ ] 6.5 Add or update tests proving missing slice strategies work.
- [ ] 6.6 Add or update tests proving no store is mutated if any slice preparation fails.
- [ ] 6.7 Add or update tests proving repaired cross-slice invariants return warnings.
- [ ] 6.8 Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test`.
