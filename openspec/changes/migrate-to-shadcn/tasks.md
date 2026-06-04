## 1. Setup & scaffolding

- [ ] 1.1 Backup current `src/index.css` and current `src/shared/ui/` to a temp dir
- [ ] 1.2 Add `@/` path alias to `tsconfig.app.json` and `vite.config.ts`
- [ ] 1.3 Run `npx shadcn@latest init --base base` — configure aliases to `@/shared/ui` and `@/shared/lib`, point CSS to `src/index.css`
- [ ] 1.4 Verify `components.json` and `src/shared/lib/utils.ts` are correct after init

## 2. CSS migration

- [ ] 2.1 Adopt shadcn's generated `src/index.css` — overlay current theme colors onto shadcn's CSS variable names (`--background`, `--foreground`, `--card`, `--border`, `--accent`, etc.)
- [ ] 2.2 Verify dark mode works with shadcn's `.dark` class variable overrides
- [ ] 2.3 Remove all `var(--fg)`, `var(--bg)`, `var(--border)` etc. inline style usages from `src/index.css` — replaced by Tailwind utilities

## 3. Core component replacements (CLI)

- [ ] 3.1 `npx shadcn@latest add button` — replace existing `src/shared/ui/button.tsx` + `button-variants.ts`
- [ ] 3.2 `npx shadcn@latest add input` — new component
- [ ] 3.3 `npx shadcn@latest add label` — new component
- [ ] 3.4 `npx shadcn@latest add separator` — new component
- [ ] 3.5 `npx shadcn@latest add badge` — new component
- [ ] 3.6 `npx shadcn@latest add card` — new component
- [ ] 3.7 `npx shadcn@latest add select` — replaces select-menu.tsx
- [ ] 3.8 `npx shadcn@latest add sheet` — replaces side-panel.tsx
- [ ] 3.9 `npx shadcn@latest add switch` — replaces toggle.tsx
- [ ] 3.10 `npx shadcn@latest add slider` — replaces range-slider.tsx
- [ ] 3.11 `npx shadcn@latest add alert-dialog` — replaces alert-dialog.tsx
- [ ] 3.12 `npx shadcn@latest add popover` — replaces popover-card.tsx
- [ ] 3.13 `npx shadcn@latest add tabs` — new component (replace view tab buttons)

## 4. Consumer migration — SettingsDrawer

- [ ] 4.1 Replace `<SidePanel>` → `<Sheet>` in SettingsDrawer, update compound children
- [ ] 4.2 Replace `<NumberInput>` → decide: keep existing or replace with `<Input type="number">`
- [ ] 4.3 Replace `<Toggle>` → `<Switch>` in auto-start + dark theme toggles
- [ ] 4.4 Replace `<SelectMenu>` → `<Select>` in alarm sound picker
- [ ] 4.5 Replace `<RangeSlider>` → `<Slider>` in volume control
- [ ] 4.6 Replace raw `<button>` Export → `<Button variant="outline">`
- [ ] 4.7 Replace raw `<button>` Import → `<Button variant="outline">` + AlertDialog trigger
- [ ] 4.8 Replace `onMouseEnter`/`onMouseLeave` hover patterns with Tailwind `hover:` classes
- [ ] 4.9 Replace inline `style={{ color: 'var(--...)' }}` with Tailwind utilities (e.g., `text-muted-foreground`)

## 5. Consumer migration — App.tsx

- [ ] 5.1 Replace settings gear raw `<button>` → `<Button variant="ghost" size="icon">`
- [ ] 5.2 Replace view tab raw `<button>` elements → `<Tabs>` component
- [ ] 5.3 Replace inline `style={{ background: 'var(--bg)' }}` with Tailwind `bg-background`
- [ ] 5.4 Replace header `style={{ background: 'var(--bg-card)' }}` with Tailwind `bg-card`
- [ ] 5.5 Remove all `onMouseEnter`/`onMouseLeave` hover handler patterns

## 6. Consumer migration — feature files

- [ ] 6.1 Replace `<Popover>` imports in TaskRow and AddTaskRow with shadcn Popover
- [ ] 6.2 Replace `<SelectMenu>` import in GroupLens with shadcn `<Select>`
- [ ] 6.3 Replace `<AlertDialog>` import in GroupSettings with shadcn AlertDialog
- [ ] 6.4 Replace `<Button>` imports across features — update variant names if needed

## 7. Cleanup & verification

- [ ] 7.1 Delete old wrapper files: `button.tsx`, `button-variants.ts`, `toggle.tsx`, `select-menu.tsx`, `side-panel.tsx`, `alert-dialog.tsx`, `popover-card.tsx`, `range-slider.tsx`, `number-input.tsx`
- [ ] 7.2 Update `src/shared/ui/index.ts` barrel to export only shadcn components
- [ ] 7.3 Run `npm run typecheck` — fix any type errors
- [ ] 7.4 Run `npm run test` — fix any test failures
- [ ] 7.5 Run `npm run lint` — fix any lint issues
- [ ] 7.6 Run `npm run format` — ensure formatting is clean
- [ ] 7.7 Visual regression check — open dev server, verify all views render correctly with new components
