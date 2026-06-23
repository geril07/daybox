## ADDED Requirements

### Requirement: User can clear the focused task from the timer bar

The timer bar's "Working on…" row SHALL render a clear affordance at its trailing edge whenever `useTimerStore.focusedTaskId` is non-null. The affordance SHALL be visible regardless of whether the focused task is still resolvable from the tasks store — it is the user's way out of both an off-screen focus and a stale focus. Activating the affordance SHALL call `useTimerStore.setFocusedTaskId(null)` and SHALL NOT mutate `phase`, `elapsed`, `startedAt`, `isRunning`, or `sessionPomoCount`. The affordance SHALL NOT be rendered when `focusedTaskId` is `null`.

The clear affordance is a peer of the existing `TaskRow` focus toggle: both paths converge on `setFocusedTaskId(null)`. The `focusTask(id)` toggle semantics on `TaskRow` SHALL NOT change.

#### Scenario: Clear button is hidden when no task is focused

- **WHEN** `useTimerStore.focusedTaskId` is `null`
- **THEN** the "Working on…" row shows "No task focused" and renders no clear affordance

#### Scenario: Clear button is visible when a task is focused

- **WHEN** `useTimerStore.focusedTaskId` is set to a task id and that task exists in `useTaskStore.tasks`
- **THEN** the "Working on…" row shows the task's title and renders a clear affordance at its trailing edge

#### Scenario: Clear button is visible when the focused task is stale

- **WHEN** `useTimerStore.focusedTaskId` is set to a task id that no task in `useTaskStore.tasks` has
- **THEN** the "Working on…" row renders a clear affordance at its trailing edge
- **AND** activating it sets `focusedTaskId` to `null`

#### Scenario: Activating the clear button sets focusedTaskId to null

- **WHEN** the user activates the clear affordance and `focusedTaskId` was `'t-1'`
- **THEN** `useTimerStore.focusedTaskId` becomes `null`

#### Scenario: Clearing focus does not disturb timer state

- **WHEN** the timer is running with `phase: 'focus'`, `elapsed: 60000`, `isRunning: true`, `startedAt` set, `sessionPomoCount: 2`, and `focusedTaskId: 't-1'`, and the user activates the clear affordance
- **THEN** `focusedTaskId` becomes `null`
- **AND** `phase` remains `'focus'`
- **AND** `elapsed` remains `60000`
- **AND** `isRunning` remains `true`
- **AND** `startedAt` is unchanged
- **AND** `sessionPomoCount` remains `2`
