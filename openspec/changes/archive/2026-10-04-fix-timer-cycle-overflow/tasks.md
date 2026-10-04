## 1. Regression Coverage

- [x] 1.1 Add store tests for manually bypassed long breaks, interval reductions, and rehydrated excess counts.
- [x] 1.2 Add timer-bar tests preserving existing progress labels and verifying matching natural-completion and skip behavior.

## 2. Implementation

- [x] 2.1 Replace modulo-based long-break scheduling with threshold-based scheduling.
- [x] 2.2 Preserve original timer-bar text and layout, including completed counts above the long-break target.

## 3. Verification

- [x] 3.1 Run formatting, typecheck, lint, the full test suite, and OpenSpec validation.
- [x] 3.2 Verify both reproduction paths, reload recovery, and narrow-layout timer controls in the browser.
