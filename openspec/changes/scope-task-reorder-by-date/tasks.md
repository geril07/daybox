## 1. Store: bucket-scoped reorderTasks

- [ ] 1.1 Change `reorderTasks` signature in `TaskActions` (and `TaskStore`) in `src/features/tasks/store.ts` from `(tasks: Task[]) => void` to `(date: string | null, taskIds: string[]) => void`.
- [ ] 1.2 Reimplement `reorderTasks` in `src/features/tasks/store.ts` to: (a) compute the set of ids that are valid for the bucket (`state.tasks` filtered by `t.date === date`), (b) drop ids from `taskIds` that aren't in that set and emit a single `console.warn` if any were dropped, (c) build a `Map<id, sortOrder>` from the remaining ordered ids, (d) `set((state) => ({ tasks: state.tasks.map(t => map.has(t.id) ? { ...t, sortOrder: map.get(t.id)! } : t) }))`.
- [ ] 1.3 Verify no other call site of `reorderTasks` exists outside `TaskList.tsx` (search `src/**` for `reorderTasks`).

## 2. TaskList: tristate date prop and conditional DnD

- [ ] 2.1 Add `date?: string | null` to `TaskListProps` in `src/features/tasks/components/TaskList.tsx`.
- [ ] 2.2 In the `TaskList` body, branch on `date === undefined`: when undefined, render the existing motion list **without** `DragDropProvider` and pass rows to a plain (non-sortable) row variant; otherwise mount `DragDropProvider` and render the existing `SortableTaskRow` children.
- [ ] 2.3 Update `handleDragEnd` to build the reordered id array via `arrayMove(tasks, sourceIndex, targetIndex).map(t => t.id)` and call `reorderTasks(date, reorderedIds)`. Preserve the `flushSync` + `setSnapLayout(true)` + `requestAnimationFrame(() => setSnapLayout(false))` snap-animation behaviour.
- [ ] 2.4 In `SortableTaskRow`, accept a `groupKey: string` prop and pass it as `group` to `useSortable`. Compute the group key in `TaskList` as `\`tasks:${date ?? 'undated'}\`` when DnD is on.
- [ ] 2.5 Provide a non-sortable row variant (either a separate `StaticTaskRow` component or a conditional that skips `useSortable` and renders `<TaskRow task={task} />` with no `dragHandleRef`). Either way, `TaskRow` must accept the missing/undefined `dragHandleRef` (verify current signature — make it optional if it isn't already).

## 3. Callers: pass bucket key where appropriate

- [ ] 3.1 `src/features/planner/components/DayView.tsx`: pass `date={today}` to the main `<TaskList tasks={tasks} />`. Compute `today` via `formatDate(new Date())` (or read it from a shared place if one exists). The overdue `<TaskList tasks={overdue} />` keeps no `date` prop.
- [ ] 3.2 `src/features/planner/components/WeekView.tsx`: pass `date={section.key}` for date-keyed sections (where `section.key` is the `dateStr` from `useWeekSections`). The overdue section's `TaskList` keeps no `date` prop. Confirm by reading `useWeekSections` in `src/features/planner/queries.ts` that per-day sections set `key: dateStr` while the overdue section uses `key: 'overdue'` (and therefore should NOT be passed as a `date`).
- [ ] 3.3 `src/features/planner/components/DateBrowser.tsx`: pass `date={browseDate}` to `<TaskList tasks={dateTasks} />`. (`browseDate` is already guarded as non-null where the list renders.)
- [ ] 3.4 `src/features/planner/components/DayView.tsx` (and any other affected file) — verify the `unscheduled` view passes `date={null}` so undated tasks can still be reordered. Trace from `viewToRange('unscheduled', …)` → `range.kind === 'undated'` and pass `null` accordingly.

## 4. Tests

- [ ] 4.1 In `src/features/tasks/store.test.ts`, add a new `describe('Task Store - reorderTasks bucket scope')` block.
- [ ] 4.2 Test: reorder within a single date preserves the relative order of in-bucket tasks and assigns `sortOrder` `0..n-1` in the new order.
- [ ] 4.3 Test (cross-date preservation regression): seed two tasks for date `'2026-06-08'` and one task for date `'2026-06-09'`; call `reorderTasks('2026-06-08', [t2.id, t1.id])`; assert the date-`'2026-06-09'` task is still present in `useTaskStore.tasks` with unchanged `date` and `sortOrder`.
- [ ] 4.4 Test (undated bucket): seed two tasks with `date: null` and one with `date: '2026-06-08'`; call `reorderTasks(null, [tNull2.id, tNull1.id])`; assert the dated task is untouched and the undated tasks have the new sortOrders.
- [ ] 4.5 Test (out-of-bucket ids ignored + warn): spy on `console.warn`; call `reorderTasks('2026-06-08', [tInBucket.id, tInOtherBucket.id, 'nonexistent-id'])`; assert (a) the in-bucket task gets `sortOrder: 0`, (b) the other-bucket task is unchanged, (c) `console.warn` was called once.
- [ ] 4.6 Update the existing scenario for `reorderTasks` in the focus-cascade tests (if any references the old signature) so it uses `reorderTasks(date, taskIds)`. If no existing test exercises focus + reorder, add one that mirrors the spec scenario "Reordering tasks never clears focus".
- [ ] 4.7 (Optional, if straightforward in jsdom) Add a `TaskList` component test asserting that rendering `<TaskList tasks={…} />` (no `date`) does not include any element with a draggable role/handle.

## 5. Verification

- [ ] 5.1 Run `npm run format`.
- [ ] 5.2 Run `npm run typecheck` and resolve any signature mismatches (expected at the four call sites and the store).
- [ ] 5.3 Run `npm run lint`.
- [ ] 5.4 Run `npm run test` and confirm all tests pass, including the new bucket-scope tests.
- [ ] 5.5 Manual verification in `npm run dev`: seed tasks across multiple dates; reorder in Today and confirm Tomorrow/Week tasks survive on refresh; reorder in WeekView per-day section and confirm no cross-day drop indicator appears when dragging across sections; confirm Overdue rows do not respond to drag attempts.
