## Context

`createValidatedPersist` (`src/shared/utils/persistence.ts`) wraps zustand's `persist` options to add schema validation on rehydrate: if the persisted blob fails its zod schema, the store resets to defaults and warns once. It is used by all four feature stores: `tasks`, `groups`, `planner`, `timer`.

zustand v5 types the persist middleware as:

```ts
persist<T, U = T>(initializer, options: PersistOptions<T, U>)

interface PersistOptions<S, PersistedState = S> {
  name: string
  storage?: PersistStorage<PersistedState>
  partialize?: (state: S) => PersistedState
  onRehydrateStorage?: (state: S) => ((state?: S, error?: unknown) => void) | void
  ...
}
```

The current helper is generic only over `TInit` (the defaults shape), not over the full store type `S`, and it types the rehydrate callback's `state` as `Record<string, unknown>`. The returned object therefore does not structurally satisfy `PersistOptions<TaskStore, …>`, so each call site casts the result with `as any` plus an `@typescript-eslint/no-explicit-any` disable. That cast suppresses checking of the whole options object — including `name`, `storage`, and `onRehydrateStorage` — on the exact path that decides whether persisted user data is trusted.

The four stores persist their **entire** store object (no `partialize`); action functions are dropped by `JSON.stringify` at write time, and the zod schema validates only the data slice (zod `.object` ignores the extra keys). This is the behavior to preserve.

## Goals / Non-Goals

**Goals:**

- `createValidatedPersist` returns a correctly typed `PersistOptions<S, S>`; no `as any` and no eslint-disable at any call site or in the helper.
- The rehydrate callback `state` is typed `S`; `init` is typed `Partial<S>`; the `options` (`storage`, `onRehydrateStorage`) are typed against zustand's real shapes.
- Runtime behavior is byte-for-byte identical (validation, reset, single warn, timer wall-clock correction, debounced timer storage).

**Non-Goals:**

- No switch to explicit `partialize` / minimal persisted payloads (considered below, deferred).
- No change to storage keys, schemas, export/import, or legacy migration code.
- No change to the persisted shape on disk.

## Decisions

### Decision 1: Make the helper generic over the full store `S`, persisting the whole store (`U = S`)

Signature becomes:

```ts
import type { PersistOptions, PersistStorage } from 'zustand/middleware'

export interface ValidatedPersistOptions<S> {
  storage?: PersistStorage<S>
  onRehydrateStorage?: PersistOptions<S, S>['onRehydrateStorage']
}

export function createValidatedPersist<S>(
  name: string,
  schema: ZodSchemaLike,
  init: Partial<S>,
  options?: ValidatedPersistOptions<S>,
): PersistOptions<S, S>
```

The internals are unchanged in behavior: wrap `onRehydrateStorage` so that on a non-error rehydrate it `safeParse`s the state, and on failure `Object.assign(state, init)` and warns once; on success it delegates to the user's `onRehydrateStorage` (still the zustand `() => (state) => void` shape, so the timer's hook is unchanged).

**Why `U = S` rather than a separate persisted type:** it exactly mirrors today's runtime (whole store persisted, functions stripped by JSON). It is the smallest, lowest-risk diff and requires no per-store key lists.

**Alternative considered — explicit `partialize` (`U != S`):** persist only the validated slice, making schema ≡ on-disk payload provable and not relying on JSON to drop functions. Rejected for now: more verbose (e.g. the timer would enumerate 7 keys), larger diff, and no behavior or correctness benefit given JSON already strips functions. Recorded as a possible future hardening.

### Decision 2: Require an explicit type argument at each call site

`persist`'s `T` is inferred from the initializer and cannot flow backward into the second argument. If the helper inferred `S` from `init`, it would infer the data slice (e.g. `{ tasks: Task[] }`), not the store (`TaskStore`), and still mismatch. So call sites pass it explicitly:

```ts
createValidatedPersist<TaskStore>('daybox-tasks', TaskStateSchema, taskInit)
```

This is strictly better than `as any`: the type argument documents the store and enables full checking of the options object. `taskInit` (`{ tasks: [] }`) remains assignable to `Partial<TaskStore>`.

### Decision 3: Omit the `storage` key when no storage option is provided

zustand's persist builds its options as `{ storage: createJSONStorage(() => localStorage), partialize, version, merge, ...baseOptions }`. Because the spread comes last, any key _present_ in our returned object wins — including `storage: undefined`. The previous helper always returned a `storage` key, so the three stores that pass no storage (`tasks`, `groups`, `planner`) returned `storage: undefined`, which overwrote zustand's localStorage default. zustand then saw a falsy storage, substituted a no-op that logs `the given storage is currently unavailable`, and those stores never persisted at all.

The helper now spreads the key conditionally — `...(storage ? { storage } : {})` — so when no storage is supplied the key is absent and zustand's `createJSONStorage(() => localStorage)` default applies.

**Alternative considered — make `storage` a required parameter:** forces each call site to import and pass `createJSONStorage(() => localStorage)`. Rejected: more boilerplate at every call site and an easy thing to get wrong, with no benefit over restoring the documented zustand default. The timer keeps passing its debounced storage explicitly and is unaffected either way.

## Risks / Trade-offs

- **[Generic inference picks the wrong `S` if a call site forgets the type argument]** → Without `as any`, `tsc` will error at the call site rather than silently accept it; the explicit `<StoreType>` is verified by the build.
- **[Behavioral regression in validation/reset or timer rehydrate]** → Internals are logically unchanged; the existing `store.test.ts` suites for all four stores (covering valid blob, corrupt blob reset + warn, and timer resume) are the regression gate and must pass unchanged.
- **[`Partial<S>` would accept an empty `{}` init]** → Acceptable; each store already passes a complete defaults object, and an incomplete init is no worse than today's untyped path.
- **[Persistence was silently broken for three stores before this fix and unit tests did not catch it]** → Unit tests exercise store logic directly, not the zustand→localStorage path. The fix is verified manually (create a task, confirm `localStorage.getItem('daybox-tasks')` is populated and the warning is gone) and codified as a spec scenario so the regression is documented.
