import type { tabs } from './plannerTabs'

export function TabLabel({ tab }: { tab: (typeof tabs)[number] }) {
  return (
    <>
      <span className="hidden sm:inline">{tab.label}</span>
      <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
    </>
  )
}
