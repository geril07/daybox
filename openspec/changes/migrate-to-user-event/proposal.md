## Why

The two component test files that exercise user interaction — `AddTaskRow.test.tsx` and `TaskRow.test.tsx` — drive the DOM with `@testing-library/react`'s `fireEvent`, which dispatches single synthetic events on a target element regardless of focus, pointer sequence, or surrounding state. This produces tests that don't reflect how the component is actually used:

- A click on a button that the user can't focus (or that has no pointer-down handler) still fires.
- An outside-click handler that listens on `mousedown` must be triggered with a second `fireEvent.mouseDown(...)` call alongside the `click` — there is no way to express "the user clicked outside" in one call.
- Typing into an input is a single `change` event with a pre-built `target.value`, bypassing focus, caret, key-by-key state, and React's controlled-input commit model.
- Keyboard navigation on the input requires passing the `input` element into `fireEvent.keyDown(input, ...)` explicitly, hiding the fact that the implementation depends on the input actually holding focus.

On top of that, every async state update is wrapped in `act(() => ...)` to silence React's "not wrapped in act" warning — ~20 `act()` blocks across the two files that exist solely to keep the warning quiet, not because the test cares about the batching boundary.

`@testing-library/user-event` (v14) is the official companion: it walks the real `pointerover → pointerdown → mousedown → focus → mouseup → click` sequence, manages focus across calls, types character-by-character, and wraps state updates internally so callers no longer need `act()`. Migrating is mechanical for click/keyboard/change sites and clarifies intent in the tests that benefit most (outside-click, keyboard navigation, edit-mode enter/exit).

## What Changes

- **Add `@testing-library/user-event` (v14)** to `devDependencies`.
- **Migrate all `fireEvent` and `act()` calls** in `src/features/tasks/components/AddTaskRow.test.tsx` (22 `fireEvent`, 11 `act`) and `src/features/tasks/components/TaskRow.test.tsx` (10 `fireEvent`, 5 `act`) to `userEvent` calls. No other test file uses `fireEvent`.
- **Make all affected test functions `async`** and instantiate `const user = userEvent.setup()` per test (not per `describe` — fresh state per test matches the current per-test setup pattern in both files).
- **Drop the `act()` wrappers** around event dispatches. `userEvent` handles batching internally.
- **Add an explicit focus step** in the few AddTaskRow tests that chain keyboard events after the `type()` helper without first focusing the input. With `fireEvent.keyDown(input, ...)`, the target element is passed explicitly; with `user.keyboard(...)`, the target is `document.activeElement`, so the input must be focused first. (Most tests already do `input.focus()` — only a handful need the call added.)
- **Document the convention** in `shared-layer` spec: new test files SHALL use `@testing-library/user-event`; the `fireEvent` import SHALL NOT appear in test files.

## Capabilities

### New Capabilities

- `testing`: defines component-test conventions. New requirement `Test interaction via user-event` bans `fireEvent` from test files and mandates `userEvent` v14 for all DOM interactions, with a fresh `userEvent.setup()` instance per test.

## Impact

- `src/features/tasks/components/AddTaskRow.test.tsx` — full rewrite of interaction sites; assertions and store-fixture setup unchanged.
- `src/features/tasks/components/TaskRow.test.tsx` — full rewrite of interaction sites; assertions and store-fixture setup unchanged.
- `package.json` — add `@testing-library/user-event` to `devDependencies`. No version pinning required; caret-range of latest v14.
- `src/test-setup.ts` — **no change**. `userEvent` requires no global setup; the only setup file concern would be `import '@testing-library/jest-dom/vitest'`, but the existing tests use only vitest built-in matchers (`toBeTruthy`, `toBeNull`, `toHaveLength`, `toBeUndefined`) and adding the extend is out of scope.
- `src/features/tasks/components/AddTaskRow.tsx`, `src/features/tasks/components/TaskRow.tsx`, `src/shared/ui/number-input.tsx` — **no change**. Migration is test-only. (`NumberField` from `@base-ui/react` accepts keystrokes fired by `userEvent.keyboard` the same way it accepts `fireEvent.change`; verified in source: `NumberField` listens for `change` and `input` events on its internal `<input>`, both of which `userEvent.type` fires.)
- No data, no schema, no migration code.

## Out of scope

- Adding `@testing-library/jest-dom` custom matchers (e.g. `toBeInTheDocument`) — would be a follow-up; not needed for any current assertion.
- Adding user-event to store-level tests (`*.store.test.ts`, `*.queries.test.ts`) — those tests don't render components; they exercise pure store/utility functions.
- Refactoring the test setup to share a `setupUser()` helper across files — two files doesn't justify a shared helper; per-test `userEvent.setup()` is the recommended pattern.
- Changing the `act` import for the one remaining legitimate use in `bootstrap.test.ts` — that test does not use `fireEvent` and is unaffected.
