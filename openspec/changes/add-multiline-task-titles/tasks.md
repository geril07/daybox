## 1. Multiline entry and editing

- [x] 1.1 Replace quick-add and inline title inputs with accessible, content-growing textareas and a discoverable Shift+Enter hint, following existing UI conventions.
- [x] 1.2 Implement Shift+Enter newline insertion and plain Enter add/save, routing quick-add through native form submission and guarding IME composition. Retain blur saving, Escape cancellation, and the mobile submit button.
- [x] 1.3 Make trailing #group parsing accept multiline title content without changing group assignment precedence. Retain the 280-character limit and preserve drafts when validation fails.
- [x] 1.4 Add component tests for Enter, Shift+Enter, paste, composition, blur, Escape, mobile submission, multiline group suffixes, and invalid drafts.

## 2. Display and storage

- [x] 2.1 Preserve internal line breaks and normal wrapping in task rows, task action sheet headers, and timer task titles. Remove conflicting title truncation and retain safe clickable links.
- [x] 2.2 Add display regression tests for multiline text and links, including link-click isolation. Verify newline persistence and JSON export/import with automated tests.

## 3. Verification

- [x] 3.1 Verify in a browser at desktop and narrow touch viewports: textarea growth, keyboard submission, full title display, long URL wrapping, timer layout, and usable row controls. Record any unverified software-keyboard behavior.
- [x] 3.2 Run npm run format, npm run typecheck, npm run lint, and npm run test -- --run. Resolve failures caused by this change.
