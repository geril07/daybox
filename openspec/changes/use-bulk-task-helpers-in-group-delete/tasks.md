## 1. Refactor `handleDeleteGroup`

- [ ] 1.1 In `src/features/groups/components/GroupSettingsPanel.tsx`, replace the `if (reassignToDefault) { ...forEach updateTask... }` branch with a single call: `useTaskStore.getState().reassignTasks(groupId, DEFAULT_GROUP_ID)`.
- [ ] 1.2 Replace the `else { ...forEach deleteTask... }` branch with a single call: `useTaskStore.getState().deleteTasksByGroupId(groupId)`.
- [ ] 1.3 Keep the trailing `deleteGroup(groupId)` call exactly as it is.
- [ ] 1.4 Remove any now-unused local variables (e.g., `tasks`, `taskIds`).

## 2. Regression tests

- [ ] 2.1 Add a test in `GroupSettingsPanel.test.tsx` that seeds: timer focused on task `'t-1'` in group `'work'`, then invokes the deletion handler with `reassignToDefault=true`. Assert `useTimerStore.focusedTaskId === null` and `useTaskStore.tasks.find(t => t.id === 't-1').groupId === DEFAULT_GROUP_ID`.
- [ ] 2.2 Add a test that seeds the same focus, then invokes the handler with `reassignToDefault=false`. Assert `useTimerStore.focusedTaskId === null` and task `'t-1'` no longer exists.
- [ ] 2.3 Add a test that seeds focus on task `'t-1'` in group `'home'` and deletes group `'work'` (which does not contain `'t-1'`). Assert `useTimerStore.focusedTaskId === 't-1'` is unchanged.

## 3. Verification

- [ ] 3.1 Run `npm run format`.
- [ ] 3.2 Run `npm run typecheck`.
- [ ] 3.3 Run `npm run lint`.
- [ ] 3.4 Run `npm run test`.
- [ ] 3.5 Manual smoke test: focus a task in a non-default group via the timer; from settings, delete that group with "Move tasks to General"; confirm the timer's focused-task indicator clears. Repeat with "Delete all tasks."
