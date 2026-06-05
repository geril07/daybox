## Context

The component-test layer in this project is `vitest` + `@testing-library/react` + `jsdom` (configured in `vite.config.ts`). The two interaction-heavy test files today — `AddTaskRow.test.tsx` and `TaskRow.test.tsx` — drive the DOM with `fireEvent` and wrap every dispatch in `act(() => ...)` to silence React's "not wrapped in act" warning. Together they account for:

- **32 `fireEvent` calls** across 2 files (22 in `AddTaskRow.test.tsx`, 10 in `TaskRow.test.tsx`)
- **20 `act()` wrappers** across the same 2 files (all of them wrapping a `fireEvent` call)
- **0 other test files** using `fireEvent` — store tests, queries tests, and the dates tests exercise pure functions and have no need for it.

The pattern repeats: `act(() => fireEvent.change(input, { target: { value: 'X' } }))` for input updates, `act(() => fireEvent.keyDown(input, { key: 'ArrowDown' }))` for keyboard nav, and `fireEvent.mouseDown(...) + fireEvent.click(...)` for outside-click (two calls to express one user action).

The React 19 + Testing Library + Vitest 4 + jsdom 29 stack is fully compatible with `userEvent` v14 — `userEvent` is a peer of `@testing-library/dom` (which `@testing-library/react` already pulls in) and ships an ESM build that vitest 4's resolver handles without config. The `setup()` API is the v14+ pattern (replacing the v13 direct `userEvent.click(...)` calls); each call returns a Promise, all calls are `await`ed, and the library wraps its internal dispatches in `act()` automatically.

## Goals / Non-Goals

**Goals:**

- Replace every `fireEvent` call in component tests with the equivalent `userEvent` call.
- Drop every `act()` wrapper that exists solely to wrap a `fireEvent` call. (If any `act()` remains in the test files after migration, it's a bug in the migration — there are no other state-mutating sites in these two files.)
- Make the outside-click test in `AddTaskRow.test.tsx` a single `await user.click(...)` call instead of the two-line `mousedown` + `click` sequence.
- Establish the `userEvent` pattern as the project convention so future test files don't reintroduce `fireEvent`.
- All existing assertions, store fixtures, and test names remain identical. This is a behavior-preserving refactor.

**Non-Goals:**

- Adding `@testing-library/jest-dom` custom matchers. The current tests use only vitest built-ins and the migration stays within that constraint.
- Refactoring store/queries/dates tests — they don't use `fireEvent` and have no need for `userEvent`.
- Sharing a `setupUser()` helper across files. Two files doesn't justify a cross-file helper; per-test `userEvent.setup()` matches the per-test store-reset pattern already in use.
- Restructuring the `type()` helper in `AddTaskRow.test.tsx` into something fancier than an inline `await user.type(getAddInput(), value)` per call. The helper is replaced by direct calls; the abstraction didn't earn its keep.
- Touching `src/test-setup.ts` (which currently only stubs `ResizeObserver`).

## Decisions

### 1. `userEvent.setup()` per test, not per `describe`

- **Choice:** `const user = userEvent.setup()` is called at the top of every `it` callback (or in `beforeEach` and assigned to a per-test variable).
- **Rationale:** v14+ requires a per-test instance because each instance tracks its own key state, pointer position, and clipboard. A `describe`-scoped instance would leak state across tests (a key still "down" at the end of one test could affect the next). The existing `beforeEach` already resets store state per test; pairing a fresh `user` with that is consistent.
- **Alternative considered:** A `beforeEach` that sets `currentUser = userEvent.setup()`. Rejected because typing `const user = userEvent.setup()` once per test is shorter than the indirection.

### 2. Drop `act()` wrappers entirely in the migrated files

- **Choice:** After migration, the only `act(...)` import in `AddTaskRow.test.tsx` and `TaskRow.test.tsx` is removed from the import line.
- **Rationale:** Every existing `act()` in those files wraps a `fireEvent` call. `userEvent` wraps its dispatches internally. The `act` import is therefore dead code post-migration; leaving it in would be a lint warning under `noUnusedLocals` (`typescript` strict mode in this project enables it per `tsconfig`).
- **Alternative considered:** Keep `act` for the few sites where a state assertion happens immediately after a non-event-triggered mutation (e.g. a direct `useTaskStore.setState(...)` call). Rejected — neither file does that. The mutation pattern is "render → interact → assert", with store setup in `beforeEach`.

### 3. Outside-click test collapses to one `user.click` call

- **Choice:** Replace
  ```ts
  fireEvent.mouseDown(screen.getByTestId('outside'))
  fireEvent.click(screen.getByTestId('outside'))
  ```
  with
  ```ts
  await user.click(screen.getByTestId('outside'))
  ```
- **Rationale:** `userEvent.click` dispatches the full pointer sequence: `pointerover → pointerenter → pointerdown → mousedown → focus → pointerup → mouseup → click`. The current test fires both `mousedown` and `click` to satisfy `@base-ui/react`'s `Popover` outside-click listener, which checks `mousedown` on the document. `userEvent` fires `mousedown` as part of the click sequence, so the listener sees the same event without the test having to know which DOM event the library listens for. This is a concrete instance of "the test reflects what the user does" — the user clicks once, the test clicks once.
- **Risk:** If `@base-ui/react`'s `Popover` outside-click listener attaches to `pointerdown` (not `mousedown`) on some browsers or versions, the test could break. The library's documented outside-click event is `mousedown`, but task 1 includes a verification step that the popover actually closes after `await user.click(...)`. If it doesn't, the test falls back to `user.pointer({target: ...}, {keys: '[MouseLeft]'})` or to a direct `fireEvent.pointerDown` (mixing APIs is acceptable for one site if needed).

### 4. `user.keyboard` requires focus; a few tests gain an explicit `input.focus()`

- **Choice:** Tests in `AddTaskRow.test.tsx` that chain a keyboard event after the `type()` helper — currently passing the input element explicitly to `fireEvent.keyDown` — are rewritten to focus the input (or use the input as the `user.keyboard` target via the second argument: `user.keyboard('{ArrowDown}', { document, ... })` is not a thing; the canonical way is `await user.click(input)` to focus, then `user.keyboard(...)`).
- **Rationale:** `user.keyboard()` dispatches on `document.activeElement`. `fireEvent.keyDown(input, ...)` dispatches on the explicit `input`. The two patterns diverge on focus. Since the current tests already use `input.focus()` in most cases (and the few that don't, e.g. the `ArrowDown` test, get away with the explicit-target pattern), the migration is mostly mechanical plus a couple of `user.click(input)` additions.
- **Risk:** If the focus state is not what the implementation expects, the keyboard handler doesn't fire. Task 3 includes a per-test verification (each migrated test runs and passes).

### 5. Input change via `user.type` after `user.clear`, not via single `user.type`

- **Choice:** Replace `fireEvent.change(input, { target: { value: 'X' } })` with `await user.clear(input); await user.type(input, 'X')`.
- **Rationale:** `user.type` appends; it does not replace. Going from `'Test Task'` to `'Edited'` requires a clear first. The clear produces a transient `null` value to the component's `onChange` handler — `TaskRow`'s edit handler is `setEditTitle(e.target.value)`, which accepts the empty string, then `user.type('Edited')` types each character, firing `input` + `change` for each. The final state is correct; the test assertion is on the saved title after `Enter`, which the component commits from `editTitle` state.
- **Risk:** If the component's `onChange` does any work per character (e.g. validation, debounced save), per-keystroke fire could change behavior. Neither `AddTaskRow` nor `TaskRow` has per-character logic — both just `setTitle(e.target.value)` and `setEditTitle(e.target.value)` — so this is a clean swap.
- **Alternative considered:** Use `user.type(input, 'X')` only when the input is empty. Rejected because the call site context (which test, what the input already contains) makes the call site harder to read. Always-clear-then-type is uniform.

### 6. `+`/`-` button tests: keep using `user.click`, no special handling

- **Choice:** The `+`/`-` tests in `TaskRow.test.tsx` (which check `disabled` state) become `await user.click(plusButton)` then `expect(plusButton.disabled).toBe(true)` — but since the assertion is on `disabled`, not on the side effect, the click is unnecessary. The migrated form is just `const plusButton = screen.getByText('+'); expect(plusButton).toBeDisabled()`. (Or kept as `user.click` to mirror current shape; the assertion still passes because `disabled` blocks the click handler.)
- **Rationale:** `userEvent` honors the `disabled` attribute on a `<button>` and does not dispatch the click. The assertion on `disabled` is what the test cares about; the click is incidental. Trimming the click makes the test read as "is the button disabled?" rather than "click the button — and by the way, is it disabled?".
- **Alternative considered:** Keep the click for parity with the current shape. Rejected because trimming dead code is the whole point of the migration.

### 7. No change to `src/test-setup.ts`

- **Choice:** The ResizeObserver stub stays. No `import '@testing-library/jest-dom/vitest'` is added.
- **Rationale:** `userEvent` requires no global setup. Adding the jest-dom extend would be a separate change for a separate benefit (custom matchers), and the current test suite uses no jest-dom matchers.

### 8. Capability for the spec delta: `testing`

- **Choice:** The new "Test interaction via user-event" requirement lives in a new capability `openspec/specs/testing/spec.md`, created on archive via the OpenSpec delta-sync.
- **Rationale:** `testing` is the natural home for test-author rules (which APIs, how to set them up, async discipline). `shared-layer` is about module boundaries and test-infrastructure file locations — colocating API-choice rules there conflates two concerns. A dedicated capability is a one-time cost (one spec.md) and pays back the first time a second test-convention rule is needed (e.g. "every component test must include an accessibility assertion", "store tests must not render components", etc.). The new capability's Purpose section explicitly carves out the boundary with `shared-layer`: `shared-layer` covers where test-setup files live; `testing` covers how component tests are written.

## Risks / Trade-offs

- **Per-keystroke `onChange` could change component behavior.** Neither component does per-character work, but if a future component validates per keystroke, this migration's pattern would surface that. → Mitigation: each migrated test runs against the current component; the contract is verified by the test passing.
- **Outside-click event-source mismatch.** `@base-ui/react`'s `Popover` outside-click listener could in principle attach to `pointerdown` or `mousedown`. `userEvent.click` fires both. → Mitigation: Task 1 includes an explicit pass/fail check; fallback is to use `user.pointer(...)` or a single `fireEvent.pointerDown`.
- **`@testing-library/user-event` adds ~50KB to devDependencies and is an extra transitive dependency surface.** → Mitigation: it is the official Testing Library companion (same org as `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`); the footprint is in line with the rest of the suite.
- **Tests become async, which surfaces `noUnusedLocals` for any unused `user` instance.** → Mitigation: every test in the migrated files uses `user`; no `let user` declarations. Task 2 verifies lint passes.
- **Vitest 4 + `userEvent` v14 + React 19 + jsdom 29 combo is not explicitly matrix-tested by the libraries.** It is in the supported-version ballpark for all four, and the project already runs the other three together. → Mitigation: task 1 includes `npm run test` and full verification.

## Migration Plan

None. The migration is test-only. No localStorage keys, no schema, no data backfill. After the change:

- `fireEvent` is not imported in any test file.
- `act` is not imported in `AddTaskRow.test.tsx` or `TaskRow.test.tsx`.
- `userEvent` is imported in both.
- `npm run test` passes with the same number of tests and the same assertions as before.

## Open Questions

None. All decisions resolved during exploration.
