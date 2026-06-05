## Context

DayBox persists 100% of its state to `localStorage` and exposes a JSON export/import round-trip. Today, three unvalidated boundaries exist:

1. **`parseImport`** — runs `JSON.parse` on a user-supplied file, then hand-rolled `coerce*` helpers silently fill in defaults. The function has 5 coerces, 2 shape checks, 1 cross-reference check, and 0 record-level error reporting. New fields = new coerces, easy to forget.
2. **Zustand `persist` rehydration** — none of the four stores validate what they read from disk. A corrupt or stale blob rehydrates as-is. Currently mitigated only by the fact that the app owns the writes.
3. **Legacy migrations in `App.tsx`** — two `useEffect` blocks read `daybox-app-store` and `daybox-settings` and write to the new stores with bare `catch {}`. If the legacy blob is malformed, the user is silently migrated to broken state.

The type model is also duplicated: `Task` lives in `features/tasks/types.ts` (interface), `localStorage.ts` (typed shape), and the coerce helpers. Adding a new field touches three files; the coerce file is the one most likely to be missed.

The change introduces zod v4 to centralize shape definition, then routes validation failures through a per-layer policy that's already aligned with the existing `ImportResult.warnings[]` contract.

## Goals / Non-Goals

**Goals:**

- One source of truth per shape: `Task` (and analogues) defined once, both compile-time and runtime derived from it.
- Per-layer validation policy on import: hard-fail envelope, warn-skip bad records, warn-reassign dangling refs, coerce optional fields.
- Rehydration fallback in zustand: a corrupt persisted blob resets the affected store to initial state rather than booting with garbage.
- Typed legacy migrations: the App.tsx effects validate before writing.
- Defensive bounds on user-input fields that today only trim (task title, group name).

**Non-Goals:**

- Surfacing rehydration-fallback events to the user. The console will record it; no UI affordance.
- Changing the `ImportResult` shape or any store action signatures.
- Validating internals (e.g., `getNextPhase` arguments, computed selectors). Trust boundaries only.
- Replacing `formatDate` / `id` / `notifications` utilities. They are pure functions of trusted inputs.
- Zod for `<input type="date">` (browser already provides ISO), or for derived state.

## Decisions

### 1. Co-located schemas, schema-first types

**Choice**: Each feature gets a `schema.ts` next to its `types.ts` and `store.ts`. `types.ts` becomes a one-liner: `export type Task = z.infer<typeof TaskSchema>`. No interfaces left in `types.ts`.

**Alternative considered**: keep `types.ts` manual, add `schema.ts` alongside. Rejected: the whole point is collapsing the trinity. Two definitions of the same shape invite drift.

**Alternative considered**: put zod schemas directly in `types.ts`, drop the `.interface` syntax. Rejected: `types.ts` is currently a pure-type file (no runtime cost for tree-shaking); putting zod in it adds runtime import to a module whose name promises types only.

```
src/features/tasks/
  schema.ts        ← zod source of truth
  types.ts         ← export type Task = z.infer<typeof TaskSchema>
  store.ts         ← imports Task from types.ts (unchanged)
  queries.ts       ← imports Task from types.ts (unchanged)
```

### 2. Per-layer policy encoded as a small `safeParseAndRoute` helper

**Choice**: a single helper accepts `{ value, schema, layer }` and routes the result:

```ts
type Layer = 'envelope' | 'record' | 'reference' | 'optional' | 'rehydrate'
// envelope  → throws ImportError (caller returns { success: false, error })
// record    → returns { ok: false, reason } for caller to push to warnings[]
// reference → returns { ok: false, reason } for caller to apply default
// optional  → returns the default-coerced value
// rehydrate → returns the default value, logs once
```

The helper is ~30 lines. Each call site reads as a single line, which is the win: routing policy lives in one place, the pipeline reads as English.

**Alternative considered**: inline `safeParse` at each call site. Rejected: policy gets duplicated, drift is inevitable.

**Alternative considered**: a generic `importValidate(blob)` that returns the full structured result. Rejected: the v2/v3 versions and the cross-reference step (groups must parse before task.groupId) need explicit sequencing that doesn't flatten into one call.

### 3. v2 and v3 are two schemas, not one discriminated union

**Choice**: `ExportV2Schema` and `ExportV3Schema` defined separately. `parseImport` dispatches on `version` and picks the schema. Each schema can use `z.object({...}).passthrough()` on the version branch it doesn't care about.

**Alternative considered**: discriminated union on `version: 2 | 3`. Rejected: the v2 shape has `appStore` / `settings` wrappers; the v3 shape has flat `tasks` / `groups` / `timer`. The two are too structurally different to share a base, and a discriminated union obscures the migration that the v2 branch represents.

### 4. Rehydration validation via a shared `createValidatedPersist` helper

**Choice**: a small wrapper around zustand's `persist` middleware that adds a `validate: (state) => ParseResult` option. On rehydration failure, replace state with initial state and `console.warn` once.

```ts
// src/shared/lib/persistence.ts
export function createValidatedPersist<T>(
  name: string,
  schema: z.ZodType<T>,
  init: T,
  options?: { onRehydrateStorage?: ... }
) {
  return persist(init, {
    name,
    onRehydrateStorage: () => (state, error) => {
      if (error) return
      const result = schema.safeParse(state)
      if (!result.success) {
        console.warn(`[daybox] ${name}: persisted state invalid, resetting`, result.error)
        return init
      }
      return result.data
    },
  })
}
```

The four stores switch from `persist(init, { name })` to `createValidatedPersist(name, Schema, init)`. ~6 lines of change per store.

**Alternative considered**: validate inside each store's `onRehydrateStorage` directly. Rejected: four near-identical 10-line blocks.

### 5. Legacy migrations move from `App.tsx` to `app/localStorage.ts` as pure functions

**Choice**: extract the two `useEffect` blocks into `migrateLegacyAppStore()` and `migrateLegacySettings()` pure functions in `app/localStorage.ts`. They return `{ ok: boolean, warnings?: string[] }`. `App.tsx` calls them and routes warnings to `console.warn`.

**Rationale**: today's migrations live in `App.tsx` and import the stores directly. Moving them puts all storage logic in one module, makes them testable as pure functions, and shrinks `App.tsx`.

**Alternative considered**: leave them in `App.tsx`, just add validation. Rejected: App.tsx is a UI component, not a migration layer.

### 6. Length caps: 280 for task title, 40 for group name

**Choice**: `.max(280)` on `TaskSchema.title`, `.max(40)` on `GroupSchema.name`. Both are arbitrary but align with common UX conventions (Twitter-length task, UI-truncate-safe group).

**Alternative considered**: no caps, rely on CSS truncation. Rejected: the localStorage write of a 100kB title is a real bug class. We already trim; capping at a sensible bound is one schema token.

### 7. `setTimerSettings` validates the merged result

**Choice**: after the spread-merge in `setTimerSettings`, run `TimerSettingsSchema.safeParse` on the result. On failure, log a warning and do not apply the partial update.

**Alternative considered**: validate the partial input before the merge. Rejected: a partial that merges with valid existing state can still produce invalid state (e.g., `focusDuration: -5` merged with valid `shortBreakDuration` is still invalid). Validate the merged result.

## Risks / Trade-offs

- **[Risk] zod bundle weight ~12 kB gz** → Acceptable per the discussion. Single bundle, no code-splitting impact. Verified acceptable.
- **[Risk] Rehydration fallback silently drops user data** → Mitigated by the `console.warn` so an attentive user/dev can see it. A UI surface for "your saved data was corrupt, here's a backup file" is out of scope.
- **[Risk] `safeParse` on a corrupted huge blob is slow** → Mitigated by the envelope-level hard-fail: we parse top-level shape first, so a multi-megabyte file with no `version` key bails before recursing into records.
- **[Risk] Two definitions of `Task` during the refactor** (old `interface Task` + new `z.infer`) → Mitigated by doing the types.ts rewrite atomically with the schema introduction, in a single commit.
- **[Risk] Per-record warn-skip can mask data loss** → Mitigated by routing the per-record reason into `warnings[]` (which already exists) and keeping the warnings array rather than collapsing to a count.
- **[Risk] Migrations in `App.tsx` are time-of-check / time-of-use**: the legacy blob is read once and discarded → not a real risk; the `useRef` guard prevents double-run.
- **[Risk] Theme schema lives in `src/app/theme.ts`, which is structurally not a feature** → Keep it there. Adding `app/schema.ts` would be over-organization. Theme is just two values; the schema is `z.enum(['light', 'dark'])`.

## Migration Plan

Single deploy. No backward-compat shim needed for the schema (type-only changes); the validation pipeline is new and applies on first rehydration. The only user-visible change is that malformed imports now produce better warnings; a working v2 or v3 import path is unchanged.

Rollback: revert the commit. Persisted state is forward-compatible (the on-disk shape doesn't change; we just validate it).

## Open Questions

- Should `setTimerSettings` validation be a hard-fail (no write) or a silent coerce (clamp to min/max)? Current decision is hard-fail + console.warn. UI callers always pass through `NumberInput` which is already clamped, so the warning is dev-tooling. If this proves noisy, switch to coerce in a follow-up.
- Should the envelope-level hard-fail include a `error` field in `ImportResult` that distinguishes "this isn't a DayBox export" from "this is a DayBox export that's broken"? The current `error: string` shape is fine; a future code/enum upgrade is easy.
