## Purpose

Encode the structural rules that every feature in `src/modules/` must follow, and the small list of files allowed to reach across feature boundaries. Behavioural rules live in their owning capability (e.g. `task-management`, `pomodoro-timer`); this capability only governs the _shape_ of the codebase and the cross-feature wiring invariants.

## Requirements

### Requirement: One folder per domain under modules/

The system SHALL organize each domain (tasks, groups, timer, planner, and any future domain) as a single folder under `src/modules/<domain>/`. A typical feature folder contains the following entries, with each entry present when (and only when) the feature has a use for it:

- `store.ts` — the Zustand store, constructed with zustand's `persist` middleware whose options object includes `name` (set to the store's localStorage key) and `onRehydrateStorage` (set to the value returned by `createValidatedRehydrate` from `@/shared/utils/persistence` for that feature's schema and init state). Optional fields `storage` and `partialize` SHALL be set directly on the `persist` call-site options object, not passed through the helper. Omitted if the feature has no persisted runtime state (e.g. a stateless utility feature).
- `schema.ts` — the zod schemas that define the persisted and runtime shapes. Omitted if the feature has no zod validation.
- `types.ts` — `z.infer<typeof <Name>Schema>` exports. Omitted if there is no `schema.ts` to infer from, or the types are sourced entirely from elsewhere.
- `queries.ts` — pure selector functions and (when needed) small hooks that compose store reads. Omitted if the feature has no selectors of its own.
- `components/` — feature-internal React components. Omitted if the feature has no UI (e.g. a feature whose entire public surface is utility functions).
- `index.ts` — the barrel that re-exports the feature's public surface. **Always required** — it is the boundary through which other layers reach the feature.

The list above is a description of what a typical feature looks like, not a checklist. A feature SHALL include whichever of `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/` it needs, plus the always-required `index.ts`. The absence of an entry that the feature has no use for is not a violation.

Adding a new domain SHALL NOT require any edit to `AGENTS.md` or to this spec. The feature's behaviour is speced in its own capability file (e.g. `openspec/specs/<domain>/spec.md`).

#### Scenario: A full-shape feature matches the typical list

- **WHEN** a developer adds `src/modules/notes/` with `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, and `index.ts`
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

### Requirement: Intra-feature imports use relative paths

A file inside a feature folder SHALL import sibling modules via relative paths (`./TaskRow`, `../../store`, `../../types`, `../../schema`). The feature's own barrel `@/modules/<self>` SHALL NOT appear in any import statement inside that feature's folder, including in test files.

#### Scenario: A component imports its sibling via relative path

- **WHEN** `src/modules/tasks/components/TaskRow.tsx` imports `useTaskStore` and the `Task` type
- **THEN** the imports are `from '../../store'` and `from '../../types'`
- **AND** the imports are NOT `from '@/modules/tasks'` or `from '@/modules/tasks/store'`

#### Scenario: A test file follows the same rule

- **WHEN** `src/modules/tasks/components/TaskRow.test.tsx` imports `useTaskStore`
- **THEN** the import is `from '../../store'`
- **AND** the import is NOT `from '@/modules/tasks'`

### Requirement: Barrel re-export shape

The barrel `src/modules/<domain>/index.ts` SHALL re-export the following:

- The store hook (e.g. `useTaskStore`) from `./store`
- The types (e.g. `Task`, `Group`) from `./types`
- The schemas (e.g. `TaskSchema`, `GroupSchema`) from `./schema`
- The public components from `./components/<Name>`

Internal helpers (placeholder constructors, internal `*Meta` types, etc.) SHALL NOT be re-exported. A consumer of the feature imports from `@/modules/<domain>`, never from `@/modules/<domain>/<file>`.

#### Scenario: A consumer reads a type via the barrel

- **WHEN** `src/modules/tasks/components/AddTaskRow.tsx` needs the `Group` type from the groups feature
- **THEN** the import is `import type { Group } from '@/modules/groups'`
- **AND** the import is NOT `from '@/modules/groups/types'`

#### Scenario: A consumer reads a schema via the barrel

- **WHEN** a consumer outside `src/modules/tasks/` needs `TaskSchema`
- **THEN** the import is `from '@/modules/tasks'`
- **AND** the import is NOT `from '@/modules/tasks/schema'`

### Requirement: Cross-feature imports go through barrels

Any file under `src/modules/<domain>/` MAY import from another feature via that feature's public barrel (`@/modules/<other>`) and from `src/shared/`. A file SHALL NOT import a sibling feature's internals (`@/modules/<other>/store`, `@/modules/<other>/schema`, `@/modules/<other>/components/<Name>`, etc.). The barrel is the only allowed entry point to a foreign feature.

A foreign store action is invoked through the foreign barrel's public hook (`useFooStore.getState().publicAction(...)`) and the invocation is allowed from any feature; foreign state is never mutated by a foreign feature's component. This invariant is unchanged from the previous wording of this requirement.

#### Scenario: An aggregate feature imports from many features

- **WHEN** `src/modules/data-portability/build.ts` and `src/modules/data-portability/import.ts` read from the groups, tasks, timer, and planner stores
- **THEN** every import is `from '@/modules/<domain>'` (the barrel)
- **AND** no import path is `from '@/modules/<domain>/store'`, `from '@/modules/<domain>/schema'`, or any other internal file

#### Scenario: A feature component reads foreign state via the barrel

- **WHEN** `src/modules/timer/components/TimerBar.tsx` reads the focused task from `useTaskStore`
- **THEN** the import is `from '@/modules/tasks'` (the barrel)
- **AND** the call site does NOT import `useTaskStore` from `@/modules/tasks/store`

#### Scenario: A component calls a foreign store action directly

- **WHEN** `src/modules/groups/components/GroupSettingsPanel.tsx` deletes tasks as part of group deletion
- **THEN** it invokes the tasks feature's `deleteTask` / `updateTask` action via `useTaskStore.getState()` reached through the barrel
- **AND** it does NOT mutate task state from inside the group feature's store
- **AND** it does NOT call a `modules/groups` action that mutates `features/tasks` state internally — that mutation lives in the tasks feature's store

### Requirement: DEFAULT_GROUP_ID is canonical

The string identifier for the default group (`'default'`) SHALL be declared exactly once, exported from `src/modules/groups/`, and re-exported via the `modules/groups` barrel. No other file SHALL declare `const DEFAULT_GROUP_ID = 'default'` or hard-code the string literal `'default'` as a group identifier in source code. Test fixtures and export/import defaults are exempt (they may use the literal because the canonical declaration is the _source_ of the value).

#### Scenario: A consumer imports the canonical default-group id

- **WHEN** `src/modules/tasks/store.ts` needs the default group identifier
- **THEN** the import is `import { DEFAULT_GROUP_ID } from '@/modules/groups'`
- **AND** the file does NOT declare its own `const DEFAULT_GROUP_ID`

#### Scenario: A consumer hard-codes the literal

- **WHEN** a developer writes `groupId: 'default'` in `src/modules/groups/components/GroupSettingsPanel.tsx`
- **THEN** this is a violation
- **AND** the literal SHALL be replaced with the imported `DEFAULT_GROUP_ID`

#### Scenario: Test fixtures and migration defaults are exempt

- **WHEN** a test file, an export schema, or a migration default uses the literal `'default'`
- **THEN** the literal is permitted because the canonical _declaration_ is exported and any future change to the default-group id flows through the export, not through hard-coded fixtures

### Requirement: Dependency direction is layered

The codebase has three layers — `src/shared/`, `src/modules/<domain>/`, `src/app/` — with these import rules:

- **`src/shared/` is the leaf layer.** It MAY import from its own siblings (other files in `src/shared/`). It SHALL NOT import from `src/app/` or `src/modules/`. External package imports (e.g. `react`, `zod`, `zustand/middleware`) are allowed and do not count as upward dependencies.
- **`src/modules/<domain>/` is the middle layer.** It MAY import from `src/shared/` and from another feature's barrel. It SHALL NOT import from `src/app/`. It SHALL NOT import a foreign feature's internals.
- **`src/app/` is the top layer.** It MAY import from `src/shared/`, from any feature's barrel, and from siblings under `src/app/`. It exists for cross-cutting orchestration: app composition and view-state plumbing.

The cross-feature rule is stated in the "Cross-feature imports go through barrels" requirement; this requirement is the general layered principle that the cross-feature rule is a special case of.

#### Scenario: A shared utility stays leaf-level

- **WHEN** `src/shared/utils/dates.ts` needs a date-formatting helper
- **THEN** it imports from a sibling file inside `src/shared/`
- **AND** it does NOT import from `src/modules/*` or `src/app/*`

#### Scenario: A feature uses a shared utility and another feature's barrel

- **WHEN** `src/modules/google-drive/store.ts` needs the snapshot helpers and the task store's current state
- **THEN** it imports the snapshot helpers from `@/modules/data-portability` (the barrel)
- **AND** it imports `useTaskStore` from `@/modules/tasks` (the barrel)
- **AND** it does NOT import from `@/app/*`
- **AND** it does NOT import from `@/modules/data-portability/build` or any other internal file

#### Scenario: An app file composes many features

- **WHEN** `src/app/shell/SettingsDrawer.tsx` renders panels from multiple features
- **THEN** it imports each panel from the feature's barrel
- **AND** it does NOT import from `@/modules/<domain>/store` directly

#### Scenario: A shared utility coordinates multiple stores through parameterisation

- **WHEN** a utility in `src/shared/utils/` needs to read from one store and write to another
- **THEN** the utility's signature takes a structural `StoreAccessors` interface (or equivalent) as a parameter
- **AND** the utility is generic over the type parameters the caller provides
- **AND** the utility does not import from `src/modules/*` — the caller is responsible for wiring up the accessors using the features' public `getState()` and `setState()` methods

#### Scenario: A feature would otherwise be tempted to import from app/

- **WHEN** a feature would naturally want a helper that currently lives in `src/app/*`
- **THEN** the helper is moved to `src/shared/` (parameterised if it needs feature-specific behaviour) before the feature uses it
- **AND** the feature does NOT import from `src/app/*` under any circumstance
