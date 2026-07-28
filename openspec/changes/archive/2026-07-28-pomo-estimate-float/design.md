## Context

`TaskV1Schema` constrains `pomoEstimate` with `z.number().int().min(0).max(99)`. Zod 4 maps `.int()` to `safeint`, so any non-integer (e.g. `1.5`) fails `safeParse`. On rehydrate, `createValidatedRehydrate` treats any schema failure as a full slice reset — one bad task wipes every task.

Fractional values already land in localStorage: `TaskRow`'s estimate `NumberInput` (base-ui `NumberField`) has no `step` lock to integers, and users can type decimals. Progress math (`pomoCompleted / pomoEstimate`) and the `X/Y` label already handle floats.

## Goals / Non-Goals

**Goals:**

- Accept finite non-integer `pomoEstimate` in `[0, 99]` on rehydrate, import, and store writes.
- Preserve existing integer estimates and all other task fields unchanged.
- Document the wider contract in task-management specs.

**Non-Goals:**

- Changing `pomoCompleted` (stays integer; timer still `+1`).
- UI redesign of `NumberInput` (step, formatting, half-pomo presets).
- Schema version bump / migration pipeline.
- Rounding, quantization, or display formatting of fractions.
- Changing max bound (still 99) or independence of estimate vs completed.

## Decisions

### 1. Drop `.int()` on `pomoEstimate` only

- **Choice:** `pomoEstimate: z.number().min(0).max(99)` in `src/modules/tasks/schema/v1.ts`. Keep `pomoCompleted: z.number().int().min(0).max(99)`.
- **Rationale:** Matches the reported failure path and user intent (fractional planning estimates). Completed counts are whole focus intervals from the timer.
- **Alternatives:**
  - Also float `pomoCompleted` — rejected for now; no ask, timer is integer-only.
  - Coerce with `.transform(Math.round)` — rejected; would silently alter user-entered fractions and still not explain past resets.
  - Reject floats in UI (`step={1}`) and leave schema int — rejected; user wants floats allowed.

### 2. In-place v1 widen, no version bump

- **Choice:** Edit `TaskV1Schema` in place. No `v2`, no `migrateFrom`.
- **Rationale:** Widening is backward-compatible: every previously valid integer remains valid. Import/export already reuses `TaskSchema`.
- **Alternatives:** New schema version — unnecessary ceremony for a pure relaxation.

### 3. No UI or display changes in this change

- **Choice:** Leave `NumberInput` props and `PomoArea` rendering as-is (`2/1.5`, progress %).
- **Rationale:** Existing code already works with floats; the bug is validation-only. Optional polish (step, toFixed) can be a follow-up if display feels noisy.

## Blast area

| Area                               | Effect                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| `schema/v1.ts`                     | Only code change required                                             |
| `types.ts` / `Task`                | Still `number`; no callers break                                      |
| `store.ts` / `updateTask`          | Already patches `Partial<Task>`                                       |
| Rehydrate (`daybox-tasks`)         | Stops reset when any task has fractional estimate                     |
| Import/export (`data-portability`) | Same schema; fractional estimates round-trip                          |
| `TaskRow` / progress bar           | Already float-safe division                                           |
| Timer `pomoCompleted + 1`          | Unchanged                                                             |
| Tests                              | Add schema parse case for e.g. `1.5`; fixtures with ints remain valid |

## Risks / Trade-offs

- **[Risk] Floating-point noise (e.g. `0.1 + 0.2`)** → Mitigation: users type values via NumberInput; no arithmetic on estimate in the store. Out of scope to snap-to-grid.
- **[Risk] Display shows long decimals** → Mitigation: accept for now; follow-up can format if needed.
- **[Risk] User types float into `pomoCompleted` and rehydrate still resets** → Mitigation: out of scope; completed stays int. If it becomes a problem, open a separate change.
- **[Trade-off] Schema allows any finite float in range, not only "nice" halves** → Acceptable; simpler than a custom multiple-of-0.5 refine.

## Migration Plan

1. Ship schema widen.
2. Users whose store already reset need to restore from backup/export if they have one; this change only prevents future wipes and accepts existing fractional blobs still on disk.
3. Rollback: re-add `.int()` (would again reject fractional blobs).

## Open Questions

_None — scope is the single-field schema relaxation._
