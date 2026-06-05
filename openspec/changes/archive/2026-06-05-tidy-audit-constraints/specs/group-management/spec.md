## ADDED Requirements

### Requirement: Default group identifier has a single canonical declaration

The string `'default'` is the identifier of the seeded "General" group and is the fallback used when a task references an unknown group. This string SHALL be declared exactly once, exported from `src/features/groups/store.ts` as `export const DEFAULT_GROUP_ID`, and re-exported from the `features/groups` barrel. No other file in `src/` SHALL declare `const DEFAULT_GROUP_ID` or hard-code the literal `'default'` as a group identifier in production code. Test fixtures and the import path's reference-reassignment default are exempt — they may use the literal because the _canonical declaration_ is the source of the value.

Consumers that need the default-group identifier SHALL import it from `@/features/groups`.

#### Scenario: A consumer imports the canonical default-group id

- **WHEN** `src/features/tasks/store.ts` needs the default group identifier
- **THEN** the file imports `DEFAULT_GROUP_ID` from `@/features/groups`
- **AND** the file does NOT declare its own `const DEFAULT_GROUP_ID`

#### Scenario: A component hard-codes the literal

- **WHEN** `src/features/groups/components/GroupSettingsPanel.tsx` reassigns tasks to the default group on group deletion
- **THEN** the code uses the imported `DEFAULT_GROUP_ID`, not the bare literal `'default'`

#### Scenario: A future change to the default-group id flows through one place

- **WHEN** the default-group identifier is changed from `'default'` to something else
- **THEN** the only edit required is the declaration in `src/features/groups/store.ts`
- **AND** every consumer that imports `DEFAULT_GROUP_ID` is updated by a typecheck + tsc error pointing at the import

### Requirement: Header does not render the group lens

The `App` shell SHALL NOT render the `<GroupLens />` component in the header. The header's right-side controls consist of the settings button only. The `GroupLens` component file (`src/features/groups/components/GroupLens.tsx`) is retained for future use; it is just not mounted in the current shell.

#### Scenario: The header has no group-lens dropdown

- **WHEN** the user opens the app
- **THEN** the header's right-side controls contain only the settings (gear) button
- **AND** no group-lens dropdown is visible
- **AND** no group-lens DOM node is mounted (verified by `document.querySelector` returning null)
