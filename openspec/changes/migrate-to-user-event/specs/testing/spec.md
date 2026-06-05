## ADDED Requirements

### Requirement: Test interaction via user-event

Component tests in `src/` SHALL use `@testing-library/user-event` (v14) for all DOM interactions (clicks, keyboard events, input changes, focus management, outside-click). The `fireEvent` API from `@testing-library/react` SHALL NOT be imported in test files. Component test functions that perform user interactions SHALL be `async` and SHALL instantiate a fresh `userEvent.setup()` instance per test.

#### Scenario: Component tests use userEvent

- **WHEN** a test file renders a component and simulates a user action (clicking a button, typing into an input, pressing a key, triggering an outside-click)
- **THEN** the test SHALL call the corresponding `userEvent` method (`user.click`, `user.type`, `user.keyboard`, `user.clear`) and `await` the result
- **AND** the test function SHALL be `async`
- **AND** the test SHALL obtain its `user` instance via `const user = userEvent.setup()` at the start of the test body

#### Scenario: fireEvent is banned from test files

- **WHEN** linting or reviewing a test file under `src/`
- **THEN** the file SHALL NOT import `fireEvent` from `@testing-library/react`
- **AND** the file SHALL NOT call `act(...)` to wrap a fired event (the `userEvent` library handles batching internally)
- **AND** any test that needed `fireEvent` to work around a `userEvent` limitation SHALL be flagged for re-evaluation rather than merged as-is

#### Scenario: Per-test user instance

- **WHEN** a `describe` block contains multiple `it` cases that each simulate user actions
- **THEN** each `it` case SHALL call `userEvent.setup()` independently
- **AND** the user instance SHALL NOT be hoisted to `describe` scope or to a `beforeEach` that shares a single instance across tests
- **AND** the rationale (per `userEvent` v14 docs) is that the instance tracks its own key/pointer/clipboard state and a shared instance leaks state across tests
