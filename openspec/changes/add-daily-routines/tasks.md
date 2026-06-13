## 1. Routines Data Model

- [ ] 1.1 Create `src/features/routines/` with barrel exports following the feature folder conventions.
- [ ] 1.2 Add zod schemas and inferred types for `Routine`, `RoutineStep`, `stepCompletionsByDate`, and the routines store state.
- [ ] 1.3 Implement `useRoutineStore` persisted under `daybox-routines` with validated rehydration and empty initial state.
- [ ] 1.4 Implement routine actions for create, update, activate/deactivate, delete, and reorder.
- [ ] 1.5 Implement routine step actions for add, update, activate/deactivate, delete, and reorder inside one routine.
- [ ] 1.6 Implement per-date step completion actions that write/remove sparse `stepCompletionsByDate[date][stepId]` entries.
- [ ] 1.7 Add store tests for validation, routine management, step management, per-date completion, daily reset behavior, and deletion cleanup.

## 2. Routine Queries And Today UI

- [ ] 2.1 Add routines selectors that return visible active routines for a date with active steps, completion state, and progress counts.
- [ ] 2.2 Build a compact `RoutineCard` component for Today with routine name, progress, and step checkboxes.
- [ ] 2.3 Build a `RoutineSection` component that renders visible routine cards under the shared `SectionHeader` style.
- [ ] 2.4 Update `DayView` so Today renders routines after Overdue and before today's task section.
- [ ] 2.5 Update Today empty-state logic so visible routines count as content.
- [ ] 2.6 Ensure routines are not rendered in Tomorrow, This Week, Unscheduled, or Date Browser views.
- [ ] 2.7 Add component/query tests for routine rendering, progress, toggling, empty-state behavior, and non-Today exclusion.

## 3. Settings Management UI

- [ ] 3.1 Add `RoutineSettingsPanel` for creating and listing routines.
- [ ] 3.2 Add controls to rename, activate/deactivate, delete, and reorder routines from settings.
- [ ] 3.3 Add controls to add, edit, activate/deactivate, delete, and reorder steps inside a routine.
- [ ] 3.4 Mount `RoutineSettingsPanel` from `SettingsDrawer` as a feature-owned settings section.
- [ ] 3.5 Add settings tests for routine creation, routine activation, routine deletion, step creation, step editing, and step ordering.

## 4. Data Portability

- [ ] 4.1 Add `routinesSaveSlice` that exports and applies the routines store state.
- [ ] 4.2 Add the routines slice to the data-portability registry.
- [ ] 4.3 Keep the snapshot envelope at `envelopeVersion: 1` and include routines under `slices.routines`.
- [ ] 4.4 Configure the routines slice missing-slice strategy to use empty routine state for older current-envelope imports.
- [ ] 4.5 Add data-portability tests for current build including routines, missing routines slice defaulting to empty state, valid routines commit, and invalid routines payload rejection.

## 5. Verification

- [ ] 5.1 Run `npm run format`.
- [ ] 5.2 Run `npm run typecheck`.
- [ ] 5.3 Run `npm run lint`.
- [ ] 5.4 Run `npm run test`.
- [ ] 5.5 Manually verify the Today routines flow on desktop and mobile viewports.
