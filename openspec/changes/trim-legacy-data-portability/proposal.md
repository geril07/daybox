## Why

DayBox has completed the move to the current nested save envelope (`envelopeVersion: 1` with feature-owned `slices`). Keeping flat `version: 2` and `version: 3` import adapters now adds migration and test surface for export formats we no longer want to support.

## What Changes

- **BREAKING**: Stop accepting legacy flat DayBox export files with top-level `version: 2` or `version: 3` in file Import and Google Drive Restore.
- Keep accepting the current nested save envelope with `envelopeVersion: 1`, `exportedAt`, and `slices`.
- Remove the legacy flat snapshot adapter path from data-portability preparation.
- Remove public legacy version helpers that only exist to support flat snapshot import.
- Keep localStorage boot migrations (`daybox-app-store`, `daybox-settings`) out of scope; those are not part of the file/Drive snapshot import pipeline.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-portability`: Supported snapshot input is narrowed to the current nested envelope; legacy flat snapshot adapters are removed.
- `data-persistence`: User-facing file import no longer accepts flat `version: 2` or `version: 3` JSON exports.

## Impact

- `src/features/data-portability/legacy.ts` can be removed.
- `src/features/data-portability/import.ts` reads only current envelopes after JSON parsing.
- `src/features/data-portability/version.ts` and related barrel exports can be removed or reduced if no longer used.
- Data-portability tests drop v2/v3 import cases and assert flat legacy files are rejected.
- File Import and Google Drive Restore behavior changes because old flat exports are no longer restorable by the current app.
