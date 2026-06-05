## Purpose

Encode the structural rules that every feature in `src/features/` must follow, and the small list of files allowed to reach across feature boundaries. Behavioural rules live in their owning capability (e.g. `task-management`, `pomodoro-timer`); this capability only governs the _shape_ of the codebase and the cross-feature wiring invariants.

## Requirements

### Requirement: One folder per domain under features/

The system SHALL organize each domain (tasks, groups, timer, planner, and any future domain) as a single folder under `src/features/<domain>/`. Each feature folder SHALL contain the following entries:

- `store.ts` — the Zustand store, constructed with `createValidatedPersist`
- `schema.ts` — the zod schemas that define the persisted and runtime shapes
- `types.ts` — `z.infer<typeof <Name>Schema>` exports
- `queries.ts` — pure selector functions and (when needed) small hooks that compose `useTaskStore`/`usePlannerStore` reads
- `components/` — feature-internal React components
- `index.ts` — the barrel that re-exports the feature's public surface

Adding a new domain SHALL NOT require any edit to `AGENTS.md` or to this spec. The feature's behaviour is speced in its own capability file (e.g. `openspec/specs/<domain>/spec.md`).

#### Scenario: A new domain is added

- **WHEN** a developer adds `src/features/notes/` with the six entries above and a barrel
- **THEN** no edit to `AGENTS.md` is required
- **AND** no edit to this spec is required
- **AND** the new feature's behaviour is speced in `openspec/specs/notes/spec.md`

#### Scenario: A feature folder is missing a required entry

- **WHEN** a feature folder lacks `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, or `index.ts`
- **THEN** the missing entry is a violation of this requirement
- **AND** the feature SHALL be brought into compliance rather than exempted

### Requirement: Intra-feature imports use relative paths

A file inside a feature folder SHALL import sibling modules via relative paths (`./TaskRow`, `../../store`, `../../types`, `../../schema`). The feature's own barrel `@/features/<self>` SHALL NOT appear in any import statement inside that feature's folder, including in test files.

#### Scenario: A component imports its sibling via relative path

- **WHEN** `src/features/tasks/components/TaskRow.tsx` imports `useTaskStore` and the `Task` type
- **THEN** the imports are `from '../../store'` and `from '../../types'`
- **AND** the imports are NOT `from '@/features/tasks'` or `from '@/features/tasks/store'`

#### Scenario: A test file follows the same rule

- **WHEN** `src/features/tasks/components/TaskRow.test.tsx` imports `useTaskStore`
- **THEN** the import is `from '../../store'`
- **AND** the import is NOT `from '@/features/tasks'`

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

- **WHEN** `src/app/bootstrap.ts` needs `TaskSchema` and `GroupSchema`
- **THEN** the import is `from '@/features/tasks'` and `from '@/features/groups'` (or a combined import)
- **AND** the import is NOT `from '@/features/tasks/schema'` or `from '@/features/groups/schema'`

### Requirement: Cross-cutting imports are exceptional

The system SHALL restrict cross-feature imports to a small allowlist. The only files allowed to import from more than one feature are:

- `src/app/bootstrap.ts` — export, import, and legacy migration
- `src/app/App.tsx` — view state, keyboard shortcuts, and migration mount
- `src/app/shell/` — UI shell composition (only when composing panels from multiple features)

Every other file SHALL import from at most one `src/features/<domain>/` path, and that import is the barrel.

Components in `src/features/<a>/` SHALL NOT import from `src/features/<b>/` directly. When feature `<a>` needs to react to a change in feature `<b>`'s state, the cross-feature call is made through feature `<b>`'s public actions (reached via the barrel), and the _invocation_ lives inside feature `<b>`'s store action (not in feature `<a>`'s component).

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

### Requirement: DEFAULT_GROUP_ID is canonical

The string identifier for the default group (`'default'`) SHALL be declared exactly once, exported from `src/features/groups/`, and re-exported via the `features/groups` barrel. No other file SHALL declare `const DEFAULT_GROUP_ID = 'default'` or hard-code the string literal `'default'` as a group identifier in source code. Test fixtures and export/import defaults are exempt (they may use the literal because the canonical declaration is the _source_ of the value).

#### Scenario: A consumer imports the canonical default-group id

- **WHEN** `src/features/tasks/store.ts` needs the default group identifier
- **THEN** the import is `import { DEFAULT_GROUP_ID } from '@/features/groups'`
- **AND** the file does NOT declare its own `const DEFAULT_GROUP_ID`

#### Scenario: A consumer hard-codes the literal

- **WHEN** a developer writes `groupId: 'default'` in `src/features/groups/components/GroupSettingsPanel.tsx`
- **THEN** this is a violation
- **AND** the literal SHALL be replaced with the imported `DEFAULT_GROUP_ID`

#### Scenario: Test fixtures and migration defaults are exempt

- **WHEN** a test file, an export schema, or a migration default uses the literal `'default'`
- **THEN** the literal is permitted because the canonical _declaration_ is exported and any future change to the default-group id flows through the export, not through hard-coded fixtures
