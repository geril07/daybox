## Purpose

Define the validation policy and shape conventions for the data layer: schema-first types, per-layer policy routing for `safeParse` failures, and shared persistence rehydration safety. This capability is the contract that the `data-persistence` and per-feature specs build on.

## Requirements

### Requirement: Schema-first type definitions

The system SHALL define each persisted shape once as a zod schema co-located with the owning feature (`features/<feature>/schema.ts`). The corresponding `types.ts` SHALL re-export the shape as `export type <Name> = z.infer<typeof <Name>Schema>`. Interfaces SHALL NOT be used for shapes that also have a runtime representation.

#### Scenario: Task type is derived from TaskSchema

- **WHEN** a developer reads `features/tasks/types.ts`
- **THEN** it exports `Task` as `z.infer<typeof TaskSchema>` and not as a hand-written `interface`

#### Scenario: Group type is derived from GroupSchema

- **WHEN** a developer reads `features/groups/types.ts`
- **THEN** it exports `Group` as `z.infer<typeof GroupSchema>` and not as a hand-written `interface`

#### Scenario: TimerSettings type is derived from TimerSettingsSchema

- **WHEN** a developer reads `features/timer/store.ts`
- **THEN** `TimerSettings` is `z.infer<typeof TimerSettingsSchema>`

#### Scenario: PlannerState type is derived from PlannerStateSchema

- **WHEN** a developer reads `features/planner/store.ts`
- **THEN** the persisted state type is `z.infer<typeof PlannerStateSchema>`

### Requirement: Per-layer validation policy

The system SHALL route `safeParse` failures through one of five layers, each with an explicit policy:

| Layer     | Trigger                                                         | Policy                                                          |
| --------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| envelope  | Top-level shape (version present, object root, required arrays) | hard fail: return `{ success: false, error }`                   |
| record    | Per-row shape (Task, Group)                                     | warn + skip: append reason to `warnings[]`, drop the row        |
| reference | Cross-row pointers (task.groupId → group.id)                    | warn + reassign to default group, append reason to `warnings[]` |
| optional  | Optional / derived fields (browseDate, theme, alarmVolume)      | coerce to schema default                                        |
| rehydrate | zustand persist rehydration on app load                         | reset affected store to initial state, log `console.warn` once  |

A single helper `safeParseAndRoute({ value, schema, layer })` SHALL implement the routing. The policy table SHALL be encoded in that helper, not duplicated at call sites.

#### Scenario: Envelope failure hard-fails the import

- **WHEN** `parseImport` receives a JSON file missing the `version` field
- **THEN** the result is `{ success: false, error: 'Not a DayBox export file.' }`

#### Scenario: Record failure is reported as a warning

- **WHEN** `parseImport` receives a v3 export where one task is missing its `id` field
- **THEN** the result is `{ success: true, warnings: [...], data: { tasks: [<valid tasks>], ... } }`
- **AND** the warnings array includes a reason identifying the dropped task

#### Scenario: Reference failure reassigns to the default group

- **WHEN** `parseImport` receives an export where a task's `groupId` does not match any group
- **THEN** the task is imported with `groupId: 'default'`
- **AND** the warnings array notes the dangling reference

#### Scenario: Optional field invalid coerces to default

- **WHEN** `parseImport` receives an export with `theme: 'sepia'`
- **THEN** the imported theme is `'light'`
- **AND** no warning is added (the optional-field layer is silent)

#### Scenario: Rehydration failure resets the affected store

- **WHEN** the app loads and `localStorage.getItem('daybox-tasks')` contains a blob that fails `TaskSchema`
- **THEN** the task store is initialized to its empty default
- **AND** a `console.warn` is emitted once

#### Scenario: Rehydration success uses the persisted blob

- **WHEN** the app loads and the persisted blob passes the schema
- **THEN** the store is initialized to the persisted state
- **AND** no warn is emitted

### Requirement: Shared persistence helper

The system SHALL expose `createValidatedPersist(name, schema, init, options?)` from `src/shared/lib/persistence.ts`. The helper SHALL wrap zustand's `persist` middleware and apply the rehydration-layer policy above. All four persisted zustand stores (tasks, groups, timer, planner) SHALL use it.

#### Scenario: Stores opt into validated rehydration

- **WHEN** any persisted store is constructed
- **THEN** it calls `createValidatedPersist` rather than `persist` directly
- **AND** the on-disk key name matches the existing contract (no rename)

### Requirement: Defensive bounds on user-input fields

The system SHALL enforce length caps on user-typed strings at the schema layer:

- `Task.title`: 1 to 280 characters (after trim)
- `Group.name`: 1 to 40 characters (after trim)

Inputs exceeding the cap SHALL be rejected by the schema (truncation is not used). The UI may pre-trim before submission; the schema is the final guard.

#### Scenario: Task title over 280 chars is rejected

- **WHEN** `addTask` is called with a 281-character string
- **THEN** the task is not added
- **AND** the store logs a warning

#### Scenario: Group name over 40 chars is rejected

- **WHEN** `addGroup` is called with a 41-character string
- **THEN** the group is not added
- **AND** the store logs a warning

### Requirement: Timer settings validation on update

The system SHALL run `TimerSettingsSchema.safeParse` on the merged result of every `setTimerSettings` call. On failure, the update SHALL NOT be applied and a `console.warn` SHALL be emitted.

#### Scenario: Valid partial update is applied

- **WHEN** `setTimerSettings({ focusDuration: 30 })` is called
- **THEN** the merged settings pass the schema
- **AND** the store applies the update

#### Scenario: Out-of-range update is rejected

- **WHEN** `setTimerSettings({ focusDuration: 999 })` is called
- **THEN** the merged settings fail the schema
- **AND** the store does not apply the update
- **AND** a `console.warn` is emitted
