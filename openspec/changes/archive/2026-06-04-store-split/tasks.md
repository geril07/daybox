## 1. Scaffold new store files

- [x] 1.1 Create `src/features/tasks/store.ts` with `useTaskStore` (persisted, key `daybox-tasks`): `tasks: Task[]`, `addTask`, `updateTask`, `deleteTask`, `toggleTask`, `reorderTasks` — lift actions from old `app/store.ts`
- [x] 1.2 Create `src/features/groups/store.ts` with `useGroupStore` (persisted, key `daybox-groups`): `groups: Group[]`, `stickyGroupId`, `addGroup`, `renameGroup`, `deleteGroup`, `getDefaultGroup`, `getGroupColorIndex`, `setStickyGroupId` — lift from old `app/store.ts`
- [x] 1.3 Create `src/features/settings/store.ts` with `useSettingsStore` (persisted, key `daybox-settings`): `settings: AppSettings`, `updateSettings`, `updateTimerSettings` — lift from old `app/store.ts`
- [x] 1.4 Create `src/app/uiStore.ts` with `useUIStore` (NOT persisted): `view: View`, `browseDate`, `setView`, `setBrowseDate`
- [x] 1.5 Move `src/app/timerStore.ts` → `src/features/timer/store.ts`; add `focusedTaskId: string | null` + `setFocusedTaskId` to timer state and actions

## 2. Create localStorage migration + refactor export/import

- [x] 2.1 Rewrite `src/app/localStorage.ts`: change `ExportData.appStore` → three separate store fields (`tasks`, `groups`, `settings`); remove `view`, `browseDate`, `focusedTaskId`, `stickyGroupId` from export; update `parseImport` to write to three stores instead of one
- [x] 2.2 Add one-shot migration in `App.tsx`: useEffect reads old `daybox-app-store` from localStorage, writes to `daybox-tasks`/`daybox-groups`/`daybox-settings`, deletes old key; guard with a flag to run only once

## 3. Rewire consumers — task features

- [x] 3.1 Update `src/features/tasks/AddTaskRow.tsx`: `useAppStore` → `useTaskStore` (addTask) + `useGroupStore` (groups, stickyGroupId, setStickyGroupId)
- [x] 3.2 Update `src/features/tasks/TaskList.tsx`: `useAppStore` → `useTaskStore` (reorderTasks)
- [x] 3.3 Update `src/features/tasks/TaskRow.tsx`: `useAppStore` → `useTaskStore` (task actions) + `useGroupStore` (groups); `useTimerStore` imports stay, use `focusedTaskId`/`setFocusedTaskId` from timer store
- [x] 3.4 Update `src/features/tasks/TaskRow.test.tsx`: all `useAppStore.setState/getState` → correct store

## 4. Rewire consumers — group features

- [x] 4.1 Update `src/features/groups/GroupTag.tsx`: `useAppStore` → `useGroupStore`
- [x] 4.2 Update `src/features/groups/GroupLens.tsx`: `useAppStore` → `useGroupStore`
- [x] 4.3 Update `src/features/groups/GroupSettings.tsx`: `useAppStore` → `useGroupStore` + `useTaskStore` for cross-store delete orchestration

## 5. Rewire consumers — timer

- [x] 5.1 Update `src/features/timer/TimerBar.tsx`: `useAppStore` → `useTaskStore` (tasks, updateTask) + `useSettingsStore` (settings.timer); `useTimerStore` imports stay, use `focusedTaskId` from timer store now; update import path to `@/features/timer/store`

## 6. Rewire consumers — shell

- [x] 6.1 Update `src/app/App.tsx`: `useAppStore` → `useUIStore` (view, setView, browseDate) + `useSettingsStore` (theme); add migration logic (task 2.2)
- [x] 6.2 Update `src/features/settings/SettingsDrawer.tsx`: `useAppStore` → `useSettingsStore` (settings, updateSettings, updateTimerSettings); update export/import to use new store API; update `useAppStore.getState()`/`setState()` → three stores

## 7. Rewire consumers — views

- [x] 7.1 Update `src/features/views/TodayView.tsx`: `useAppStore(s => s.tasks)` → `useTaskStore(s => s.tasks)`
- [x] 7.2 Update `src/features/views/TomorrowView.tsx`: same
- [x] 7.3 Update `src/features/views/WeekView.tsx`: `useAppStore(s => s.tasks)` + `useAppStore(s => s.settings.weekStartDay)` → `useTaskStore` + `useSettingsStore`
- [x] 7.4 Update `src/features/views/BacklogView.tsx`: `useAppStore(s => s.tasks)` → `useTaskStore(s => s.tasks)`
- [x] 7.5 Update `src/features/views/DateBrowser.tsx`: `useAppStore` → `useTaskStore` (tasks) + `useUIStore` (browseDate, setBrowseDate)

## 8. Clean up old files

- [x] 8.1 Delete `src/app/store.ts`
- [x] 8.2 Delete `src/app/timerStore.ts` (moved in 1.5)
- [x] 8.3 Update barrel exports: remove stale re-exports from `src/shared/ui/index.ts` etc. if any reference old store paths

## 9. Fix tests

- [x] 9.1 Rewrite `src/app/store.test.ts`: split tests into per-store blocks using each store's `setState`/`getState`; remove tests for timer (moved to timer/store) and export/import (stay in localStorage)
- [x] 9.2 Verify `npm run test` passes

## 10. Format, typecheck, lint

- [x] 10.1 Run `npm run format && npm run typecheck && npm run lint` and fix any issues
