import { Menu, Settings } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { useState, useEffect } from 'react'

import { SettingsDrawer } from '@/app/shell/SettingsDrawer'
import {
  DayView,
  DateBrowser,
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
        return <LaterViewShell selectedGroupId={selectedGroupId} />
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
    <div className="app-shell bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-card sticky top-0 z-30 border-b">
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
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white">
              <svg
                width="26"
                height="26"
                viewBox="0 0 256 256"
                role="img"
                aria-label="DayBox"
              >
                <rect width="256" height="256" rx="58" fill="#fff" />
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
                <circle
                  cx="177"
                  cy="177"
                  r="48"
                  fill="#fff"
                  stroke="#d65332"
                  strokeWidth="18"
                />
                <path
                  d="M177 153v27l18 12"
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

      <div className="flex flex-1">
        <aside className="border-border hidden w-[220px] shrink-0 border-r md:block">
          {sidebarNav}
        </aside>

        <main className="flex-1">
          <div className="container mx-auto w-full max-w-[680px] px-4 md:px-7">
            <MotionConfig reducedMotion="user">
              <div className="task-list-area py-1 pb-10">
                <AddTaskRow
                  defaultDate={defaultDate}
                  defaultGroupId={selectedGroupId}
                />
                {renderView()}
              </div>
            </MotionConfig>
          </div>
        </main>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[260px] max-w-[85vw] gap-0 p-0"
        >
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

function LaterViewShell({ selectedGroupId }: { selectedGroupId: string | null }) {
  const { useLaterSections } = await import(
    '@/modules/planner/queries'  )
}
