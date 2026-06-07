## Why

`createValidatedPersist` wraps zustand's `persist` options object and is used by all four feature stores and the Google Drive store. Of the four things it composes into the returned `PersistOptions<S>` — `name`, `storage`, `partialize`, `onRehydrateStorage` — only `onRehydrateStorage` does any real work. The other three are pure proxies, and `partialize` is silently dropped at runtime (it's in the input type but never spread into the returned object). The timer store needs a real `storage` option, the Google Drive store needs a real `partialize` option, and every other store passes neither — so the helper is mostly a thin layer that re-shapes arguments it doesn't actually inspect.

The proxy shape also forces the helper to do the `...(storage ? { storage } : {})` dance to avoid clobbering zustand's `createJSONStorage(() => localStorage)` default. That dance works, but it is a smell pointing at the fact that the helper is doing more configuration plumbing than validation.

Wrapping only `onRehydrateStorage` — and letting `persist` receive its other options directly — collapses the helper to the one job it actually performs, fixes the `partialize` bug as a side effect, and gives the timer store's user-defined rehydrate hook a simpler `(state) => void` shape instead of zustand's curried `() => (state) => void` form.

## What Changes

- Rename `createValidatedPersist` to `createValidatedRehydrate`. The new helper returns only a function compatible with zustand's `onRehydrateStorage` field, not a full `PersistOptions` object.
- Move the `name`, `storage`, and `partialize` options out of the helper and onto the `persist` call site. Each store wires its own `persist(state, { name, storage?, partialize?, onRehydrateStorage })` options object.
- The helper's signature becomes `createValidatedRehydrate<S>({ name, schema, init, afterValidate? })` — a single options-object argument. `afterValidate` is a plain `(state: S) => void` hook that fires after a successful rehydrate-then-validate. The helper handles zustand's internal `() => (state, error) => void` curried shape and does not surface the rehydration error to `afterValidate`: if rehydration itself failed, validation is skipped, the store falls back to its factory initial state, and `afterValidate` does not fire (YAGNI — no current consumer observes rehydration errors).
- Fix a latent persistence bug: the Google Drive store's `partialize`, which the current helper silently drops, is now applied because the call site owns the full options object.
- Update all five call sites: `tasks`, `groups`, `planner`, `timer`, and `google-drive`.
- Update `data-persistence` and `architecture` specs to reference `createValidatedRehydrate` and to require that `name` / `storage` / `partialize` be passed directly to `persist` at the call site.
- **BREAKING** (internal): the exported symbol name changes. The OpenSpec spec that names the helper changes its name. No public API outside the repo is affected.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `data-persistence`: the "Persist configuration is statically type-checked" and "Stores without explicit storage persist to localStorage" requirements reference `createValidatedPersist` by name. The renamed helper (`createValidatedRehydrate`) returns a narrower type (`OnRehydrateStorage<S>`) and the requirements are re-worded to require that the `name`, `storage`, and `partialize` fields appear on the `persist` call-site options object.
- `architecture`: the "One folder per domain under features/" requirement says feature stores are "constructed with `createValidatedPersist`". Replace that phrase with `createValidatedRehydrate` and add the constraint that `name` / `storage` / `partialize` flow directly to `persist` at the call site (i.e. the helper is not the single point of persist configuration).

## Impact

- `src/shared/utils/persistence.ts` — rename export, narrow return type, drop the `name` / `storage` / `partialize` passthrough logic and the `storage ? { storage } : {}` defensive spread.
- `src/features/tasks/store.ts` — move `name` to the `persist` options object; replace helper call with `onRehydrateStorage: createValidatedRehydrate<TaskStore>(...)`.
- `src/features/groups/store.ts` — same as tasks.
- `src/features/planner/store.ts` — same as tasks.
- `src/features/timer/store.ts` — move `name` and `storage` to the `persist` options object; the timer-specific wall-clock-correction rehydrate hook becomes a flat `(state) => void` `afterValidate` field on the helper's options object instead of the curried `() => (state) => void` shape on the old options bag.
- `src/features/google-drive/store.ts` — move `name` and `partialize` to the `persist` options object; `partialize` now actually runs (fixing the latent bug where runtime-only `status` / `error` could leak into localStorage on every write).
- `openspec/specs/data-persistence/spec.md` — update the two requirements that name the helper.
- `openspec/specs/architecture/spec.md` — update the one requirement that names the helper.
- `openspec/changes/refactor-validated-persist-helper/` — proposal, design, specs, tasks.
- Existing `store.test.ts` suites for all five stores should continue to pass with no edits — runtime behavior is unchanged.
