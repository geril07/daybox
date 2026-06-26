## 1. Store helpers

- [x] 1.1 Extract a `compactBucket(tasks, date)` pure helper that groups tasks by `date === <bucket>`, stable-sorts by `(sortOrder, id)`, and reassigns `0..N-1` over the bucket. Returns the full `tasks` array with only the affected bucket's sortOrders rewritten. No mutation of other buckets or other fields.
- [x] 1.2 Extract a `nextSortOrder(tasks, date)` pure helper that returns `max(sortOrder) + 1` for the bucket (or `0` if empty). Used by `addTask` and `updateTask`'s date-change branch.
- [x] 1.3 Unit-test both helpers in `src/modules/tasks/store.helpers.test.ts` (or co-located): empty bucket, single-task bucket, gapped bucket, duplicate bucket (for `compactBucket`), cross-bucket isolation.

## 2. addTask fix

- [x] 2.1 Replace the `state.tasks.filter(...).length` sortOrder computation in `store.ts:74-77` with `nextSortOrder(state.tasks, date !== undefined ? date : null)`.
- [x] 2.2 Add a test in `store.test.ts`: add to a bucket that has a gap (sortOrders `[0, 2]`), assert the new task gets `sortOrder: 3`, not `2`.
- [x] 2.3 Add a test: first task in an empty bucket gets `sortOrder: 0`.
- [x] 2.4 Add a test: undated bucket (`date: null`) uses the same `max + 1` rule.

## 3. updateTask date-change renumber

- [x] 3.1 In `updateTask` (`store.ts:82-87`), detect `updates.date !== undefined && updates.date !== existingTask.date`. When true, compute `newSortOrder = nextSortOrder(state.tasks, updates.date)` and include `sortOrder: newSortOrder` in the merged update for that task.
- [x] 3.2 When `updates.date` is undefined or equals the existing date, `sortOrder` MUST NOT appear in the merged update. Group-only changes (`updates.groupId` alone) leave `sortOrder` untouched.
- [x] 3.3 Add a test: move a task to an empty target bucket → `sortOrder: 0`.
- [x] 3.4 Add a test: move a task to a non-empty target bucket with sortOrders `[0, 1, 3]` → new task gets `sortOrder: 4`.
- [x] 3.5 Add a test: source bucket is left with a gap (no compaction side effect).
- [x] 3.6 Add a test: `updateTask(id, { groupId })` alone does not change `sortOrder`.
- [x] 3.7 Add a test: `updateTask(id, { date, groupId })` applies the date-change renumber and the `groupId` update together.

## 4. reorderTasks rollback + defensive compact

- [x] 4.1 Change `reorderTasks` signature back to `(params: { date: string | null; taskIds: string[] }) => void` (or positional `(date, taskIds)` to match the spec exactly — pick whichever matches the existing call-site style; the spec text uses positional, the current code uses destructured-object).
- [x] 4.2 Remove the `debugger` statement at `store.ts:111`. (Not found in current code — already absent.)
- [x] 4.3 Phase 1 (defensive compact): inside the `set` callback, call `compactBucket(state.tasks, date)` to get a tasks array with the bucket healed. Use this compacted array as the basis for Phase 2.
- [x] 4.4 Phase 2 (redistribute): from the compacted array, take the tasks whose `id` is in `taskIds` (collect once, validate against the bucket's `date`), collect their now-unique sortOrders, sort ascending, and assign positionally to `taskIds` in order. Tasks not in `taskIds` keep their compacted sortOrder.
- [x] 4.5 Keep the warn-and-skip behavior for ids in `taskIds` that don't exist or are not in the bucket: emit a single `console.warn`, exclude them from Phase 2.
- [x] 4.6 When `taskIds` has zero valid ids for the bucket, Phase 1's compaction still runs and heals the bucket; Phase 2 is a no-op.
- [x] 4.7 Update existing tests in `store.test.ts` "Task Store - reorderTasks" block: every `reorderTasks({ taskIds: [...] })` call gains the `date` argument. Verify each test's expectation still holds under compact-then-redistribute.
- [x] 4.8 Add a test: a bucket with duplicate sortOrders `[0, 1, 1, 3]` is healed to a dense `0..N-1` sequence when `reorderTasks` is called with all its ids in their current visible order.
- [x] 4.9 Add a test: `reorderTasks(date, [])` with zero valid ids still compacts the bucket (defensive compact fires, Phase 2 is skipped).
- [x] 4.10 Add a test: tasks in a different bucket are completely untouched (no `sortOrder`, `groupId`, `date`, or object identity change) after a reorder in another bucket.

## 5. reassignTasks compaction

- [x] 5.1 In `reassignTasks(fromGroupId, toGroupId)` (`store.ts:142-148`), after the `groupId` rewrite, collect the set of distinct `date` values among the moved tasks.
- [x] 5.2 For each affected date, run `compactBucket` over the full post-rewrite tasks array. Return the result as the new `tasks` value in the `set`.
- [x] 5.3 Buckets that contain no moved tasks MUST NOT be compacted (verify via `compactBucket`'s grouping logic — it only touches the named bucket — or by short-circuiting if no task in that bucket was moved). Also: short-circuit `reassignTasks` entirely when no tasks match `fromGroupId` to avoid unnecessary re-renders.
- [x] 5.4 Add a test: two tasks with the same `date` and `sortOrder: 0` in different groups, `reassignTasks` merges them into one group, the bucket's duplicates are healed to `0..N-1`.
- [x] 5.5 Add a test: a bucket with no moved tasks (all tasks in a different group) is left unchanged, including pre-existing duplicates.

## 6. TaskList call-site update + debug cleanup

- [x] 6.1 In `TaskList.tsx:47`, pass `date` into `reorderTasks`: `reorderTasks({ date, taskIds: reorderedIds })` (matching the chosen signature form from 4.1).
- [x] 6.2 Remove the `console.log('ASD', tasks.map(...), reorderedIds)` at `TaskList.tsx:42-46`. (Not found in current code — already absent.)
- [x] 6.3 Update `TaskList.sortable.test.tsx` if any test stubs `reorderTasks` with the old `{ taskIds }` signature — adjust the mock/spy to expect the new shape. (No stubs found — no change needed.)

## 7. Rehydrate compaction via afterValidate

- [x] 7.1 In `store.ts:166-170`, add an `afterValidate: (state) => { state.tasks = compactAllBuckets(state.tasks) }` to the `createValidatedRehydrate` options. `compactAllBuckets` groups tasks by `date` (including `null`), runs `compactBucket` over each bucket in turn, and returns the fully normalized array.
- [x] 7.2 Add a small `compactAllBuckets(tasks)` helper (or inline by iterating over distinct `date` values) next to `compactBucket`. Reuse the same stable-sort-by-`(sortOrder, id)` logic.
- [x] 7.3 Verify by reading `persistence.ts:39` that `afterValidate` only fires after successful schema validation — no test needed for the skip-on-failure path, but add a comment at the call site noting the dependency.
- [x] 7.4 Add an integration-style test in `store.test.ts` (or a new `store.rehydrate.test.ts`): setState with a corrupted tasks array containing duplicate sortOrders in a date bucket, simulate rehydrate by calling the `afterValidate` hook (or by re-running `createValidatedRehydrate` against a mocked state), assert the bucket is healed to `0..N-1`.
- [x] 7.5 Add a test: a valid clean bucket remains in the same observable order after rehydrate compaction (no-op for clean data).
- [x] 7.6 Add a test: the undated bucket (`date: null`) is compacted the same way.
- [x] 7.7 Add a test: schema-validation failure path resets to `[]` and the compaction does NOT run (the `afterValidate` hook is not invoked). Test also asserts a single `console.warn` is emitted on validation failure.

## 8. Verification

- [x] 8.1 Run `npm run format` and confirm no formatting drift.
- [x] 8.2 Run `npm run typecheck` and confirm `tsc -b` passes.
- [x] 8.3 Run `npm run lint` and confirm no new errors.
- [x] 8.4 Run `npm run test` and confirm every task store, TaskList, planner, and persistence test passes. (361/361 tests pass across 30 test files.)
- [ ] 8.5 Manually verify in `npm run dev`: create 3 tasks on Today, delete the middle one, add a new task — assert the new task appears at the end, not in the deleted slot.
- [ ] 8.6 Manually verify: move a task from Today to Tomorrow via the date picker — assert it lands at the bottom of Tomorrow's list, and Today's list leaves a gap (visible ordering still correct).
- [ ] 8.7 Manually verify: switch a group filter on, drag within the filtered view, clear the filter — assert the unfiltered order is consistent with the drag and no silent re-interleaving occurred.
- [ ] 8.8 Manually verify: with corrupted localStorage (inject `daybox-tasks` with a duplicate sortOrder), reload — assert the duplicates are healed on load without any user action.
