## ADDED Requirements

### Requirement: Task rehydration compacts every date bucket

The tasks store SHALL run a per-bucket compaction pass after successful schema validation on rehydration and before the rehydrated state is made visible. The pass SHALL group all tasks by `date` (including `null` for the undated bucket), and for each bucket SHALL stable-sort the bucket's tasks by `(sortOrder, id)` and reassign `sortOrder = 0..N-1` in that order.

This pass heals duplicate or gapped sortOrders that may exist in persisted data produced by earlier versions of the store (prior to the uniqueness invariant). It runs unconditionally on every rehydration, not only when duplicates are detected, so the invariant is enforced at load time without a separate "is the data clean?" check.

The pass SHALL run via the `afterValidate` hook of `createValidatedRehydrate` and SHALL NOT run when schema validation fails (the reset-to-defaults path owns that case). The pass SHALL NOT mutate any task field other than `sortOrder`.

#### Scenario: Duplicate sortOrders are healed on load

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a valid blob whose tasks for `date: '2026-06-25'` have sortOrders `[0, 1, 1, 3]`
- **AND** the app rehydrates the tasks store
- **THEN** after rehydration, the bucket for `date: '2026-06-25'` has no duplicate sortOrders
- **AND** the bucket's sortOrders are a dense `0..N-1` sequence
- **AND** the stable sort preserved the relative order of the two tasks that previously shared `sortOrder: 1` (tiebroken by `id`)

#### Scenario: Gaps are closed on load

- **WHEN** a persisted bucket has sortOrders `[0, 2, 3]` (a gap at 1)
- **AND** the app rehydrates the tasks store
- **THEN** after rehydration, the bucket's sortOrders are `[0, 1, 2]` in the same task order

#### Scenario: Already-clean buckets are unchanged in observable order

- **WHEN** a persisted bucket has sortOrders `[0, 1, 2]` with no duplicates and no gaps
- **AND** the app rehydrates the tasks store
- **THEN** the bucket's tasks remain in the same order
- **AND** the sortOrders remain `[0, 1, 2]`

#### Scenario: Undated bucket is compacted the same way

- **WHEN** a persisted `date: null` bucket has sortOrders `[2, 0, 2]`
- **AND** the app rehydrates the tasks store
- **THEN** after rehydration, the `date: null` bucket has no duplicate sortOrders
- **AND** its sortOrders are a dense `0..N-1` sequence

#### Scenario: Schema-validation failure skips the compaction pass

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a blob that fails `TaskStateSchema`
- **THEN** the store is reset to its empty default (`tasks: []`)
- **AND** the compaction pass does not run (there is nothing to compact)
- **AND** a `console.warn` is emitted once
