## Context

The DayBox codebase has three implicit layers — `src/shared/`, `src/features/<domain>/`, `src/app/` — but the architecture spec only codifies the rules for cross-feature imports and the cross-cutting allowlist in `app/`. The relationship between `src/shared/` and the layers above is not stated, and the rule for `features/` reaching into `app/` is silent.

Three practical problems emerge from this gap, all of which this change fixes together:

1. The new Google Drive feature needs the existing snapshot/restore mechanics (`exportData`, `parseImport`, `applyImport`, `downloadExport`) to back up and restore. Those helpers currently live in `src/app/bootstrap.ts`. Making the new feature import from `src/app/*` is the wrong direction — `app/` is meant for cross-cutting orchestration, not for utilities the rest of the codebase calls.
2. The architecture spec's six-file shape is worded as a hard requirement ("a missing entry is a violation"), but several plausible features (the data-portability feature in particular) don't need all six files. The current wording forces the creation of placeholder files.
3. The current snapshot/restore helpers in `bootstrap.ts` know about every feature's data shape: tasks, groups, timer, planner, and theme. Any change to a feature's data shape touches the centralised helper. The "interface pointing to stores" pattern that an earlier design used to share the helper via `src/shared/utils/` is rejected by the team — it leaks DayBox-specific data shape into the leaf layer and threads five generic type parameters through every call site.

This change ships the Google Drive backup feature, but only after introducing a clean cross-cutting data-portability feature with a per-feature slice pattern. The architecture is the foundation; the feature is the motivating case.

## Goals / Non-Goals

**Goals**

- Manual two-way Google Drive backup: connect, push, pull, disconnect. No auto-backup, no real-time sync, no polling.
- The v3 export envelope stays as the wire format, but **theme is removed from the envelope** — each device keeps its own theme. Old exports that include a `theme` field are still parsed (backward compat) but the value is silently ignored.
- A new `data-portability` feature owns the cross-cutting snapshot/restore logic. Each participating feature exposes a `Slice<T>` value from its barrel. The data-portability feature iterates the registered slices to build, validate, and apply snapshots. No feature imports from `src/app/*` and no `src/shared/*` module imports from `src/features/*` or `src/app/*`.
- Codify the layered architecture in the spec: `shared/` is leaf, `features/` is middle, `app/` is top, with imports flowing only downward or sideways.
- Soften the six-file shape rule so features are described by their typical contents, not forced to invent placeholder files.

**Non-Goals**

- Real-time sync, multi-device live updates, conflict-resolution UI, auto-backup on change, last-write-wins, or any other "actual sync" behaviour. The PRD's cloud-sync item remains split: the storage/restore half ships here, the live-sync half stays in "later."
- A second cloud provider (Dropbox, iCloud, WebDAV). The plumbing layer is shaped generically enough that a future change could add one, but only Google Drive is in scope here.
- Changes to the per-feature schemas (Task, Group, TimerSettings, PlannerState). The slices import the existing schemas unchanged.
- Migration of any persisted state. The refactor moves code, not data; existing localStorage keys keep working unchanged. The legacy v1 / v2 localStorage migration functions stay in `src/app/bootstrap.ts` because they are genuine one-shot app-init code.

## Decisions

### D1. Layered architecture is now an explicit spec rule

Three layers, with imports flowing only downward or sideways:

```
┌──────────────────────────────────────────────────────────────┐
│                       LAYER MODEL                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   src/app/  ── top, cross-cutting orchestration              │
│      │                                                       │
│      │   can import from:                                    │
│      │     • src/shared/*                                    │
│      │     • src/features/* (via the barrel)                 │
│      │     • siblings under src/app/                         │
│      │                                                       │
│      ▼                                                       │
│   src/features/<domain>/  ── middle, per-domain behaviour    │
│      │                                                       │
│      │   can import from:                                    │
│      │     • src/shared/*                                    │
│      │     • src/features/<other>/* (via the barrel only)    │
│      │     • siblings inside the same feature                │
│      │                                                       │
│      ▼                                                       │
│   src/shared/  ── leaf, pure utilities and UI primitives     │
│                                                              │
│      can import from:                                        │
│        • siblings under src/shared/                          │
│        • external packages                                   │
│        • (NOTHING from src/features/ or src/app/)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The architecture spec is updated to encode this directly, with scenarios that make each direction testable.

### D2. The six-file shape is a description, not a hard requirement

The current requirement is replaced with a softer one: a typical feature contains the listed files, but omissions are allowed when the feature has no use for the omitted file. The `index.ts` barrel stays required because it is the feature's public surface.

This is the rule the data-portability feature relies on (it has no `store.ts` and no `components/`), and it unblocks future utility-style features from being forced to carry placeholder files.

### D3. The cross-cutting allowlist moves from a positive list to a layered model

The current rule (a named list of `src/app/*` files that may import from many features) is kept as the operational instruction for those three files, but the deeper rule — "imports flow only downward or sideways" — is added as the canonical principle.

The data-portability feature is the new canonical example of a feature that imports from many other features' barrels. It does so by importing each participating feature's `Slice<T>` from `@/features/<domain>` — the standard "feature-to-feature-via-barrel" pattern. The barrel is the public surface, and the slice is a new public surface that complements the existing store actions.

### D4. Per-feature slices are the standard pattern for participating in snapshot/restore

Every feature that owns a piece of persisted data exposes a `Slice<T>` value from its barrel:

```ts
// src/shared/utils/slice.ts
export interface Slice<T = unknown> {
  name: string // unique key in the envelope
  schema: z.ZodType<T> // per-record (or per-slice) validator
  export: () => T // read the current state
  apply: (data: T) => void // write the state
}
```

```ts
// src/features/tasks/slice.ts
import { z } from 'zod'

import type { Slice } from '@/shared/utils/slice'

import { TaskSchema } from '../schema'
import { useTaskStore } from '../store'
import type { Task } from '../types'

export const tasksSlice: Slice<Task[]> = {
  name: 'tasks',
  schema: z.array(TaskSchema),
  export: () => useTaskStore.getState().tasks,
  apply: (tasks) => useTaskStore.setState({ tasks }),
}
```

The slice is the feature's contract with data-portability. The feature owns its own data shape, its own per-record validation (via the existing schema), and its own export/apply mechanics. The data-portability feature does not know what a `Task` is.

A feature that does not participate in snapshot/restore (a UI-only feature, a future analytics feature) does not export a slice. This is not a violation of any rule.

### D5. The data-portability feature is the orchestrator, not the source of truth

```
┌──────────────────────────────────────────────────────────────┐
│  data-portability feature structure                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   src/features/data-portability/                             │
│     envelope.ts       v3 envelope zod schema (canonical)     │
│     migrations.ts     v2-to-v3 envelope transform            │
│     registry.ts       imports each feature's slice           │
│     build.ts          buildSnapshot() iterates slices       │
│     validate.ts       validateSnapshot() parses + migrates   │
│     apply.ts          applySnapshot() iterates + cross-refs  │
│     index.ts          barrel                                │
│                                                              │
│   The feature has NO store.ts and NO components/ — it has   │
│   no persisted state and no UI. The six-file shape rule is  │
│   softened to permit this.                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**The split of concerns:**

| Concern                                                  | Owner                            | Why                                                                      |
| -------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| Per-feature data shape (Task, Group, TimerSettings, ...) | the feature itself               | Each feature already has `schema.ts` / `types.ts` / `store.ts`           |
| Per-feature record validation                            | the feature's slice              | The slice uses the feature's own schema                                  |
| Per-feature migration (a field was renamed)              | the feature's slice              | Only the feature knows its own data shape evolution                      |
| Envelope shape (v3: tasks, groups, timer, planner)       | `data-portability/envelope.ts`   | The wire format is a cross-cutting concern with its own reason to change |
| Envelope-level migration (v1 → v2 → v3)                  | `data-portability/migrations.ts` | The format has versions; the format owns the version transitions         |
| Slice registry (who participates)                        | `data-portability/registry.ts`   | One line per feature, single source of truth                             |
| Cross-reference checks (task → group)                    | `data-portability/apply.ts`      | Cross-feature, the orchestrator's job                                    |
| Browser download helper (`downloadAsFile`)               | `src/shared/utils/download.ts`   | Pure browser API wrapper, used by the file-based Export flow             |

### D6. Theme is excluded from the snapshot

The v3 envelope no longer includes a `theme` field. Each device keeps its own theme preference, and the backup/restore round-trip does not touch it.

```ts
// v3 envelope — no theme
{
  version: 3,
  exportedAt: "…",
  tasks: Task[],
  groups: Group[],
  timer: TimerSettings,
  planner: { weekStartDay, browseDate }
}
```

**Backward compatibility:** the v3 envelope schema still accepts an incoming `theme` field silently (using a "loose" parse that allows extra fields), so files exported by an earlier version parse cleanly. The apply function does not read the field. After one or two release cycles the field can be removed from the schema entirely.

**The v2 → v3 migration also drops the theme:** `settings.theme` in the v2 shape is no longer lifted to the top level. The v3 envelope simply doesn't carry it.

**`src/app/theme.ts` and `src/shared/utils/theme.ts` are untouched by this change.** They stay as-is.

### D7. The v2-to-v3 migration lives in data-portability

The v2 envelope has a different shape (settings nested under a `settings` key). The migration is envelope-level (the structure of the envelope changes), not slice-level. It lives in `data-portability/migrations.ts`:

```ts
// src/features/data-portability/migrations.ts
function migrateV2ToV3(v2: unknown): unknown {
  // Parse v2 shape (zod safeParse, drop on failure)
  // Return v3 shape:
  //   {
  //     version: 3,
  //     exportedAt: v2.exportedAt ?? now,
  //     tasks: v2.tasks,
  //     groups: v2.groups,
  //     timer: v2.settings?.timer,
  //     planner: { weekStartDay: v2.settings?.weekStartDay ?? 1, browseDate: null }
  //   }
  // (no theme field)
}
```

`validateSnapshot` detects `version === 2` and runs this migration before running the v3 envelope schema. The result of a v2 import is indistinguishable from a v3 import.

### D8. The file-based flow collapses to two calls

The existing file-based Export/Import in `SettingsDrawer.tsx` becomes a thin wrapper around data-portability:

```ts
// src/app/shell/SettingsDrawer.tsx
import {
  buildSnapshot,
  validateSnapshot,
  applySnapshot,
  downloadAsFile,
} from '@/features/data-portability'

const handleExport = () => {
  downloadAsFile(JSON.stringify(buildSnapshot()), 'daybox-export.json')
}

const doImport = async (text: string) => {
  const result = validateSnapshot(text)
  if (!result.ok) {
    setImportError(result.reason)
    return
  }
  const applied = applySnapshot(result.data)
  if (applied.warnings?.length) {
    setImportWarnings(applied.warnings) // optional: surface in the UI
  }
}
```

The AlertDialog confirmation flow stays. Behaviour from the user's perspective is unchanged; the only user-visible difference is the exported file no longer contains a `theme` field.

### D9. The cloud flow is the same shape

```ts
// src/features/google-drive/store.ts
import {
  buildSnapshot,
  validateSnapshot,
  applySnapshot,
} from '@/features/data-portability'
import {
  uploadAppDataFile,
  downloadAppDataFile,
  findAppDataFile,
} from '@/shared/google-drive/drive-api'

backup: async () => {
  const token = get().accessToken
  const json = JSON.stringify(buildSnapshot())
  const existingId =
    get().dayboxFileId ??
    (await findAppDataFile({ token, name: 'daybox.json' }))
  const { id } = await uploadAppDataFile({
    token,
    name: 'daybox.json',
    content: json,
    existingId,
  })
  set({ dayboxFileId: id, lastBackupAt: new Date().toISOString() })
}

restore: async () => {
  const token = get().accessToken
  const json = await downloadAppDataFile({ token, id: get().dayboxFileId })
  const parsed = validateSnapshot(json)
  if (!parsed.ok) return { ok: false, error: parsed.reason }
  const applied = applySnapshot(parsed.data)
  return { ok: true, warnings: applied.warnings }
}
```

Two flows, one source of truth for the snapshot/restore mechanics.

### D10. The slice registry is a static, explicit list

```ts
// src/features/data-portability/registry.ts
import { groupsSlice } from '@/features/groups'
import { plannerSlice } from '@/features/planner'
import { tasksSlice } from '@/features/tasks'
import { timerSlice } from '@/features/timer'
import type { Slice } from '@/shared/utils/slice'

export const slices: Slice[] = [
  tasksSlice,
  groupsSlice,
  timerSlice,
  plannerSlice,
]
```

Adding a feature = import its slice into `registry.ts` and add it to the array. No import-order magic, no auto-discovery, no side effects. The order is canonical (used as iteration order for build, validate, and apply).

### D11. The Google Drive feature has the same shape as today

The new feature is `src/features/google-drive/` with the six files: `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, `index.ts`. It uses `createValidatedPersist('daybox-google-drive', …)` with the same rehydrate-validate pattern as the four feature stores. The store action is a thin wrapper around data-portability (D9).

The Drive REST API helpers and the GIS loader live in `src/shared/google-drive/` (transport layer, no React, no feature imports). The scope is `drive.appdata` (least-privilege, app-folder only). Token expiry is handled by silent re-prompt (no nagging).

## Risks / Trade-offs

- **Theme not in the backup might surprise users who expect "everything" to come back.** If a user explicitly wants to copy their theme preference across devices, the new design doesn't support that — but the team's call is that theme is a UI preference, not data, and the explicit decision is that each device owns its own. → Mitigation: the spec documents the intent; the change is opt-out by not clicking Back up before switching theme on a new device.

- **The data-portability feature is unusual (no UI, no store).** It exists as a feature to be the canonical owner of the wire format and the slice registry. The softened six-file rule permits this, and the architecture spec delta codifies it. → Mitigation: the data-portability feature is small (~5 files + tests); its public surface is documented in the spec.

- **The v2 → v3 migration silently drops `settings.theme`.** Old v2 files containing a theme will have the theme ignored. The data is lost in the migration. → Mitigation: this is a one-time, intentional change; the spec calls it out. Users with old v2 files that they want to preserve the theme from would need to set the theme manually on the restore target.

- **The cross-reference check lives in data-portability, not in the tasks or groups slice.** This is a cross-feature concern, so the orchestrator is the right home. But it does mean data-portability knows the relationship "task.groupId references group.id" — a small leak. → Mitigation: the relationship is encoded in the wire format, so it's already a cross-feature concern. The leak is small and stable.

- **The Slice<T> interface is generic on T, but data-portability's `slices` array is typed as `Slice[]` (T = unknown).** This means the apply function works with `unknown` data, and the slice's `apply` is the type-narrowing boundary. → Mitigation: this is honest. The slice owns its types; the orchestrator iterates without knowing them. The runtime schema.safeParse inside each slice.apply is the validation point.

- **GIS script loading is a one-time async race.** The first backup or restore will trigger the script load; if the user is offline, the script load fails before the API call would have. → Mitigation: the script load error is caught and surfaced in the same inline-error UI as network failures, with a clear "could not load Google Identity Services" message.

- **Token in localStorage is in plaintext.** A local attacker with same-browser access can read the token. → Mitigation: this is the same risk profile as the existing `daybox-tasks` blob in localStorage; the access token only protects the user's own appDataFolder (the `drive.appdata` scope is least-privilege); and the threat model is explicitly a single-user, single-device app.

## Migration Plan

The refactor and the new feature ship together as one change, with a clean diff:

1. **Spec change first** (under `openspec/changes/add-google-drive-backup/specs/`): apply the architecture delta (layered rule + softened six-file + updated cross-cutting allowlist language), the data-portability capability spec, and the google-drive-backup capability spec (with the theme exclusion).
2. **Shared primitives** (under `src/shared/utils/`): add `slice.ts` (the `Slice<T>` interface) and `download.ts` (the `downloadAsFile` helper) with tests.
3. **Per-feature slices** (under each feature's folder): add `slice.ts` to tasks, groups, timer, and planner. Re-export from each feature's barrel.
4. **data-portability feature** (under `src/features/data-portability/`): scaffold the six files (using the softened shape — no `store.ts` / `components/`), wire up `buildSnapshot` / `validateSnapshot` / `applySnapshot`, and add the v2-to-v3 migration. Test with the v2 and v3 envelope round-trips and the cross-reference reassignment.
5. **Bootstrap trim** (`src/app/bootstrap.ts`): delete the moved functions and their tests; keep only the two legacy migrations.
6. **Settings drawer refactor** (`src/app/shell/SettingsDrawer.tsx`): switch to data-portability. Verify the file-based Export/Import still works end-to-end and the exported file no longer contains a `theme` field.
7. **Google Drive feature** (`src/features/google-drive/`): scaffold the six files, wire up the actions using data-portability, mount the panel in `SettingsDrawer`.
8. **App-level integration** (`src/app/shell/SettingsDrawer.tsx`): add the new section for `<GoogleDrivePanel />`.

**Rollback**: revert the commit. No persisted state is created until the user explicitly clicks "Connect with Google," so reverting before the first connect leaves zero footprint. After the first connect, the `daybox-google-drive` key holds a token and `dayboxFileId`; on revert, the token becomes useless (the user would have to re-connect anyway) and `dayboxFileId` is informational only.

## Open Questions

None remaining at the design level. The few minor choices (Drive file name, error wording, the exact OAuth scope string) are all captured in the spec and design and are obvious from the constraints.

The only thing that needs to happen outside the code is the one-time Google Cloud project setup, which is a checklist in the deploy docs rather than a design decision.
