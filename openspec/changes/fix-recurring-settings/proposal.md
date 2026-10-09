## Why

New recurring series do not generate tasks until a lifecycle refresh or the next minute tick. Expanded series editors also make Settings difficult to scan as the list grows.

## What Changes

- Generate missing occurrences when series definitions change, without rewriting existing tasks.
- Show series in independently expandable accordion rows with compact summaries.
- Start existing rows collapsed and open newly created rows automatically.
- Animate panel height and chevrons while respecting reduced motion.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recurring-tasks`: Immediate generation after series changes and collapsible Settings editors.
- `shared-ui`: Add the shadcn Base UI accordion primitive.

## Impact

App-shell generation wiring, the tasks Settings panel, shared UI inventory, and regression tests. No persisted schema changes or new runtime dependencies.
