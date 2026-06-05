## 1. Delete scaffold residue

- [ ] 1.1 Delete `src/assets/hero.png`
- [ ] 1.2 Delete the empty `src/shared/assets/` directory

## 2. Move `EmptyState` into `shared/ui/`

- [ ] 2.1 Move `src/shared/EmptyState.tsx` to `src/shared/ui/EmptyState.tsx`; preserve contents and imports
- [ ] 2.2 Add `export { EmptyState } from './EmptyState'` to `src/shared/ui/index.ts`

## 3. Move test setup to `app/`

- [ ] 3.1 Move `src/shared/test-setup.ts` to `src/app/test-setup.ts`; preserve contents
- [ ] 3.2 Update `setupFiles` in `vite.config.ts` from `'src/shared/test-setup.ts'` to `'src/app/test-setup.ts'`

## 4. Move `Task` to `features/tasks/types.ts`

- [ ] 4.1 Create `src/features/tasks/types.ts` with the `Task` interface (moved verbatim from `src/shared/types.ts`)
- [ ] 4.2 Re-point imports in `src/app/localStorage.ts`, `src/app/localStorage.test.ts`, `src/features/tasks/store.ts`, `src/features/tasks/queries.ts`, `src/features/tasks/queries.test.ts`, `src/features/tasks/components/TaskList.tsx`, `src/features/tasks/components/TaskRow.tsx`, `src/features/tasks/components/TaskRow.test.tsx`, `src/features/timer/components/TimerBar.tsx` from `@/shared/types` to `@/features/tasks/types`

## 5. Move `Group` to `features/groups/types.ts` and `GROUP_COLORS` to `features/groups/constants.ts`

- [ ] 5.1 Create `src/features/groups/types.ts` with the `Group` interface (moved verbatim)
- [ ] 5.2 Create `src/features/groups/constants.ts` with `GROUP_COLORS` (moved verbatim)
- [ ] 5.3 Re-point imports in `src/app/localStorage.ts`, `src/app/localStorage.test.ts`, `src/features/groups/store.ts`, `src/features/groups/components/GroupSettingsPanel.tsx`, `src/features/tasks/components/AddTaskRow.tsx`:
  - `Group` → `@/features/groups/types`
  - `GROUP_COLORS` → `@/features/groups/constants`

## 6. Move `TimerPhase` to `features/timer/types.ts`

- [ ] 6.1 Create `src/features/timer/types.ts` with the `TimerPhase` type (moved verbatim)
- [ ] 6.2 Re-point imports in `src/features/timer/store.ts` and any test files from `@/shared/types` to `@/features/timer/types`

## 7. Delete `shared/types.ts`

- [ ] 7.1 Confirm `src/shared/types.ts` is empty (all exports moved); delete the file

## 8. Verify

- [ ] 8.1 Run `rg "from '@/shared/types'" src` — expect zero matches
- [ ] 8.2 Run `rg "from '@/shared/EmptyState'" src` — expect zero matches
- [ ] 8.3 Run `rg "from '@/shared/test-setup'" src` — expect zero matches (only the vite.config reference, now updated)
- [ ] 8.4 Run `npm run typecheck`; resolve any remaining type-only import issues
- [ ] 8.5 Run `npm run lint`
- [ ] 8.6 Run `npm run test`; confirm all tests pass
- [ ] 8.7 Run `npm run format`
