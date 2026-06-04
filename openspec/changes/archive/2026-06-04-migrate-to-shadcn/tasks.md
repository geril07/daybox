## 1. Setup & scaffolding

- [x] 1.1 Backup current `src/index.css` and current `src/shared/ui/` to a temp dir
- [x] 1.2 Add `@/` path alias to `tsconfig.app.json` and `vite.config.ts`
- [x] 1.3 Run `npx shadcn@latest init --base base` — configure aliases to `@/shared/ui` and `@/shared/lib`, point CSS to `src/index.css`
- [x] 1.4 Verify `components.json` and `src/shared/lib/utils.ts` are correct after init

## 2. CSS migration

- [x] 2.1 Adopt shadcn's generated `src/index.css` — overlay current theme colors onto shadcn's CSS variable names (`--background`, `--foreground`, `--card`, `--border`, `--accent`, etc.)
- [x] 2.2 Dark mode values mapped in `.dark` block
- [x] 2.3 Old `--bg`, `--fg` etc. kept as aliases for backward compat during migration

## 3. Core component replacements (CLI)

- [x] 3.1 `npx shadcn@latest add button` — replace existing `src/shared/ui/button.tsx` + `button-variants.ts`
- [x] 3.2 `npx shadcn@latest add input` — new component
- [x] 3.3 `npx shadcn@latest add label` — new component
- [x] 3.4 `npx shadcn@latest add separator` — new component
- [x] 3.5 `npx shadcn@latest add badge` — new component
- [x] 3.6 `npx shadcn@latest add card` — new component
- [x] 3.7 `npx shadcn@latest add select` — replaces select-menu.tsx
- [x] 3.8 `npx shadcn@latest add sheet` — replaces side-panel.tsx
- [x] 3.9 `npx shadcn@latest add switch` — replaces toggle.tsx
- [x] 3.10 `npx shadcn@latest add slider` — replaces range-slider.tsx
- [x] 3.11 `npx shadcn@latest add alert-dialog` — replaces alert-dialog.tsx
- [x] 3.12 `npx shadcn@latest add popover` — replaces popover-card.tsx
- [x] 3.13 `npx shadcn@latest add tabs` — new component (replace view tab buttons)

## 4. Consumer migration — SettingsDrawer

- [x] 4.1 Replace `<SidePanel>` → `<Sheet>` in SettingsDrawer, update compound children
- [x] 4.2 Keep `<NumberInput>` (no shadcn equivalent)
- [x] 4.3 Replace `<Toggle>` → `<Switch>` in auto-start + dark theme toggles
- [x] 4.4 Replace `<SelectMenu>` → `<Select>` in alarm sound picker
- [x] 4.5 Replace `<RangeSlider>` → `<Slider>` in volume control
- [x] 4.6 Replace raw `<button>` Export → `<Button variant="outline">`
- [x] 4.7 Replace raw `<button>` Import → `<Button variant="outline">` + AlertDialog trigger
- [x] 4.8 Replace `onMouseEnter`/`onMouseLeave` hover patterns with Tailwind `hover:` classes
- [x] 4.9 Replace inline `style={{ color: 'var(--...)' }}` with Tailwind utilities (e.g., `text-muted-foreground`)

## 5. Consumer migration — App.tsx

- [x] 5.1 Replace settings gear raw `<button>` → `<Button variant="ghost" size="icon">`
- [x] 5.2 Replace view tab raw `<button>` elements → `<Tabs>` component
- [x] 5.3 Replace inline `style={{ background: 'var(--bg)' }}` with Tailwind `bg-background`
- [x] 5.4 Replace header `style={{ background: 'var(--bg-card)' }}` with Tailwind `bg-card`
- [x] 5.5 Remove all `onMouseEnter`/`onMouseLeave` hover handler patterns

## 6. Consumer migration — feature files

- [x] 6.1 Replace `<Popover>` imports in TaskRow and AddTaskRow with shadcn Popover
- [x] 6.2 Replace `<SelectMenu>` import in GroupLens with shadcn `<Select>`
- [x] 6.3 Replace `<AlertDialog>` import in GroupSettings with shadcn AlertDialog
- [x] 6.4 Replace `<Button>` imports across features — update variant names if needed

## 7. Cleanup & verification

- [x] 7.1 Delete old wrapper files
- [x] 7.2 Update `src/shared/ui/index.ts` barrel to export only shadcn components
- [x] 7.3 Run `npm run typecheck` — fix any type errors
- [x] 7.4 Run `npm run test` — fix any test failures
- [x] 7.5 Run `npm run lint` — fix any lint issues
- [x] 7.6 Run `npm run format` — ensure formatting is clean
- [x] 7.7 Visual regression check — dev server starts, app renders without errors
