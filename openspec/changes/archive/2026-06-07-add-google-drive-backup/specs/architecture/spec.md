## MODIFIED Requirements

### Requirement: One folder per domain under features/

The system SHALL organize each domain (tasks, groups, timer, planner, and any future domain) as a single folder under `src/features/<domain>/`. A typical feature folder contains the following entries, with each entry present when (and only when) the feature has a use for it:

- `store.ts` — the Zustand store, constructed with `createValidatedPersist`. Omitted if the feature has no persisted runtime state (e.g. a stateless utility feature).
- `schema.ts` — the zod schemas that define the persisted and runtime shapes. Omitted if the feature has no zod validation.
- `types.ts` — `z.infer<typeof <Name>Schema>` exports. Omitted if there is no `schema.ts` to infer from, or the types are sourced entirely from elsewhere.
- `queries.ts` — pure selector functions and (when needed) small hooks that compose store reads. Omitted if the feature has no selectors of its own.
- `components/` — feature-internal React components. Omitted if the feature has no UI (e.g. a feature whose entire public surface is utility functions).
- `index.ts` — the barrel that re-exports the feature's public surface. **Always required** — it is the boundary through which other layers reach the feature.

The list above is a description of what a typical feature looks like, not a checklist. A feature SHALL include whichever of `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/` it needs, plus the always-required `index.ts`. The absence of an entry that the feature has no use for is not a violation.

Adding a new domain SHALL NOT require any edit to `AGENTS.md` or to this spec. The feature's behaviour is speced in its own capability file (e.g. `openspec/specs/<domain>/spec.md`).

#### Scenario: A full-shape feature matches the typical list

- **WHEN** a developer adds `src/features/notes/` with `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, and `index.ts`
- **THEN** no edit to `AGENTS.md` is required
- **AND** no edit to this spec is required
- **AND** the new feature's behaviour is speced in `openspec/specs/notes/spec.md`

#### Scenario: A leaner feature omits the files it does not need

- **WHEN** a feature needs no persisted state, no zod validation, and no UI — for example a feature whose only public surface is pure utility functions
- **THEN** the feature folder contains `index.ts` (the always-required barrel) and any other files from the typical list that the feature actually uses
- **AND** the absence of `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, or `components/` is permitted when the feature has no use for the omitted entry
- **AND** the feature does NOT contain placeholder `store.ts` or empty `components/` directories created solely to satisfy a checklist

#### Scenario: A feature with no UI omits components/

- **WHEN** a feature exposes only functions and types through its barrel and renders nothing itself
- **THEN** the feature folder has no `components/` subdirectory
- **AND** this is not a violation

### Requirement: Cross-cutting imports are exceptional

The system SHALL restrict cross-feature imports to a small allowlist. The only files allowed to import from more than one feature are:

- `src/app/bootstrap.ts` — legacy migrations
- `src/app/App.tsx` — view state, keyboard shortcuts, and migration mount
- `src/app/shell/` — UI shell composition (only when composing panels from multiple features)

Every other file SHALL import from at most one `src/features/<domain>/` path, and that import is the barrel.

Components in `src/features/<a>/` SHALL NOT import from `src/features/<b>/` directly. When feature `<a>` needs to react to a change in feature `<b>`'s state, the cross-feature call is made through feature `<b>`'s public actions (reached via the barrel), and the _invocation_ lives inside feature `<b>`'s store action (not in feature `<a>`'s component).

This rule is the operational form of the "Dependency direction is layered" requirement. The three files on the allowlist are the operational exceptions that the layered rule allows for the top layer (`src/app/`); every other file follows the strict downward direction.

#### Scenario: A cross-cutting file composes multiple features

- **WHEN** `src/app/App.tsx` renders `<TimerBar />` from `features/timer` and `<AddTaskRow />` from `features/tasks`
- **THEN** both imports come from their respective barrels
- **AND** `App.tsx` is on the allowlist above

#### Scenario: A feature component reaches across features

- **WHEN** `src/features/timer/components/TimerBar.tsx` reads the focused task from `useTaskStore`
- **THEN** the import is `from '@/features/tasks'` (the barrel)
- **AND** the call site does NOT import `useTaskStore` from `@/features/tasks/store`

#### Scenario: A component calls a foreign store action directly

- **WHEN** `src/features/groups/components/GroupSettingsPanel.tsx` deletes tasks as part of group deletion
- **THEN** it invokes the tasks feature's `deleteTask` / `updateTask` action via `useTaskStore.getState()`
- **AND** it does NOT mutate task state from inside the group feature's store
- **AND** it does NOT call a `features/groups` action that mutates `features/tasks` state internally — that mutation lives in the tasks feature's store

#### Scenario: A shared utility hosts cross-cutting orchestration through parameterisation

- **WHEN** a cross-cutting utility in `src/shared/utils/` (for example, the snapshot/restore helpers in `export-import.ts`) needs to read and write store state
- **THEN** the utility exposes its functionality through generic type parameters and structural interfaces (e.g. `StoreAccessors<T, G, S, P>`, `RecordSchemas<T, G, S, P, Th>`)
- **AND** the utility does NOT import from `src/features/*` or `src/app/*` — the callers (in `src/app/*` and in `src/features/*`) build the accessors and pass them in
- **AND** this is the only way a shared utility is allowed to coordinate multiple stores

## ADDED Requirements

### Requirement: Dependency direction is layered

The codebase has three layers — `src/shared/`, `src/features/<domain>/`, `src/app/` — with these import rules:

- **`src/shared/` is the leaf layer.** It MAY import from its own siblings (other files in `src/shared/`). It SHALL NOT import from `src/app/` or `src/features/`. External package imports (e.g. `react`, `zod`, `zustand/middleware`) are allowed and do not count as upward dependencies.
- **`src/features/<domain>/` is the middle layer.** It MAY import from `src/shared/` and from another feature's barrel (for that feature's public store actions only). It SHALL NOT import from `src/app/`.
- **`src/app/` is the top layer.** It MAY import from `src/shared/`, from any feature's barrel, and from siblings under `src/app/`. It exists for cross-cutting orchestration: legacy migrations, app composition, view-state plumbing.

The rule for cross-feature imports is stated in the "Cross-cutting imports are exceptional" requirement; this requirement is the general layered principle that the cross-cutting rule is a special case of.

#### Scenario: A shared utility stays leaf-level

- **WHEN** `src/shared/utils/dates.ts` needs a date-formatting helper
- **THEN** it imports from a sibling file inside `src/shared/`
- **AND** it does NOT import from `src/features/*` or `src/app/*`

#### Scenario: A feature uses a shared utility and another feature's barrel

- **WHEN** `src/features/google-drive/store.ts` needs the snapshot helpers and the task store's current state
- **THEN** it imports the snapshot helpers from `@/shared/utils/export-import`
- **AND** it imports `useTaskStore` from `@/features/tasks` (the barrel)
- **AND** it does NOT import from `@/app/bootstrap` or any other `src/app/*` file

#### Scenario: An app file composes many features

- **WHEN** `src/app/shell/SettingsDrawer.tsx` renders panels from multiple features
- **THEN** it imports each panel from the feature's barrel
- **AND** it does NOT import from `@/features/<domain>/store` directly

#### Scenario: A shared utility coordinates multiple stores through parameterisation

- **WHEN** a utility in `src/shared/utils/` needs to read from one store and write to another
- **THEN** the utility's signature takes a structural `StoreAccessors` interface (or equivalent) as a parameter
- **AND** the utility is generic over the type parameters the caller provides
- **AND** the utility does not import from `src/features/*` — the caller is responsible for wiring up the accessors using the features' public `getState()` and `setState()` methods

#### Scenario: A feature would otherwise be tempted to import from app/

- **WHEN** a feature would naturally want a helper that currently lives in `src/app/*`
- **THEN** the helper is moved to `src/shared/` (parameterised if it needs feature-specific behaviour) before the feature uses it
- **AND** the feature does NOT import from `src/app/*` under any circumstance
