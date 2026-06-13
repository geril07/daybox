## Context

DayBox currently exports the new nested save envelope with `envelopeVersion: 1`, `exportedAt`, and feature-owned `slices`. Import preparation still has a fallback branch for older flat JSON exports with top-level `version: 2` and `version: 3`, adapting them into the nested envelope before slice preparation.

The old public `validateSnapshot` and `applySnapshot` pipeline has already been removed. The remaining legacy surface is the flat snapshot adapter path and its version helper/test coverage.

## Goals / Non-Goals

**Goals:**

- Make the current nested save envelope the only supported file/Drive snapshot input.
- Remove flat `version: 2` and `version: 3` adapter code, tests, and public helpers.
- Keep the prepare/commit split and feature-owned slice preparation unchanged.
- Keep unsupported input failures before any store mutation.

**Non-Goals:**

- Do not change the current snapshot envelope shape.
- Do not change Google Drive transport behavior beyond the shared import rejection behavior.
- Do not remove localStorage boot migrations for `daybox-app-store` or `daybox-settings`.
- Do not introduce a transitional compatibility wrapper for old flat exports.

## Decisions

### Reject flat exports at envelope parsing

`prepareSnapshotImport` SHALL parse JSON and then call the current envelope parser directly. If the value does not satisfy `SaveEnvelopeSchema`, preparation returns `Not a DayBox export file.` and does not try legacy detection.

Alternative considered: keep `legacy.ts` but gate it behind a flag. Rejected because the goal is to remove the compatibility path and its mental overhead, not hide it.

### Remove legacy version helpers from the public barrel

`SUPPORTED_SNAPSHOT_VERSIONS` and `readSnapshotVersion` only describe flat legacy imports. Once those imports are unsupported, the public barrel should not expose them. Current envelope versioning remains represented by `CURRENT_SAVE_ENVELOPE_VERSION` and `SaveEnvelopeSchema`.

Alternative considered: keep `CURRENT_SNAPSHOT_VERSION` aliases for compatibility. Rejected unless a current consumer still needs them; names that imply top-level snapshot versions preserve the old model.

### Leave localStorage migrations alone

The first-load localStorage migrations move users from old persisted browser keys to current feature keys. They are independent from file/Drive snapshot import and can be retired separately if desired.

Alternative considered: bundle localStorage migration removal into this cleanup. Rejected because it changes a different compatibility boundary and increases rollback risk.

## Risks / Trade-offs

- [Risk] A user with only an old flat v2/v3 export file can no longer restore it in the current app. -> Mitigation: call out the breaking behavior in the proposal and keep the failure explicit as `Not a DayBox export file.`
- [Risk] Archived OpenSpec artifacts still mention old pipelines. -> Mitigation: only update active/main specs; archived changes remain historical records.
- [Risk] Active routine planning could accidentally revive top-level snapshot versioning. -> Mitigation: update `add-daily-routines` artifacts to use the nested slice registry and missing-slice defaults.
