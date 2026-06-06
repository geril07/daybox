## Why

`createValidatedPersist` is not generic over the store type, so its return value cannot match zustand's `PersistOptions<S, U>`. Every one of the four feature stores papers over this with `as any`, which disables type-checking of the *entire* persist options object — a typo'd `name`, a wrong `storage`, or a malformed `onRehydrateStorage` would all be silently accepted. This is a latent-bug hazard sitting on the one code path that decides whether persisted user data is trusted or reset.

## What Changes

- Make `createValidatedPersist` generic over the full store type `S`, returning a properly typed `zustand` `PersistOptions<S, S>` instead of an untyped object.
- Type the rehydrate callback's `state` as `S` (not `Record<string, unknown>`) and type `init` as `Partial<S>` so the reset-to-defaults assignment is checked.
- Type the helper's `options` (`storage`, `onRehydrateStorage`) against zustand's real `PersistOptions` shapes so the timer store's custom storage and rehydrate hook are checked.
- Remove the `as any` cast and the `@typescript-eslint/no-explicit-any` eslint-disable from all four call sites (`tasks`, `groups`, `planner`, `timer`) and from the helper itself, replacing each with an explicit `<StoreType>` type argument.
- Fix a latent persistence bug surfaced while typing the helper: the helper always emitted a `storage` key, so for stores that pass no storage (`tasks`, `groups`, `planner`) it emitted `storage: undefined`, which clobbered zustand's `createJSONStorage(() => localStorage)` default and disabled persistence entirely (the "given storage is currently unavailable" warning). The helper now omits the `storage` key when none is provided.
- No other runtime behavior change: whole-store persistence, JSON serialization, validation-and-reset, the single `console.warn`, and the timer's wall-clock rehydrate correction all remain identical.

## Capabilities

### New Capabilities

(none — this change introduces no new user-facing capability)

### Modified Capabilities

(none — runtime behavior is unchanged; the `data-persistence` "Persist rehydration validates and falls back" requirement is preserved exactly. This is an implementation-level type-safety refactor with no spec-level requirement changes.)

## Impact

- `src/shared/utils/persistence.ts` — `createValidatedPersist` signature and internals.
- `src/features/tasks/store.ts`, `src/features/groups/store.ts`, `src/features/planner/store.ts`, `src/features/timer/store.ts` — drop `as any`, add explicit type argument.
- No dependency, storage-key, or persisted-shape changes. Existing `store.test.ts` suites for all four stores must continue to pass unchanged.
