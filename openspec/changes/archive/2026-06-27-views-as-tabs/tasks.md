## 1. Create ViewTabs component

- [x] 1.1 Create `src/app/ViewTabs.tsx` with tab definitions (Today, Tomorrow, This Week, Later, Unscheduled), animated indicator, task counts

## 2. Remove Views from Sidebar

- [x] 2.1 Remove Views section (the 5 view buttons) from `src/app/Sidebar.tsx`
- [x] 2.2 Remove `selectedView` and `onSelectView` props from `SidebarProps`

## 3. Update App shell

- [x] 3.1 Import and render `ViewTabs` in `src/app/App.tsx` above the task list
- [x] 3.2 Stop passing `selectedView`/`onSelectView` to `Sidebar`

## 4. Update tests

- [x] 4.1 Remove sidebar view tests from `src/app/App.sidebar.test.tsx`
- [x] 4.2 Simplify all Sidebar render calls to match new props

## 5. Tweak shared tabs

- [x] 5.1 Remove `p-[3px]` from `tabsListVariants` base styles in `src/shared/ui/tabs.tsx`

## 6. Verify

- [x] 6.1 Run `npm run typecheck`
- [x] 6.2 Run `npm run lint`
- [x] 6.3 Run `npm run test`
- [x] 6.4 Run `npm run format`
