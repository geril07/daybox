## MODIFIED Requirements

### Requirement: Barrel re-export shape

The barrel `src/features/<domain>/index.ts` SHALL re-export the following:

- The store hook (e.g. `useTaskStore`) from `./store`
- The types (e.g. `Task`, `Group`) from `./types`
- The schemas (e.g. `TaskSchema`, `GroupSchema`) from `./schema`
- The public components from `./components/<Name>`

Internal helpers (placeholder constructors, internal `*Meta` types, etc.) SHALL NOT be re-exported. A consumer of the feature imports from `@/features/<domain>`, never from `@/features/<domain>/<file>`.

#### Scenario: A consumer reads a type via the barrel

- **WHEN** `src/features/tasks/components/AddTaskRow.tsx` needs the `Group` type from the groups feature
- **THEN** the import is `import type { Group } from '@/features/groups'`
- **AND** the import is NOT `from '@/features/groups/types'`

#### Scenario: A consumer reads a schema via the barrel

- **WHEN** a consumer outside `src/features/tasks/` needs `TaskSchema`
- **THEN** the import is `from '@/features/tasks'`
- **AND** the import is NOT `from '@/features/tasks/schema'`

### Requirement: Dependency direction is layered

The codebase has three layers — `src/shared/`, `src/features/<domain>/`, `src/app/` — with these import rules:

- **`src/shared/` is the leaf layer.** It MAY import from its own siblings (other files in `src/shared/`). It SHALL NOT import from `src/app/` or `src/features/`. External package imports (e.g. `react`, `zod`, `zustand/middleware`) are allowed and do not count as upward dependencies.
- **`src/features/<domain>/` is the middle layer.** It MAY import from `src/shared/` and from another feature's barrel. It SHALL NOT import from `src/app/`. It SHALL NOT import a foreign feature's internals.
- **`src/app/` is the top layer.** It MAY import from `src/shared/`, from any feature's barrel, and from siblings under `src/app/`. It exists for cross-cutting orchestration: app composition and view-state plumbing.

The cross-feature rule is stated in the "Cross-feature imports go through barrels" requirement; this requirement is the general layered principle that the cross-feature rule is a special case of.

#### Scenario: A shared utility stays leaf-level

- **WHEN** `src/shared/utils/dates.ts` needs a date-formatting helper
- **THEN** it imports from a sibling file inside `src/shared/`
- **AND** it does NOT import from `src/features/*` or `src/app/*`

#### Scenario: A feature uses a shared utility and another feature's barrel

- **WHEN** `src/features/google-drive/store.ts` needs the snapshot helpers and the task store's current state
- **THEN** it imports the snapshot helpers from `@/features/data-portability` (the barrel)
- **AND** it imports `useTaskStore` from `@/features/tasks` (the barrel)
- **AND** it does NOT import from `@/app/*`
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
