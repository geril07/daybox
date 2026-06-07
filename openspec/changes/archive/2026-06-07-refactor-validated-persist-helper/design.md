## Context

`createValidatedPersist` lives at `src/shared/utils/persistence.ts` and is used by every persisted feature store: `tasks`, `groups`, `planner`, `timer`, and `google-drive`. Its current shape is:

```ts
function createValidatedPersist<S, U = S, R = unknown>(
  name: string,
  schema: ZodSchemaLike,
  init: Partial<S>,
  options?: { onRehydrateStorage; partialize; storage },
): PersistOptions<S, U, R>
```

The function returns a full `PersistOptions<S, U, R>` object. Of the four fields it composes into the return value, only `onRehydrateStorage` is non-trivial:

- `name` — pass-through.
- `storage` — pass-through, gated by a `...(storage ? { storage } : {})` defensive spread to avoid clobbering zustand's `createJSONStorage(() => localStorage)` default. The defensive spread carries a 3-line comment explaining itself.
- `partialize` — typed in the input, **not** in the returned object (silently dropped). The Google Drive store relies on `partialize` to keep runtime-only `status` / `error` out of localStorage; today they leak through because the field is dropped.
- `onRehydrateStorage` — the actual work: schema validation, single `console.warn`, `Object.assign(state, init)` reset on failure, and composition with the user's rehydrate hook (used by the timer store for wall-clock correction).

The helper is at the intersection of two spec requirements: `data-persistence` ("Persist configuration is statically type-checked" and "Stores without explicit storage persist to localStorage") and `architecture` ("One folder per domain under features/" — feature stores are "constructed with `createValidatedPersist`"). Both specs name the helper.

This refactor is internal: no on-disk format change, no new dependency, no behavior change for the four baseline stores, and one bug fix at the Google Drive store (where `partialize` now actually runs).

## Goals / Non-Goals

**Goals:**

- Collapse `createValidatedPersist` to its one real job: producing a function that wraps `onRehydrateStorage` with schema validation, single-warn, and default-reset.
- Stop proxying `name`, `storage`, and `partialize` through the helper. Each store passes them directly to `persist`.
- Switch the helper's argument shape from four positional parameters to a single options-object argument. With four fields (three of which are conceptually distinct: the storage key, the schema, the init state, and an optional rehydrate hook), positional args become order-sensitive and unlabeled; an options bag makes every field self-documenting at the call site.
- Fix the latent `partialize` bug at the Google Drive store as a side effect of moving `partialize` to the call site.
- Make the timer store's user-defined rehydrate hook a flat `(state: TimerStore) => void` (`afterValidate` field) instead of zustand's curried `() => (state, error) => void` shape. The hook does not receive a rehydration error: if rehydration itself failed, validation is skipped, the store falls back to its factory initial state, and `afterValidate` does not fire (YAGNI — no current consumer observes rehydration errors).
- Preserve the type-safety intent of the existing "Persist configuration is statically type-checked" requirement: a misconfigured `name` / `storage` / `partialize` / `onRehydrateStorage` still fails to compile at the call site.

**Non-Goals:**

- No on-disk format change. The five localStorage keys and the JSON shape they contain are unchanged.
- No new test surface. Existing `store.test.ts` suites for all five stores should continue to pass with no edits.
- No rename of the four baseline stores' localStorage keys. The keys (`daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, `daybox-google-drive`) are unchanged.
- No change to the public barrels. `createValidatedRehydrate` is exported from the same module (`@/shared/utils/persistence`) and the call sites in the five stores stay internal to those features.
- No change to the `app/bootstrap.ts` migration code or to the export/import flow. Those rehydrate paths are independent of the helper.

## Decisions

### Decision 1: Helper returns only `OnRehydrateStorage<S>`, not a full `PersistOptions` object

**Choice.** Rename the export to `createValidatedRehydrate` and change its return type to zustand's `OnRehydrateStorage<S>`. The body is the same validation logic, lifted out of the `PersistOptions` wrapper.

**Why.** The current helper composes four fields but does work on only one. Returning the full options object forces the user through a `Pick<>`-selected input type and a `PersistOptions` return type, both of which leak zustand's option vocabulary into the helper's signature. A narrow return type is honest about what the helper does.

**Note on the type alias.** zustand 5 does not export an `OnRehydrateStorage<S>` symbol; the shape lives inline in `PersistOptions<S>['onRehydrateStorage']`. The helper declares and exports its own `OnRehydrateStorage<S> = NonNullable<PersistOptions<S>['onRehydrateStorage']>` alias so the spec language can refer to a named type and so the helper's signature is shorter to read at the call site. The alias is a thin wrapper around the underlying zustand shape; if zustand renames or restructures `PersistOptions` in a future version, the alias is the single point of fix-up.

**Alternatives considered.**

- _Keep the proxy and just stop dropping `partialize`._ Would fix the Google Drive bug but leaves the three "pure proxy" fields in place and the `storage ? { storage } : {}` dance. The bug fix is necessary but not sufficient — the proxy shape is the underlying smell.
- _Move all four fields to the call site but keep the helper name `createValidatedPersist`._ Name would lie about return type. Reject.
- _Return a small `ValidatedOptions` type that contains only the four fields the helper actually cares about (`name` for the warn message, `schema`, `init`, plus the user's rehydrate hook), and force the call site to merge with zustand's options._ Closer to a builder pattern; adds ceremony for marginal benefit over the plain function.

### Decision 2: Helper takes a single options-object argument

**Choice.** The helper signature is `createValidatedRehydrate<S>(options: ValidatedRehydrateOptions<S>): OnRehydrateStorage<S>`, where `ValidatedRehydrateOptions<S>` is an exported interface with fields `{ name: string; schema: ZodSchemaLike; init: Partial<S>; afterValidate?: (state: S) => void }`. There are no positional parameters.

**Why.** With four conceptually distinct fields (a string, a schema, a default-state object, and an optional hook), positional args become order-sensitive and unlabeled at the call site. A reader of `createValidatedRehydrate<TaskStore>('daybox-tasks', TaskStateSchema, taskInit)` has to remember which position is which. A reader of the options-bag form sees every field named. Adding a future field (e.g. a `version` key) becomes a non-breaking addition to the interface rather than a breaking change to a positional signature.

**Alternatives considered.**

- _Stay on four positional args._ The order is conventional (`name, schema, init, hook?`) and matches the call sites' mental model, but it does not self-document. The bag form is strictly more readable for the cost of one extra `{` and one extra `}` per call site. Reject.
- _Hybrid: required positional first arg (`name`), then an options bag for the rest._ Saves one string from the bag but breaks consistency (one positional + three named). Reject — pick a style and stick to it.
- _Destructure inline in the function signature._ Avoids declaring the interface but makes the signature hard to read and stops the options type from being exported for callers to reference. Reject.

### Decision 3: User's rehydrate hook is `(state: S) => void`, named `afterValidate`, with no error parameter

**Choice.** The optional `afterValidate` field on the helper's options object is a plain `(state: S) => void`. The helper internally produces the curried `() => (state, error) => void` shape zustand expects. `afterValidate` does NOT receive a rehydration error: if rehydration itself failed, the helper bails, validation is skipped, the store falls back to its factory initial state, and `afterValidate` does not fire.

**Why.** The timer store is the only consumer that passes a rehydrate hook. Its wall-clock-correction logic doesn't read `error` and doesn't need the curried outer form (zustand calls the inner closure with `(state, error)` at one fixed time). Flattening to `(state) => { … }` is a strict readability win. Naming the field `afterValidate` makes the firing condition explicit (post-validation, not pre-) and signals by omission that no error parameter is expected (YAGNI — no current consumer observes rehydration errors, and adding the param later is a one-line interface change).

**Alternatives considered.**

- _Keep the curried `() => (state) => void` shape at the call site to match zustand's vocabulary directly._ Forces the call site to remember zustand's internal two-phase calling convention for no benefit. Reject.
- _Name the field `onRehydrate` (closer to zustand's `onRehydrateStorage`)._ Sounds like it mirrors zustand's hook and could be read as "fires on rehydrate" without making clear that validation runs first. Reject in favor of `afterValidate`, which is more precise.
- _Take an error parameter: `afterValidate?: (state: S, error: unknown) => void`._ Strictly more capable. Adopted-by-union shape `(state, error?) => void` is a no-cost belt-and-suspenders, but every current consumer would just ignore `error`. YAGNI: keep the signature minimal, extend if a future consumer needs it.
- _Drop the user-hook field entirely and force the timer store to compose hooks externally (e.g. by chaining two `onRehydrateStorage` functions)._ Zustand's `persist` accepts a single `onRehydrateStorage` field; chaining outside requires manual wrapping. Adds code, not removes it. Reject.

### Decision 4: `name` field stays in the helper's options object, used only for the warn-message prefix

**Choice.** `name` remains a field on the helper's options object. The helper uses `name` only to format the `console.warn('[daybox] ${name}: persisted state invalid, …')` diagnostic. The same string is also set as `name: '…'` on the `persist` call-site options object.

**Why.** The warn message is the only place a real-world user sees this code fire, and "which store is broken?" is exactly the question they need answered. Duplicating the string in the helper and the call-site options is a small honest cost for the diagnostic.

**Alternatives considered.**

- _Drop `name` from the helper and emit a generic `'[daybox] persisted state invalid'` warn._ Saves one line of duplication at the cost of debuggability. Reject.
- _Read the storage key from `persist` after the fact._ Requires a closure over the options object, which the helper no longer has access to once `persist` is the consumer. Reject.

### Decision 5: `init` stays a field on the options object, not derived from the store's initial state

**Choice.** `init: Partial<S>` is a required field. The helper uses it to `Object.assign(state, init)` on validation failure.

**Why.** The four baseline stores and the Google Drive store all declare their `init` const at module top, separate from the store's full state (which mixes state and actions). The store factory `(set, get) => ({...})` would have to be re-invoked to get the state, which is wrong (it would also re-run actions). A separate `init` field is the right shape.

**Alternatives considered.**

- _Take a `() => Partial<S>` factory for `init` so it can be lazy-evaluated._ Overengineered; `init` is always a static object literal today. Reject.

### Decision 6: Defensive `storage ? { storage } : {}` spread is removed from the helper but the rule it encodes is preserved

**Choice.** The helper no longer touches `storage`. The rule "do not emit a `storage: undefined` field" is now enforced by _not having the helper write that field at all_ — the call site either sets `storage:` or omits the key.

**Why.** The defensive spread was a workaround for the helper's role as a passthrough. Once the helper stops being a passthrough, the workaround is no longer needed. The rule itself (a present-but-undefined `storage` clobbers zustand's default) is preserved at the call-site level by TypeScript's structural typing: omitting the field is the only way to "not set" it.

**Alternatives considered.**

- _Keep the defensive spread in case the helper ever needs to set `storage` for some reason._ Hypothetical; rejected.

## Risks / Trade-offs

- **[Risk] The five call sites get longer (one extra `{ name, onRehydrateStorage: … }` wrapper per store, plus one extra options-bag `{`/`}` for the helper call).** → Mitigation: this is the cost of removing the proxy and is the explicit point of the refactor. The added lines are zustand's own options vocabulary and named helper fields, not new configuration. The Google Drive store gets the same number of lines and a real bug fix. The options-bag form is self-documenting; the small size cost is paid for not having to remember positional order.

- **[Risk] The `name` string appears twice per store (once in `persist`'s `options.name`, once as the helper's first arg).** → Mitigation: the two are semantically different (storage key vs. warn-message prefix) even though they happen to be the same string today. The duplication is documented at the helper's signature and is enforced by `data-persistence`'s "Persist configuration is statically type-checked" requirement (a typo would surface as a `name` mismatch on the call site).

- **[Risk] Rename breaks consumers searching for the old name.** → Mitigation: the helper is used by exactly five files in the repo (`tasks/store.ts`, `groups/store.ts`, `planner/store.ts`, `timer/store.ts`, `google-drive/store.ts`). All five are updated in the same change. The OpenSpec specs are updated in the same change.

- **[Risk] Future contributors might try to add `storage` or `partialize` to the helper's input again, recreating the proxy.** → Mitigation: the new "Persist options other than onRehydrateStorage are owned by the call site" requirement in `data-persistence` codifies the rule, and the helper's TypeScript signature rejects those args structurally.

- **[Trade-off] The helper's `afterValidate` field is the only "extension point" in the helper. If a future store needs a different kind of wrap (e.g. analytics on rehydrate, or access to the rehydration error), the helper would need a new field.** → Acceptable: a single-purpose helper with one extension point is the goal. The options-bag shape makes future additions non-breaking (just append a field to the interface). Adding the second extension point when it is actually needed is cheaper than designing for hypothetical second consumers.

- **[Trade-off] Runtime behavior is unchanged, so the bug fix at the Google Drive store (runtime-only `status` / `error` no longer leak into localStorage) is invisible to existing tests.** → Acceptable: the fix is structural (the `partialize` field now reaches zustand), and the existing `google-drive/store.test.ts` suite continues to pass. A test that explicitly writes a runtime-only field, reloads, and asserts the rehydrated value equals the init value would be a useful follow-up but is out of scope for this refactor.

## Migration Plan

This is a same-deploy refactor: no on-disk format change, no version bump, no rollout step.

1. **Implement** the new `createValidatedRehydrate` helper in `src/shared/utils/persistence.ts`. Keep the old `createValidatedPersist` export alongside it for one commit (or remove in the same commit, since all five call sites are updated in the same change).
2. **Update** each of the five store files (`tasks`, `groups`, `planner`, `timer`, `google-drive`) to use the new helper at the new call site.
3. **Update** the two OpenSpec specs (`data-persistence`, `architecture`) to reference the new helper name and the new requirement.
4. **Run** the existing test suites — `tasks/store.test.ts`, `groups/store.test.ts`, `planner/store.test.ts`, `timer/store.test.ts`, `google-drive/store.test.ts` — and the project-wide `npm run typecheck`, `npm run lint`, `npm run test`.
5. **Run** the new spec scenario "A misconfigured persist option fails to compile" by writing a deliberately broken `name` / `storage` / `partialize` / `onRehydrateStorage` in a throwaway branch of one store, observing the compile error, and reverting. (Optional but cheap.)
6. **Archive** the change via `/opsx-archive refactor-validated-persist-helper` once `npm run typecheck && npm run lint && npm run test` all pass.

**Rollback.** Single revert of the change. No data migration is needed because the on-disk format and the localStorage keys are unchanged.

## Open Questions

- _Should the helper live at `@/shared/utils/persistence` (its current path) or move to `@/shared/lib/persistence` to match the older spec language?_ The current path is the active one and the spec language is descriptive only — the path is not normative. Keeping it where it is. No action needed.
- _Should the helper accept an optional `init` factory (`() => Partial<S>`) so that the four baseline stores can drop their separate `const XxxInit` constants?_ No, that would couple the helper to action types and is a larger refactor. Out of scope.
- _Should the Google Drive store's `partialize` bug be back-tested explicitly?_ Yes, this would be a one-line `it()` addition, but it is a follow-up rather than a blocker for this refactor.
- _Should `afterValidate` take an error parameter as belt-and-suspenders, accepting the union shape `(state, error?) => void`?_ YAGNI per Decision 3. Trivial one-line addition if a future consumer needs it. No action for this change.
