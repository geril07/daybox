## Why

Selecting task title text currently enters edit mode but collapses the selection. Users should be able to replace the selected text without selecting it again.

## What Changes

- Transfer a selection contained in one task title into its textarea, including direction.
- Keep ordinary click caret placement and normal link navigation.
- Verify real browser mouse dragging and keyboard replacement with a recorded demo.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-management`: Preserve title selection when inline editing begins.

## Impact

TaskRow event handling and tests. No new runtime dependencies or storage changes.
