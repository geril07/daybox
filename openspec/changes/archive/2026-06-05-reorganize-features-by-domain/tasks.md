## 1. Create shared queries module

- [x] 1.1 Create `src/features/tasks/queries.ts` with `selectTodayTasks`, `selectOverdue`, `selectWeek`, `selectBacklog`, `selectForDate` selectors extracted from the 5 view files
- [x] 1.2 Write unit tests for `queries.ts` (one test per selector)

## 2. Reorganize tasks feature

- [x] 2.1 Create `src/features/tasks/components/` directory
- [x] 2.2 Move `AddTaskRow.tsx`, `TaskList.tsx`, `TaskRow.tsx`, `TaskRow.test.tsx` into `components/` and update their relative imports

## 3. Reorganize groups feature

- [x] 3.1 Create `src/features/groups/components/` directory
- [x] 3.2 Move `GroupTag.tsx`, `GroupLens.tsx` into `components/`
- [x] 3.3 Rename `GroupSettings.tsx` to `GroupSettingsPanel.tsx` and move into `components/`
- [x] 3.4 Update all imports referencing group components

## 4. Create planner feature (replaces views)

- [x] 4.1 Create `src/features/planner/components/` directory
- [x] 4.2 Move `TodayView.tsx`, `TomorrowView.tsx`, `WeekView.tsx`, `BacklogView.tsx`, `DateBrowser.tsx` from `features/views/` to `features/planner/components/`
- [x] 4.3 Refactor each view to use selectors from `queries.ts` instead of inlining filter/sort logic
- [x] 4.4 Remove `src/features/views/` directory

## 5. Reorganize timer feature

- [x] 5.1 Create `src/features/timer/components/` directory
- [x] 5.2 Move `TimerBar.tsx` into `components/`
- [x] 5.3 Extract `TimerSettingsPanel.tsx` into `components/` (pull timer-related settings from current `SettingsDrawer`)

## 6. Move SettingsDrawer to app shell

- [x] 6.1 Create `src/app/shell/` directory
- [x] 6.2 Move `SettingsDrawer.tsx` from `features/settings/` to `app/shell/SettingsDrawer.tsx` and update imports to use the new feature-owned settings panels
- [x] 6.3 Remove `src/features/settings/` directory entirely

## 7. Update barrel imports and verify

- [x] 7.1 Find and update all import paths across `src/` referencing moved modules
- [x] 7.2 Run `tsc -b` and fix any type errors
- [x] 7.3 Run `vitest` and confirm all 32 tests pass
- [x] 7.4 Run `npm run lint` and fix any issues
- [x] 7.5 Run `npm run format`
