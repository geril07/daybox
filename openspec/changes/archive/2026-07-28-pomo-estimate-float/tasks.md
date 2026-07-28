## 1. Schema

- [x] 1.1 In `src/modules/tasks/schema/v1.ts`, change `pomoEstimate` from `z.number().int().min(0).max(99)` to `z.number().min(0).max(99)`. Leave `pomoCompleted` as integer.

## 2. Tests

- [x] 2.1 Add tests (new `schema/v1.test.ts` or extend an existing tasks schema/store test) asserting `TaskSchema` accepts `pomoEstimate: 1.5`, accepts integer `3`, and rejects `99.5`.
- [x] 2.2 Add or extend a rehydrate/store test asserting a tasks blob with a fractional `pomoEstimate` does not reset the store to defaults.
- [x] 2.3 Optionally assert `TaskRow` can set `pomoEstimate` to a fractional value (e.g. `2.5`) via the estimate editor if the existing NumberInput test harness supports typing decimals; skip if the harness only drives steppers.

## 3. Verify

- [x] 3.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test` (or the focused vitest files) and fix any fallout.
