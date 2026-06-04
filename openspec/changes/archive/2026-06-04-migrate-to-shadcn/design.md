## Context

We have hand-rolled wrappers in `src/shared/ui/` that isolate `@base-ui/react` from consumer code. These were written from scratch, have visual/interaction bugs, and consumers frequently bypass them with raw `<button>` elements and inline styles. shadcn v4 now natively supports Base UI, offering battle-tested component implementations generated via CLI.

## Goals / Non-Goals

**Goals:**

- Replace all hand-rolled `src/shared/ui/` wrappers with shadcn CLI-generated components backed by Base UI
- Add missing components: Input, Label, Separator, Badge, Card, Tabs
- Replace all raw `<button>` and inline style usage in consumers with shadcn components
- Adopt shadcn's CSS variable system, adapting current theme colors into it
- Keep same directory structure (`src/shared/ui/`) via shadcn's `aliases.ui` config

**Non-Goals:**

- Rewriting features or business logic
- Changing the underlying headless library (stays `@base-ui/react`)
- Adding complex new components like Command, Sidebar, Chart (future concern)
- Changing the Zustand stores, routing, or data model

## Decisions

### D1: shadcn v4 with `--base base`

Use `npx shadcn@latest init --base base` to generate components backed by `@base-ui/react`.  
**Alternative considered:** Sticking with Radix-based shadcn — it's more common but would require replacing `@base-ui/react` with radix packages, adding churn without benefit since the project already depends on base-ui.  
**Chosen:** Base UI aligns with existing dependency, zero new headless library cost.

### D2: Components output to `src/shared/ui/`

Configure `aliases.ui` → `@/shared/ui` and `aliases.utils` → `@/shared/lib`.  
**Rationale:** Keeps existing directory structure, minimises diff churn, consumer imports change minimally.

### D3: Add `@/` path alias

Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.app.json` and `resolve.alias` to `vite.config.ts`.  
**Rationale:** Required by shadcn's components.json. Also cleans up the existing `../../shared/ui` relative import mess.

### D4: Replace CSS entirely, adapt theme into shadcn variables

Remove current `src/index.css` content (except reset/body styles), run shadcn init to generate its CSS variable setup, then overlay our custom colours onto shadcn's variable names (`--color-background`, `--color-foreground`, etc.).  
**Rationale:** User explicitly requested this. Avoids fighting two CSS systems. shadcn's CSS variable approach is more flexible than our `var(--fg)` inline-style pattern.

### D5: Add components one-by-one via CLI

`npx shadcn@latest add <component>` for each needed component.  
**Rationale:** CLI ensures canonical implementation, handles registry URLs, dependencies, and file placement correctly. No hand-copying.

### D6: Naming alignment with shadcn conventions

| Old name        | shadcn name   | Reason                                                    |
| --------------- | ------------- | --------------------------------------------------------- |
| `SelectMenu` →  | `Select`      | shadcn standard                                           |
| `SidePanel` →   | `Sheet`       | shadcn's side-panel component is "Sheet"                  |
| `Toggle` →      | `Switch`      | shadcn's switch component is "Switch"                     |
| `RangeSlider` → | `Slider`      | shadcn standard                                           |
| `Popover` →     | `Popover`     | unchanged                                                 |
| `AlertDialog` → | `AlertDialog` | unchanged                                                 |
| `Button` →      | `Button`      | unchanged                                                 |
| `NumberInput` → | keep or drop  | No exact shadcn equivalent — decide during implementation |

## Risks / Trade-offs

- **[Risk] shadcn init overwrites `src/index.css`** → Mitigation: backup current CSS, run init, then overlay our theme colours onto shadcn's CSS variable system. Keep reset/body styles.
- **[Risk] `cn()` utility path mismatch** → Mitigation: shadcn expects `utils` at `src/lib/utils.ts` by default. Our `cn()` is at `src/shared/lib/utils.ts`. Configure `aliases.utils` to `@/shared/lib` to match.
- **[Risk] Breaking import changes across all feature files** → Mitigation: do this in a single focused pass with clear rename mapping. TypeScript catches missed updates.
- **[Risk] Base UI version mismatch** → Mitigation: pin `@base-ui/react` version to what shadcn's base variant expects (check registry deps after init).
- **[Trade-off] CSS variable names change** — Consumer code using inline `var(--fg)` directly must migrate to Tailwind utility classes (e.g., `text-foreground`). But this is the whole point — eliminate the inline style pattern.
