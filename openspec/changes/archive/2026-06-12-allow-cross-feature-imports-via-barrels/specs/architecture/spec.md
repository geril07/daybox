## MODIFIED Requirements

### Requirement: Cross-feature imports go through barrels

Any file under `src/features/<domain>/` MAY import from another feature via that feature's public barrel (`@/features/<other>`) and from `src/shared/`. A file SHALL NOT import a sibling feature's internals (`@/features/<other>/store`, `@/features/<other>/schema`, `@/features/<other>/components/<Name>`, etc.). The barrel is the only allowed entry point to a foreign feature.

A foreign store action is invoked through the foreign barrel's public hook (`useFooStore.getState().publicAction(...)`) and the invocation is allowed from any feature; foreign state is never mutated by a foreign feature's component. This invariant is unchanged from the previous wording of this requirement.

#### Scenario: An aggregate feature imports from many features

- **WHEN** `src/features/data-portability/build.ts` and `src/features/data-portability/import.ts` read from the groups, tasks, timer, and planner stores
- **THEN** every import is `from '@/features/<domain>'` (the barrel)
- **AND** no import path is `from '@/features/<domain>/store'`, `from '@/features/<domain>/schema'`, or any other internal file

#### Scenario: A feature component reads foreign state via the barrel

- **WHEN** `src/features/timer/components/TimerBar.tsx` reads the focused task from `useTaskStore`
- **THEN** the import is `from '@/features/tasks'` (the barrel)
- **AND** the call site does NOT import `useTaskStore` from `@/features/tasks/store`

#### Scenario: A component calls a foreign store action directly

- **WHEN** `src/features/groups/components/GroupSettingsPanel.tsx` deletes tasks as part of group deletion
- **THEN** it invokes the tasks feature's `deleteTask` / `updateTask` action via `useTaskStore.getState()` reached through the barrel
- **AND** it does NOT mutate task state from inside the group feature's store
- **AND** it does NOT call a `features/groups` action that mutates `features/tasks` state internally — that mutation lives in the tasks feature's store

### Requirement: Dependency direction is layered

The codebase has three layers — `src/shared/`, `src/features/<domain>/`, `src/app/` — with these import rules:

- **`src/shared/` is the leaf layer.** It MAY import from its own siblings (other files in `src/shared/`). It SHALL NOT import from `src/app/` or `src/features/`. External package imports (e.g. `react`, `zod`, `zustand/middleware`) are allowed and do not count as upward dependencies.
- **`src/features/<domain>/` is the middle layer.** It MAY import from `src/shared/` and from another feature's barrel. It SHALL NOT import from `src/app/`. It SHALL NOT import a foreign feature's internals.
- **`src/app/` is the top layer.** It MAY import from `src/shared/`, from any feature's barrel, and from siblings under `src/app/`. It exists for cross-cutting orchestration: legacy migrations, app composition, view-state plumbing.

The cross-feature rule is stated in the "Cross-feature imports go through barrels" requirement; this requirement is the general layered principle that the cross-feature rule is a special case of.

#### Scenario: A shared utility stays leaf-level

- **WHEN** `src/shared/utils/dates.ts` needs a date-formatting helper
- **THEN** it imports from a sibling file inside `src/shared/`
- **AND** it does NOT import from `src/features/*` or `src/app/*`

#### Scenario: A feature uses a shared utility and another feature's barrel

- **WHEN** `src/features/google-drive/store.ts` needs the snapshot helpers and the task store's current state
- **THEN** it imports the snapshot helpers from `@/features/data-portability` (the barrel)
- **AND** it imports `useTaskStore` from `@/features/tasks` (the barrel)
- **AND** it does NOT import from `@/app/bootstrap` or any other `src/app/*` file
- **AND** it does NOT import from `@/features/data-portability/build` or any other internal file

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
