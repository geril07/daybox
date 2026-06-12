## Context

DayBox is a local-first planner where persisted state is owned by feature stores and included in data portability through per-feature slices. The current task model is intentionally task-specific: tasks have dates, groups, Pomodoro counts, focus behavior, reorder behavior, and overdue behavior. Daily routines need a lighter model for repeated habit/checklist completion that resets by date without creating normal task instances.

The existing Today view renders overdue tasks and today's tasks through planner queries and task components. Settings already hosts feature-owned panels, and the data-portability feature owns snapshot versioning, migrations, validation, and apply behavior.

## Goals / Non-Goals

**Goals:**

- Add a new `routines` feature that owns routine definitions, embedded routine steps, and sparse per-date step completion.
- Render active routines as checklist cards in a dedicated Today section.
- Manage routine definitions and steps from settings.
- Persist routines locally and include them in export/import snapshots.
- Keep routine steps distinct from tasks so they do not gain task-specific behavior by accident.

**Non-Goals:**

- Do not generate recurring task copies.
- Do not make routine steps focusable in the Pomodoro timer for v1.
- Do not add streaks, weekly schedules, skipped states, notes, or routine history UI in v1.
- Do not show routines in Tomorrow, This Week, Unscheduled, or arbitrary date browsing in v1.

## Decisions

### Add a dedicated `routines` feature

Routines SHALL live under `src/features/routines/` with their own schema, store, slice, queries, components, and barrel exports. This follows the existing feature ownership pattern and avoids leaking routine concerns into `tasks` or `planner`.

Alternative considered: add routine fields to `Task`. This was rejected because routine steps are not dated tasks and should not inherit groups, Pomodoro estimates, focus actions, overdue state, or task reordering.

### Embed steps inside routines

The persisted state SHALL store routines as an array of `Routine` objects, where each routine owns its `steps: RoutineStep[]` array.

```ts
type Routine = {
  id: string
  name: string
  active: boolean
  sortOrder: number
  steps: RoutineStep[]
  createdAt: string
}

type RoutineStep = {
  id: string
  title: string
  active: boolean
  sortOrder: number
  createdAt: string
}
```

Alternative considered: separate top-level `routines` and `items` arrays. This was rejected for v1 because routine steps have a one-to-many ownership relationship with a single routine, and embedding better matches the settings editing UI.

### Use sparse per-date completion state

The store SHALL use `stepCompletionsByDate`, keyed first by `YYYY-MM-DD`, then by `RoutineStep.id`.

```ts
type RoutineState = {
  routines: Routine[]
  stepCompletionsByDate: Record<
    string,
    Record<
      string,
      {
        completedAt: string
      }
    >
  >
}
```

Missing completion state SHALL mean incomplete. Checking a step writes a completion entry for the selected date. Unchecking a step removes the entry. Completion entries do not need their own IDs because the key is `(date, routineStepId)`.

Alternative considered: array completion records. This was rejected because routine completion is expected to grow over time, sparse lookup is simpler for Today rendering, and incomplete records do not need to be stored.

### Reuse the shared ID generator

Routine and RoutineStep IDs SHALL be generated with `generateId()` from `@/shared/id`, matching current task/group conventions. Completion entries SHALL not generate IDs.

### Today view renders routines, settings edits routines

The Today view SHALL render routines for execution only: check/uncheck routine steps and show progress. Settings SHALL manage routine definitions: create, rename, activate/deactivate, delete, reorder, and edit steps.

This keeps daily use lightweight while preserving settings as the place where feature-owned configuration is managed.

### Snapshot version advances to v4

The data-portability envelope SHALL advance from v3 to v4 to include the `routines` slice. A v3-to-v4 migration SHALL add empty routine state. Existing v2 imports SHALL still migrate forward through the current migration path into the v4 shape.

## Risks / Trade-offs

- [Risk] Sparse completion history can grow indefinitely in localStorage. → Mitigation: v1 stores only completed steps and no incomplete records; retention/cleanup can be added later if needed.
- [Risk] Deleting a routine or step can leave orphaned historical completion keys. → Mitigation: v1 delete actions should remove completion keys for deleted steps; imported data validation can tolerate unknown keys because they are harmless for rendering.
- [Risk] Users may expect routines in Week or Date Browser views. → Mitigation: v1 explicitly scopes routine execution to Today; future scheduling/history can extend the capability.
- [Risk] Routine cards could visually compete with tasks. → Mitigation: render them in a distinct `Routines` section with compact checklist styling and no task row affordances.
