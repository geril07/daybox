# Shared Layer

## Purpose

Defines the boundary rules for `src/shared/` — what may live in the shared layer and what must live with its owning feature, test infrastructure, or other dedicated location. Complements the `shared-ui` spec (which governs `src/shared/ui/` component conventions) by covering the broader "no domain logic in shared" rule.

## Requirements

### Requirement: Shared layer contains no domain types

The system SHALL NOT export domain types (data shapes owned by a single feature, such as `Task`, `Group`, `TimerPhase`, or feature-scoped constants like `GROUP_COLORS`) from `src/shared/types.ts` or from any other file under `src/shared/`. Domain types SHALL live in the feature folder that owns them (`src/modules/<feature>/types.ts` for shapes, `src/modules/<feature>/constants.ts` for runtime values). Primitive UI components, pure utilities, and domain-agnostic infrastructure contracts MAY live in `src/shared/`.

Generic save-slice contracts MAY live in `src/shared/save-slice/` only when they do not import from `src/modules/*`, do not reference feature-owned types, and do not encode domain constants or defaults. This includes the `SaveSlice` type, `PrepareResult`, `MissingSliceStrategy`, `SliceMigration`, and the `SaveSliceMap` module augmentation interface in `save-slice/map.ts`. Feature save adapters SHALL provide their domain-specific type parameters and behavior at the module layer.

Domain-agnostic validation helpers for save slices MAY live in `src/shared/utils/save-helpers/` with a barrel `src/shared/utils/save-helpers/index.ts`. These helpers SHALL be generic (parameterized on `sliceName: string`) and SHALL NOT import from `src/modules/*`. The existing `src/shared/utils/persistence.ts` (zod-validated zustand rehydration) remains unchanged. The existing `src/shared/utils/download.ts` (file download) remains unchanged. The existing `src/shared/utils/debounced-storage.ts` (timer debounced localStorage) remains unchanged.

#### Scenario: No domain types in shared/types.ts

- **WHEN** a developer adds a new type to the codebase
- **THEN** the type is placed in the feature folder that owns the data
- **AND** the type is NOT exported from `src/shared/types.ts` or any file under `src/shared/`

#### Scenario: Domain constants live with their feature

- **WHEN** a feature needs a runtime constant (e.g., a list of color choices)
- **THEN** the constant is placed in `src/modules/<feature>/constants.ts`
- **AND** NOT in `src/shared/` or any `shared/` subfolder

#### Scenario: Shared save-slice contracts are domain-agnostic

- **WHEN** the generic save-slice contracts are defined in `src/shared/save-slice/`
- **THEN** they define only structural generic types such as `PrepareResult`, `MissingSliceStrategy`, `SaveSlice`, and `SliceMigration`
- **AND** the `save-slice/map.ts` file declares an empty `SaveSliceMap` interface for module augmentation — it contains no feature names or types
- **AND** they do NOT import from `src/modules/*`
- **AND** they do NOT mention feature-owned names such as task, group, timer, planner, default group, or group colors

#### Scenario: Shared save-slice helpers are domain-agnostic

- **WHEN** the shared save-slice validation helpers are defined in `src/shared/utils/save-helpers/`
- **THEN** `parseSliceInput` accepts a `sliceName: string` parameter (not hardcoded to any feature)
- **AND** `detectDuplicateId` accepts `sliceName: string` and `label: string` parameters
- **AND** neither helper imports from `src/modules/*`

### Requirement: SaveSliceMap interface enables type-safe postPrepare without import cycles

The system SHALL declare a `SaveSliceMap` interface in `src/shared/save-slice/map.ts` with an empty body (`export interface SaveSliceMap {}`). The interface exists solely at the type level (zero runtime code) and serves as the target for module augmentation by the data-portability registry. The `SaveSlice` contract's `postPrepare` callback SHALL default its `allSlices` parameter type to `SaveSliceMap`. This avoids import cycles: shared defines the empty interface, modules augment it, and no module imports from another module's internal path — only from shared.

#### Scenario: SaveSliceMap is an empty type-level interface

- **WHEN** a developer inspects `src/shared/save-slice/map.ts`
- **THEN** the file contains only `export interface SaveSliceMap {}`
- **AND** the file has no runtime imports, no zod schemas, no feature references
- **AND** the interface emits no JavaScript at build time

#### Scenario: Registry augments SaveSliceMap

- **WHEN** the data-portability registry imports `SaveSliceMap` and uses `declare module '@/shared/save-slice/map'`
- **THEN** it adds properties to `SaveSliceMap` for each registered slice name, typed as that slice's `TCurrent`
- **AND** the augmentation compiles without import cycle errors
- **AND** the augmentation produces no runtime code

### Requirement: Shared validation helpers reduce duplicated slice code

The system SHALL provide domain-agnostic validation helpers in `src/shared/utils/save-helpers/` that eliminate repeated patterns across feature save slices. The helpers SHALL NOT import from `src/modules/*` or reference feature-owned types.

#### Scenario: parseSliceInput wraps zod safeParse with error formatting

- **WHEN** a slice calls `parseSliceInput(sliceName, schema, input)`
- **THEN** it returns `{ ok: true, value }` on successful parse
- **AND** on failure it returns `{ ok: false, reason: "<sliceName>.<path>: <message>" }` using the first zod issue
- **AND** the slice does not manually extract zod issues and format error strings

#### Scenario: detectDuplicateId finds duplicate IDs in an array

- **WHEN** a slice calls `detectDuplicateId(items, getId, label, sliceName)`
- **THEN** it returns `null` if all IDs are unique
- **AND** it returns an error string of the form `"<sliceName>.<index>.id: Duplicate <label> id \"<id>\" (first at <sliceName>.<firstIndex>.id)"` if a duplicate is found
- **AND** the slice does not manually iterate with a `Map<string, number>` to detect duplicates

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
