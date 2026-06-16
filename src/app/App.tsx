import { Menu, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

import { SettingsDrawer } from '@/app/shell/SettingsDrawer'
import {
  DayView,
  DateBrowser,
  LaterView,
  WeekView,
  usePlannerStore,
  defaultDateForView,
  type View,
} from '@/modules/planner'
import { AddTaskRow } from '@/modules/tasks'
import { TimerBar, togglePlayPauseWithClick } from '@/modules/timer'
import { registerShortcuts } from '@/shared/keyboard'
import { Button, Sheet, SheetContent } from '@/shared/ui'

import { Sidebar } from './Sidebar'

export function App() {
  const [view, setView] = useState<View>('today')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const browseDate = usePlannerStore((s) => s.browseDate)
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)

  const [settingsOpen, setSettingsOpen] = useState(false)

  const defaultDate = defaultDateForView(view, weekStartDay, browseDate)

  useEffect(() => {
    const cleanup = registerShortcuts({
      ' ': () => {
        togglePlayPauseWithClick()
      },
      escape: () => {
        setSettingsOpen(false)
        setSidebarOpen(false)
      },
    })
    return cleanup
  }, [])

  const renderView = () => {
    switch (view) {
      case 'today':
      case 'tomorrow':
      case 'unscheduled':
        return <DayView view={view} selectedGroupId={selectedGroupId} />
      case 'week':
        return <WeekView selectedGroupId={selectedGroupId} />
      case 'later':
        return <LaterView selectedGroupId={selectedGroupId} />
      case 'date':
        return <DateBrowser />
      default:
        return <DayView view="today" selectedGroupId={selectedGroupId} />
    }
  }

  const sidebarNav = (
    <Sidebar
      selectedView={view}
      onSelectView={(v) => {
        setView(v)
        setSidebarOpen(false)
      }}
      selectedGroupId={selectedGroupId}
      onSelectGroup={(id) => {
        setSelectedGroupId(id)
        setSidebarOpen(false)
      }}
    />
  )

  return (
    <div className="app-shell bg-background text-foreground flex h-dvh flex-col overflow-hidden">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-4 py-3.5 md:max-w-none md:px-5">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </Button>
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center">
              <svg
                width="26"
                height="26"
                viewBox="0 0 256 256"
                role="img"
                aria-label="DayBox"
              >
                <defs>
                  <mask
                    id="daybox-logo-clock-cutout"
                    maskUnits="userSpaceOnUse"
                  >
                    <rect width="256" height="256" fill="#fff" />
                    <circle cx="183" cy="177" r="57" fill="#000" />
                  </mask>
                </defs>
                <g mask="url(#daybox-logo-clock-cutout)">
                  <rect
                    x="38"
                    y="44"
                    width="152"
                    height="168"
                    rx="28"
                    fill="none"
                    stroke="#d65332"
                    strokeWidth="18"
                  />
                  <path
                    d="M76 93h70M76 132h48"
                    stroke="#d65332"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                </g>
                <circle
                  cx="183"
                  cy="177"
                  r="48"
                  fill="none"
                  stroke="#d65332"
                  strokeWidth="18"
                />
                <path
                  d="M183 153v27l18 12"
                  fill="none"
                  stroke="#d65332"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-foreground text-base font-semibold tracking-tight">
              DayBox
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="border-border hidden w-[220px] shrink-0 border-r md:block">
          {sidebarNav}
        </aside>

        <main className="flex-1 scrollbar-gutter-stable overflow-y-auto">
          <div className="container mx-auto w-full max-w-[680px] px-4 md:px-7">
            <div className="task-list-area py-1 pb-10">
              <AddTaskRow
                defaultDate={defaultDate}
                defaultGroupId={selectedGroupId}
              />
              {renderView()}
            </div>
          </div>
        </main>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[260px] max-w-[85vw] gap-0 p-0">
          {sidebarNav}
        </SheetContent>
      </Sheet>

      <TimerBar />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
