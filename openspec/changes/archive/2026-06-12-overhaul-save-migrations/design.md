## Context

DayBox has two related but distinct durability mechanisms:

- Local persistence writes feature stores to localStorage for this browser/device.
- Save snapshots move restorable DayBox data through file Export/Import and Google Drive Backup/Restore.

The timer feature highlights the distinction. `daybox-timer` persists runtime state locally (`phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`, `sessionPomoCount`) so reload can resume an active timer. The save snapshot should not carry that runtime state across files or devices. It should carry only timer settings.

The current flat snapshot contract mostly behaves this way, but `timer` is ambiguous and one app-level snapshot version couples all entity evolution together.

## Goals / Non-Goals

**Goals:**

- Establish a canonical save snapshot used identically by file Export, file Import, Google Drive Backup, and Google Drive Restore.
- Separate envelope/container versioning from feature-owned slice versioning.
- Move entity and slice migrations into the owning feature.
- Keep cross-slice validation and normalization centralized in data-portability.
- Rename the timer save data to `timerSettings`.
- Preserve support for importing existing flat `v2` and `v3` files.

**Non-Goals:**

- Add routines to the save snapshot.
- Introduce separate snapshot profiles for Google Drive versus file export.
- Change localStorage persistence behavior.
- Change timer runtime rehydration behavior.
- Introduce partial imports.

## Decisions

### 1. Envelope version and slice versions are separate

The save file container has an envelope version. Each feature-owned slice has its own version.

```txt
Envelope version = save-file/container format
Slice version    = feature-owned data schema
```

Current shape:

```ts
type SaveSnapshotEnvelopeV1 = {
  envelopeVersion: 1
  exportedAt: string
  slices: {
    groups: GroupsSaveSliceCurrent
    tasks: TasksSaveSliceCurrent
    timerSettings: TimerSettingsSaveSliceCurrent
    planner: PlannerSaveSliceCurrent
  }
}
```

Changing task shape later advances only the tasks slice version. The envelope and other slices do not need to move unless their own shape or the container format changes.

### 2. Use nested `slices`

The current export shape SHALL use a nested `slices` namespace:

```json
{
  "envelopeVersion": 1,
  "exportedAt": "2026-06-12T00:00:00.000Z",
  "slices": {
    "groups": { "version": 1, "groups": [] },
    "tasks": { "version": 1, "tasks": [] },
    "timerSettings": { "version": 1, "settings": {} },
    "planner": { "version": 1, "weekStartDay": 1, "browseDate": null }
  }
}
```

This keeps envelope-level fields from colliding with feature names and makes version ownership explicit.

### 3. Save is one canonical snapshot, regardless of transport

File export, file import, Google Drive backup, and Google Drive restore SHALL all use the same envelope and the same parse/prepare/normalize/apply pipeline.

```txt
File Export      ┐
File Import      ├── canonical save snapshot
Google Backup    │
Google Restore   ┘
```

Transport does not define data policy. Google Drive is just another place where the canonical save file can be stored.

### 4. Save timer settings, not timer runtime

The save slice is named `timerSettings` and stores only settings:

```ts
type TimerSettingsSaveSliceV1 = {
  version: 1
  settings: TimerSettings
}
```

The local timer store can still persist runtime state under `daybox-timer`. That is local device recovery, not save portability.

### 5. Features own slice APIs

Each participating feature exports a portability slice object.

```ts
export type SaveSlicePrepareResult<TCurrent> =
  | { ok: true; value: TCurrent; warnings?: string[] }
  | { ok: false; reason: string }

export type MissingSliceStrategy<TCurrent> =
  | { kind: 'required' }
  | { kind: 'useDefault'; getDefault: () => TCurrent }

export type SaveSlice<Name extends string, TCurrent> = {
  name: Name
  currentVersion: number
  missing: MissingSliceStrategy<TCurrent>

  exportSlice: () => TCurrent
  prepareImport: (input: unknown) => SaveSlicePrepareResult<TCurrent>
  applyImport: (value: TCurrent) => void
}
```

Names are explicit around the lifecycle:

```txt
exportSlice    = current app state -> save file
prepareImport = save file -> validated current slice
applyImport   = current slice -> live store
```

### 6. Data-portability owns orchestration, not entity migrations

Data-portability owns:

```txt
1. envelope parse
2. legacy flat snapshot adapters
3. registry orchestration
4. all-or-nothing prepare/apply
5. cross-slice validation and repair
```

Features own:

```txt
1. slice schemas
2. slice/entity migrations
3. exportSlice
4. prepareImport
5. applyImport
6. missing-slice strategy
```

### 7. Old slice schemas model historical reality

Historical slice schemas should parse what DayBox may have actually saved at that time, not today's ideal shape. Current schemas may be stricter.

```txt
old schema:
  accepts historical saved reality

migration:
  normalizes weird old data

current schema:
  enforces current rules
```

This prevents old files from failing before the owning feature has a chance to migrate them.

Feature entity schemas SHALL use the same versioned structure. The current public schema remains available through the existing feature `schema.ts` entrypoint, but that file aliases the latest versioned schema instead of owning the shape directly.

```txt
src/features/tasks/schema/v1.ts
  TaskV1Schema

src/features/tasks/schema.ts
  TaskSchema = TaskV1Schema

src/features/tasks/save/versions/v1.ts
  TasksSaveSliceV1Schema uses TaskV1Schema
```

When a future `TaskV2Schema` is introduced, `TaskSchema` can point at v2 while save v1 continues importing `TaskV1Schema`.

### 8. Cross-slice validation stays central

Features validate their own shape. Data-portability validates relationships between slices.

Current cross-slice rules include:

```txt
task.groupId must reference an imported group or be reassigned to default group
default group must exist or be restored
```

Future rules can be added centrally if a slice references another slice.

The central function SHOULD be named for this boundary, e.g. `normalizeCrossSliceInvariants`, rather than a generic `normalizeSnapshot`, so it is clear that feature-owned slice preparation handles local shape/migration and data-portability handles relationships between prepared slices.

### 9. Commit remains all-or-nothing

No feature `applyImport` runs until every slice prepares successfully and cross-slice validation/normalization has completed.

```txt
parse envelope
  ↓
adapt legacy if needed
  ↓
prepare all slices
  ↓
run cross-slice validation/repair
  ↓
only then apply all slices
```

Warnings are allowed for repairable normalization. Invalid slice payloads reject the whole import.

### 10. Registry order is dependency order for apply

The registry order SHALL be canonical and used for build/apply ordering. Apply order should follow dependencies:

```txt
groups
tasks
planner
```

Prepare order matters less because each slice prepares itself from raw input, but using one canonical order keeps results deterministic.

## Proposed File Shape

```txt
src/features/data-portability/
  envelope.ts
  registry.ts
  legacy.ts
  build.ts
  import.ts
  normalize.ts

src/features/tasks/save/
  slice.ts
  versions/v1.ts
  migrations/run.ts

src/features/groups/save/
  slice.ts
  versions/v1.ts
  migrations/run.ts

src/features/timer/save/
  timer-settings-slice.ts
  versions/v1.ts
  migrations/run.ts

src/features/planner/save/
  slice.ts
  versions/v1.ts
  migrations/run.ts
```

## Proposed Pipeline

```txt
json string
  │
  ▼
parseJson(): unknown
  │
  ▼
parse current envelope OR adapt legacy v2/v3 flat snapshot
  │
  ▼
for each registry slice:
  raw slice input
    │
    ├─ missing? use slice missing policy
    │
    ▼
  slice.prepareImport(raw)
    ├─ detect slice version
    ├─ parse historical slice schema
    ├─ run feature-owned migrations
    └─ return current slice
  │
  ▼
cross-slice validation / normalization
  │
  ▼
PreparedSnapshot
  │
  ▼
commitSnapshotImport()
    └─ call applyImport for every slice in registry order
```

## Legacy Adapter Lineage

Existing flat files are not discarded. They are adapted to the nested envelope before slice preparation.

```txt
legacy v2 flat file
  settings.timer
  settings.weekStartDay
  settings.theme
    │
    ▼
envelope v1
  slices.timerSettings
  slices.planner
  theme dropped

legacy v3 flat file
  timer
  planner
    │
    ▼
envelope v1
  slices.timerSettings
  slices.planner
```

After adaptation, normal feature-owned slice preparation runs.

## Risks / Trade-offs

- **More structure than a global version chain.** The added structure pays off when one entity evolves without forcing unrelated slice migrations.
- **Feature slices add public API surface.** This is intentional: each feature owns its save contract explicitly.
- **Legacy adapter must be careful.** The adapter bridges old flat files into new nested slices and should be heavily tested.
- **Active routines proposal conflict.** `add-daily-routines` currently assumes routines are the next app-level snapshot version. This overhaul changes that model; routines should later be added as a new slice with its own slice version.

## Open Questions

- None currently. The established decisions are enough to update the spec and implement the change.
