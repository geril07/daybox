## 1. Rename internal identifier and type

- [x] 1.1 In `src/features/planner/queries.ts`, change `type View` literal `'backlog'` to `'unscheduled'`.
- [x] 1.2 In `src/features/planner/queries.ts`, rename the `viewMetaMap` key from `backlog` to `unscheduled` and update `title: 'Backlog'` to `title: 'Unscheduled'`.
- [x] 1.3 In `src/features/planner/queries.ts`, update the `case 'backlog':` branch in `viewToRange` to `case 'unscheduled':`.
- [x] 1.4 In `src/features/planner/components/DayView.tsx`, update `type SingleDayView = 'today' | 'tomorrow' | 'backlog'` to `'unscheduled'`.

## 2. Update user-visible strings

- [x] 2.1 In `src/app/App.tsx`, update the tab entry from `{ label: 'Backlog', value: 'backlog' }` to `{ label: 'Unscheduled', value: 'unscheduled' }`.
- [x] 2.2 In `src/app/App.tsx`, update `case 'backlog':` in the view switch to `case 'unscheduled':`.
- [x] 2.3 In `src/features/planner/queries.ts`, update the Today view `emptyDescription` from `'Pull tasks from Backlog or add a new one.'` to `'Pull unscheduled tasks or add a new one.'`
- [x] 2.4 In `src/features/tasks/components/TaskRow.tsx`, update the date picker preset from `{ label: 'Unsched.', value: null }` to `{ label: 'Unscheduled', value: null }`.

## 3. Update tests

- [x] 3.1 In `src/features/planner/queries.test.ts`, replace all `'backlog'` string literals with `'unscheduled'` (test descriptions and argument values).

## 4. Verification

- [x] 4.1 Run `npm run typecheck`. No errors — the `View` type rename propagates cleanly.
- [x] 4.2 Run `npm run test`. All tests pass.
- [x] 4.3 Run `npm run lint`. No errors.
- [x] 4.4 Manually verify: tab bar shows "Unscheduled", section header reads "Unscheduled", date picker preset reads "Unscheduled", Today empty state reads "Pull unscheduled tasks or add a new one."
