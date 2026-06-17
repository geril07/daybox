# Tasks: Internal Scroll Container

## 1. Update shell layout in App.tsx

- [x] Change `.app-shell` from `min-h-screen` to `h-dvh overflow-hidden` (line 79)
- [x] Remove `sticky top-0 z-30` from `<header>` (line 80)
- [x] Add `min-h-0` to the content row `<div>` (line 152)
- [x] Add `overflow-y-auto scrollbar-gutter-stable` to `<main>` (line 157)

## 2. Remove sticky from TimerBar

- [x] Remove `sticky bottom-0 z-20` from the outer `<div>` in `TimerBar.tsx` (line 209)

## 3. Verify layout

- [ ] Run dev server and test on desktop
- [ ] Test on mobile (responsive layout)
- [ ] Test all views: Today, Tomorrow, Week, Later, Unscheduled, DateBrowser
- [ ] Test with few tasks (no scroll needed) — verify gutter stable, no layout shift
- [ ] Test with many tasks (scroll needed) — verify scrollbar appears inside content area
- [ ] Test view switching animations — verify no visual regressions
- [ ] Test mobile sidebar sheet — verify opens/closes correctly

## 4. Quality gates

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes
- [x] `npm run format` passes
