## 1. OpenSpec change skeleton

- [ ] 1.1 Create `openspec/changes/tidy-audit-constraints/{proposal,design,tasks}.md`
- [ ] 1.2 Create `openspec/changes/tidy-audit-constraints/specs/{architecture,task-management,pomodoro-timer,data-persistence,group-management}/` directories

## 2. New architecture capability

- [ ] 2.1 Create `openspec/changes/tidy-audit-constraints/specs/architecture/spec.md` with 5 requirements: one folder per domain, intra-feature relative paths, barrel re-exports, cross-cutting exceptions, `DEFAULT_GROUP_ID` canonical

## 3. Delta specs

- [ ] 3.1 `task-management` delta: `addTask` returns `Task | null`; focused-task cascade in 4 actions
- [ ] 3.2 `pomodoro-timer` delta: timer store partialize drops runtime state; rehydrate callback removed
- [ ] 3.3 `data-persistence` delta: per-record validation in legacy migration
- [ ] 3.4 `group-management` delta: `DEFAULT_GROUP_ID` canonical location; `<GroupLens />` not in header

## 4. `createValidatedPersist` learns `storage`

- [ ] 4.1 Add `storage?` to `ValidatedPersistOptions` in `src/shared/utils/persistence.ts`
- [ ] 4.2 Pass `storage` through to the returned object so zustand's `persist` picks it up

## 5. Timer store debounced storage

- [ ] 5.1 Create `src/shared/utils/debounced-storage.ts` exporting `createDebouncedStringStorage(base: StateStorage, delayMs: number): StateStorage` — coalesces `setItem` writes, registers a `beforeunload` and `visibilitychange` flush
- [ ] 5.2 `src/features/timer/store.ts`: pass `storage: createJSONStorage(() => createDebouncedStringStorage(localStorage, 1000))` to `createValidatedPersist`
- [ ] 5.3 The `onRehydrateStorage` wall-clock-correction callback is unchanged
- [ ] 5.4 Run `tsc -b` and `npx vitest run src/features/tasks/components/TaskRow.test.tsx`

## 6. Focused-task cascade in `useTaskStore`

- [ ] 6.1 `src/features/tasks/store.ts`: import `useTimerStore` from `@/features/timer`
- [ ] 6.2 `deleteTask(id)`: cascade-clear `focusedTaskId` if `id === focusedTaskId`
- [ ] 6.3 `reassignTasks(from, to)`: cascade-clear if the focused task was in the `from` group (read pre-set state for that check)
- [ ] 6.4 `deleteTasksByGroupId(groupId)`: cascade-clear if the focused task was in `groupId` (read pre-set state for that check)
- [ ] 6.5 `reorderTasks`: no cascade (identity preserved)
- [ ] 6.6 Run `tsc -b` and `npx vitest run src/features/tasks/store.test.ts`

## 7. `addTask` returns `Task | null`

- [ ] 7.1 `src/features/tasks/store.ts`: change `addTask` signature to `Task | null`; return `null` on validation failure
- [ ] 7.2 Delete `createPlaceholderTask` (unused after the change)
- [ ] 7.3 Run `tsc -b` and `npx vitest run src/features/tasks/store.test.ts src/features/tasks/components/TaskRow.test.tsx`

## 8. `DEFAULT_GROUP_ID` canonicalization

- [ ] 8.1 `src/features/groups/store.ts:11`: change `const` → `export const`
- [ ] 8.2 `src/features/tasks/store.ts:10`: delete local declaration; import from `@/features/groups`
- [ ] 8.3 `src/app/bootstrap.ts:181`: delete local declaration; import from `@/features/groups`
- [ ] 8.4 `src/features/groups/components/GroupSettingsPanel.tsx:37`: replace `'default'` literal with `DEFAULT_GROUP_ID`; import the constant
- [ ] 8.5 Run `tsc -b`

## 9. Migration per-record validation

- [ ] 9.1 `src/app/bootstrap.ts:migrateLegacyAppStore`: replace the `state.tasks as Task[]` and `state.groups as Group[]` casts with a `safeParseAndRoute` loop against `TaskSchema` / `GroupSchema`; log dropped records
- [ ] 9.2 Run `npx vitest run src/app/bootstrap.test.ts`

## 10. Barrels re-export and intra-feature paths

- [ ] 10.1 `src/features/tasks/index.ts`: add `export * from './types'` and `export * from './schema'`
- [ ] 10.2 `src/features/groups/index.ts`: add `export * from './types'` and `export * from './schema'`
- [ ] 10.3 `src/features/planner/index.ts`: add `export * from './schema'`
- [ ] 10.4 `src/app/bootstrap.ts`: switch deep imports to the barrel (5 sites)
- [ ] 10.5 `src/features/tasks/components/TaskRow.tsx`: relative imports for `useTaskStore` and `Task` type
- [ ] 10.6 `src/features/tasks/components/TaskRow.test.tsx`: relative import for `useTaskStore`
- [ ] 10.7 `src/features/tasks/components/AddTaskRow.tsx`: relative import for `useTaskStore`; barrel for cross-feature `Group` type
- [ ] 10.8 `src/features/tasks/components/TaskList.tsx`: relative imports for `TaskRow` and `useTaskStore`; relative for `Task` type
- [ ] 10.9 `src/features/groups/components/GroupLens.tsx`: relative import for `useGroupStore`
- [ ] 10.10 `src/features/groups/components/GroupSettingsPanel.tsx`: relative import for `useGroupStore`; barrel for cross-feature `Group` type
- [ ] 10.11 `src/features/groups/components/GroupTag.tsx`: relative import for `useGroupStore`
- [ ] 10.12 `src/features/timer/components/TimerBar.tsx`: relative imports for `playAlarm` and `useTimerStore`
- [ ] 10.13 `src/features/timer/components/TimerSettingsPanel.tsx`: relative import for `useTimerStore`
- [ ] 10.14 Run `tsc -b` and `rg "from '@/features/(tasks|groups|timer|planner)/(types|schema)" src` — expect zero matches
- [ ] 10.15 Run `rg "from '@/features/(tasks|groups|timer)/'$" src/features/` — expect zero matches (no self-barrel imports remain)

## 11. Remove `<GroupLens />` from header

- [ ] 11.1 `src/app/App.tsx:7`: drop `GroupLens` from the `@/features/groups` import
- [ ] 11.2 `src/app/App.tsx:117`: drop the `<GroupLens … />` JSX
- [ ] 11.3 Run `tsc -b`

## 12. Prune dead `shared/ui` primitives

- [ ] 12.1 Delete `src/shared/ui/input.tsx`, `label.tsx`, `separator.tsx`, `badge.tsx`, `card.tsx`
- [ ] 12.2 Remove the 5 export blocks from `src/shared/ui/index.ts`
- [ ] 12.3 Run `tsc -b` and `rg "from '@/shared/ui'" src | rg -E '\b(Input|Label|Separator|Badge|Card)\b'` — expect zero matches

## 13. AGENTS.md rewrite

- [ ] 13.1 Replace the `## Architecture`, `### Per-domain state`, `### Feature boundaries`, and `### Constraints & known gotchas` sections with: a 3-line role pointer, a 5-line invariants list, and a one-sentence pointer at the `architecture` spec
- [ ] 13.2 Remove all `app/localStorage.ts` and `localStorage.ts:NNN` references (the file is now `app/bootstrap.ts`)

## 14. Verify

- [ ] 14.1 `npm run format`
- [ ] 14.2 `npm run typecheck`
- [ ] 14.3 `npm run lint`
- [ ] 14.4 `npm run test`
- [ ] 14.5 `rg "DEFAULT_GROUP_ID" src` — expect one declaration in `features/groups/`, imports elsewhere
- [ ] 14.6 `rg "groupId: 'default'" src` — expect zero matches
