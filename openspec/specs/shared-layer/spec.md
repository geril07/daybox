# Shared Layer

## Purpose

Defines the boundary rules for `src/shared/` — what may live in the shared layer and what must live with its owning feature, test infrastructure, or other dedicated location. Complements the `shared-ui` spec (which governs `src/shared/ui/` component conventions) by covering the broader "no domain logic in shared" rule.

## Requirements

### Requirement: Shared layer contains no domain types

The system SHALL NOT export domain types (data shapes owned by a single feature, such as `Task`, `Group`, `TimerPhase`, or feature-scoped constants like `GROUP_COLORS`) from `src/shared/types.ts` or from any other file under `src/shared/`. Domain types SHALL live in the feature folder that owns them (`src/features/<feature>/types.ts` for shapes, `src/features/<feature>/constants.ts` for runtime values). Primitive UI components and pure utilities (e.g., `cn`, `formatDate`) MAY live in `src/shared/`.

#### Scenario: No domain types in shared/types.ts

- **WHEN** a developer adds a new type to the codebase
- **THEN** the type is placed in the feature folder that owns the data
- **AND** the type is NOT exported from `src/shared/types.ts` or any file under `src/shared/`

#### Scenario: Domain constants live with their feature

- **WHEN** a feature needs a runtime constant (e.g., a list of color choices)
- **THEN** the constant is placed in `src/features/<feature>/constants.ts`
- **AND** NOT in `src/shared/` or any `shared/` subfolder

### Requirement: Shared UI primitives live in shared/ui/

All shared, layout-neutral UI components SHALL live in `src/shared/ui/` and SHALL be importable from the `@/shared/ui` barrel. The `src/shared/EmptyState.tsx` pattern of placing a UI primitive directly in `src/shared/` is NOT allowed.

#### Scenario: Adding a new shared UI component

- **WHEN** a developer needs a shared, layout-neutral UI component
- **THEN** the component file is placed in `src/shared/ui/<Component>.tsx`
- **AND** it is re-exported from `src/shared/ui/index.ts`

### Requirement: Shared module folders are folder-per-module

Every shared utility SHALL live in its own folder under `src/shared/` with a barrel `index.ts` that re-exports the module's public API. No standalone source files sit directly in `src/shared/`.

#### Scenario: No top-level files in shared/

- **WHEN** listing entries directly under `src/shared/`
- **THEN** only folders are present — one folder per utility module (`dates/`, `id/`, `keyboard/`, `notifications/`, plus `lib/` and `ui/`)
- **AND** each module folder contains the implementation file (e.g., `dates/dates.ts`) plus a barrel `index.ts` that re-exports its public API
- **AND** the test file sits next to its source inside the same module folder (e.g., `dates/dates.test.ts`)
- **AND** consumers import via the module folder path: `@/shared/dates`, `@/shared/id`, etc.

### Requirement: Test infrastructure lives in app/ or a dedicated test folder

Test setup files (Vitest setupFiles and similar) SHALL NOT live in `src/shared/`. They belong in `src/app/test-setup.ts` (when shell-level) or in a dedicated test configuration folder.

#### Scenario: Locating the ResizeObserver stub

- **WHEN** a developer searches for the ResizeObserver test stub
- **THEN** the file is found at `src/app/test-setup.ts`
- **AND** `vite.config.ts` references it via `setupFiles: ['./src/app/test-setup.ts']`
