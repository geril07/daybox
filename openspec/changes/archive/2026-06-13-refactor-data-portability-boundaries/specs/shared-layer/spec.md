## MODIFIED Requirements

### Requirement: Shared layer contains no domain types

The system SHALL NOT export domain types (data shapes owned by a single feature, such as `Task`, `Group`, `TimerPhase`, or feature-scoped constants like `GROUP_COLORS`) from `src/shared/types.ts` or from any other file under `src/shared/`. Domain types SHALL live in the feature folder that owns them (`src/modules/<feature>/types.ts` for shapes, `src/modules/<feature>/constants.ts` for runtime values). Primitive UI components, pure utilities, and domain-agnostic infrastructure contracts MAY live in `src/shared/`.

Generic save-slice contracts MAY live in `src/shared/save-slice/` only when they do not import from `src/modules/*`, do not reference feature-owned types, and do not encode domain constants or defaults. Feature save adapters SHALL provide their domain-specific type parameters and behavior at the module layer.

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
- **THEN** they define only structural generic types such as save-slice preparation result, missing-slice strategy, and save-slice shape
- **AND** they do NOT import from `src/modules/*`
- **AND** they do NOT mention feature-owned names such as task, group, timer, planner, default group, or group colors
