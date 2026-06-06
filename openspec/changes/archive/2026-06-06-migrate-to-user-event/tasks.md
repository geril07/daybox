## 1. Install

- [x] 1.1 Run `npm install --save-dev @testing-library/user-event@^14`. Confirm the resolved version is in the v14 line (14.x).
- [x] 1.2 Confirm `package.json` `devDependencies` contains `@testing-library/user-event: ^14.x`. Run `npm run typecheck` — the new package's types are present.
- [x] 1.3 Smoke-test the install: in a one-off `npx vitest run --reporter=verbose` invocation against the existing `AddTaskRow.test.tsx`, the suite still runs (no test changes yet — this is just a "did the install break the resolver" check). All existing tests pass.

## 2. Migrate `AddTaskRow.test.tsx`

- [x] 2.1 Replace `import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'` with `import { render, screen, cleanup, within } from '@testing-library/react'` and add `import userEvent from '@testing-library/user-event'`.
- [x] 2.2 In every `it(...)` block, change the callback to `async` and add `const user = userEvent.setup()` as the first line.
- [x] 2.3 Replace the `type(value: string)` helper. Remove the `act(() => fireEvent.change(...))` body; the helper is replaced by direct `await user.type(getAddInput(), value)` calls at the call sites (see 2.4) — the helper is no longer useful because `user.type` requires a focused input, which most call sites set up with `user.click(input)` first.
- [x] 2.4 At each former `type('X')` call site, replace with:
  ```ts
  const input = getAddInput()
  await user.click(input) // focuses the input
  await user.type(input, 'X') // types char-by-char, fires onChange per char
  ```
  This affects ~10 tests that begin with `type('...')`.
- [x] 2.5 Replace every `act(() => fireEvent.keyDown(input, { key: 'X' }))` with `await user.keyboard('{X}')`. The input must be focused first (most tests already do `input.focus()`; for the few that do not, add `await user.click(input)` before the keyboard call). This affects ~10 sites.
- [x] 2.6 Replace `act(() => fireEvent.click(workButton))` with `await user.click(workButton)`. This affects the "clicking a suggestion rewrites the input" test.
- [x] 2.7 Replace the outside-click two-liner:
  ```ts
  fireEvent.mouseDown(screen.getByTestId('outside'))
  fireEvent.click(screen.getByTestId('outside'))
  ```
  with `await user.click(screen.getByTestId('outside'))`. Run the test in isolation; if the popover does not close, fall back to `await user.pointer({target: screen.getByTestId('outside')}, {keys: '[MouseLeft][MouseLeft]'})` (down + up) — but expect the simple form to work because `@base-ui/react`'s `Popover` outside-click listens on `mousedown`, which `userEvent.click` fires.
- [x] 2.8 Remove the `act` import from the import line. Verify no `act(` calls remain in the file (there should be zero).
- [x] 2.9 Run `npx vitest run src/features/tasks/components/AddTaskRow.test.tsx`. All tests pass.

## 3. Migrate `TaskRow.test.tsx`

- [x] 3.1 Replace `import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'` with `import { render, screen, cleanup } from '@testing-library/react'` and add `import userEvent from '@testing-library/user-event'`.
- [x] 3.2 In every `it(...)` block, change the callback to `async` and add `const user = userEvent.setup()` as the first line.
- [x] 3.3 Replace `openPomoPopover()` helper. Remove the `act(() => fireEvent.click(trigger))` body; the helper becomes:
  ```ts
  async function openPomoPopover() {
    const trigger = document.querySelector(
      '[data-slot="popover-trigger"]',
    ) as HTMLElement
    await user.click(trigger)
  }
  ```
  Update the 5 call sites from `openPomoPopover()` to `await openPomoPopover()`.
- [x] 3.4 Replace `fireEvent.click(checkbox)` with `await user.click(checkbox)` ("toggles completion on checkbox click" test).
- [x] 3.5 Replace `fireEvent.click(title)` with `await user.click(title)` (the click on the title that enters edit mode). The test then needs to find the input and clear+type:
  ```ts
  const input = document.querySelector('input[type="text"]') as HTMLInputElement
  expect(input).not.toBeNull()
  await user.clear(input)
  await user.type(input, 'Edited')
  await user.keyboard('{Enter}')
  ```
  (The component's `useEffect` auto-focuses the input on edit, so `user.clear` and `user.type` will target the now-focused input. If focus is racy, add an explicit `await user.click(input)` between the title click and the clear.)
- [x] 3.6 Replace `fireEvent.click(deleteBtn)` with `await user.click(deleteBtn)`.
- [x] 3.7 Replace `fireEvent.click(focusBtn)` with `await user.click(focusBtn)`.
- [x] 3.8 For the 4 `act(() => fireEvent.change(input, { target: { value: 'X' } }))` sites (estimate and completed inputs in the pomo popover), replace with:
  ```ts
  await user.clear(input)
  await user.type(input, 'X')
  ```
  The final assertion (which reads the store state) is unchanged. The "clearing the input is a no-op" test becomes:
  ```ts
  await user.clear(input)
  // no type — input is now empty
  ```
  Expect the store state to be unchanged because `handleEstimateChange(null)` returns early.
- [x] 3.9 Remove the `act` import from the import line. Verify no `act(` calls remain.
- [x] 3.10 Run `npx vitest run src/features/tasks/components/TaskRow.test.tsx`. All tests pass.

## 4. Spec delta

- [x] 4.1 The delta spec is at `openspec/changes/migrate-to-user-event/specs/testing/spec.md` and adds one `ADDED Requirement: Test interaction via user-event` with three scenarios ("Component tests use userEvent", "fireEvent is banned from test files", "Per-test user instance"). The new `testing` capability is created on archive via the OpenSpec delta-sync. Already drafted — no additional authoring needed.

## 5. Verification

- [x] 5.1 Run `npm run format`. No diff (or only the rewritten-test diff, which is expected).
- [x] 5.2 Run `npm run typecheck`. No errors.
- [x] 5.3 Run `npm run lint`. No errors. Verify the `noUnusedLocals` rule is happy — the dropped `act` and `fireEvent` imports should not leave unused references.
- [x] 5.4 Run `npm run test`. All tests pass — same number of `it(...)` blocks as before, same assertion outcomes, no skipped tests.
- [x] 5.5 Run `rg "fireEvent" src/ --type ts --type tsx` and confirm zero matches.
- [x] 5.6 Run `rg "\bact\(" src/ --type ts --type tsx` and confirm matches only in non-component test files (e.g. `bootstrap.test.ts` if applicable) — not in `AddTaskRow.test.tsx` or `TaskRow.test.tsx`.
