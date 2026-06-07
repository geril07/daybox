## MODIFIED Requirements

### Requirement: One folder per domain under features/

The system SHALL organize each domain (tasks, groups, timer, planner, and any future domain) as a single folder under `src/features/<domain>/`. A typical feature folder contains the following entries, with each entry present when (and only when) the feature has a use for it:

- `store.ts` — the Zustand store, constructed with zustand's `persist` middleware whose options object includes `name` (set to the store's localStorage key) and `onRehydrateStorage` (set to the value returned by `createValidatedRehydrate` from `@/shared/utils/persistence` for that feature's schema and init state). Optional fields `storage` and `partialize` SHALL be set directly on the `persist` call-site options object, not passed through the helper. Omitted if the feature has no persisted runtime state (e.g. a stateless utility feature).
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
