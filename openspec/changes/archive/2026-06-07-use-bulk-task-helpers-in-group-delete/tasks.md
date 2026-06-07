## 1. Refactor `handleResolveAndDelete`

- [x] 1.1 In `src/features/groups/components/GroupSettingsPanel.tsx`, replace the `if (reassignToDefault) { ...forEach updateTask... }` branch with a single call: `useTaskStore.getState().reassignTasks(groupId, DEFAULT_GROUP_ID)`.
- [x] 1.2 Replace the `else { ...forEach deleteTask... }` branch with a single call: `useTaskStore.getState().deleteTasksByGroupId(groupId)`.
- [x] 1.3 Keep the trailing `deleteGroup(groupId)` call exactly as it is.
- [x] 1.4 Remove any now-unused local variables (e.g., `tasks`, `taskIds`).

## 2. Narrow the focused-task cascade

- [x] 2.1 In `src/features/tasks/store.ts`, remove the focus-clear block from `reassignTasks`. The action SHALL only mutate `tasks`; it MUST NOT read or write `useTimerStore.focusedTaskId`.
- [x] 2.2 Confirm `deleteTasksByGroupId` still clears focus when the focused task's group equals the deleted group.
- [x] 2.3 Add a test in `src/features/tasks/store.test.ts` asserting `reassignTasks(focusedGroup, otherGroup)` leaves `useTimerStore.focusedTaskId` unchanged when the focused task's group equals the from-group.
- [x] 2.4 Add a test in `src/features/tasks/store.test.ts` asserting `deleteTasksByGroupId(focusedGroup)` clears `useTimerStore.focusedTaskId` when the focused task lives in that group.

## 3. Regression tests at the component level

- [x] 3.1 Replace the existing "clears focus when moving the focused task's group to General" test in `GroupSettingsPanel.test.tsx` with one that asserts focus is **preserved** on move (assert `useTimerStore.focusedTaskId === task.id` after the Move action).
- [x] 3.2 Keep the existing "clears focus when deleting all tasks of the focused group" test (already correct under the narrowed cascade).
- [x] 3.3 Keep the existing "leaves focus alone when deleting an unrelated group" test (already correct).

## 4. Verification

- [x] 4.1 Run `npm run format`.
- [x] 4.2 Run `npm run typecheck`.
- [x] 4.3 Run `npm run lint`.
- [x] 4.4 Run `npm run test`.
- [x] 4.5 Manual smoke test: focus a task in a non-default group; from settings, delete that group with "Move tasks to General" and confirm the timer's focused-task indicator still points at the same (now-General) task. Repeat with "Delete all tasks" and confirm the focused-task indicator clears.
