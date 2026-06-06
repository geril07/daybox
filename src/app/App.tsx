import { Settings } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { useState, useEffect, useRef } from 'react'

import { migrateLegacyAppStore, migrateLegacySettings } from '@/app/bootstrap'
import { SettingsDrawer } from '@/app/shell/SettingsDrawer'
import {
  DayView,
  DateBrowser,
  WeekView,
  usePlannerStore,
  type View,
} from '@/features/planner'
import { AddTaskRow } from '@/features/tasks'
import { TimerBar, useTimerStore } from '@/features/timer'
import { formatDate, getTomorrow } from '@/shared/dates'
import { registerShortcuts } from '@/shared/keyboard'
import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui'

export function App() {
  const [view, setView] = useState<View>('today')
  const browseDate = usePlannerStore((s) => s.browseDate)

  const migrationDone = useRef(false)
  const settingsMigrationDone = useRef(false)

  const [settingsOpen, setSettingsOpen] = useState(false)

  const defaultDate: string | undefined = (() => {
    switch (view) {
      case 'today':
        return formatDate(new Date())
      case 'tomorrow':
        return formatDate(getTomorrow())
      case 'week':
        return formatDate(new Date())
      case 'backlog':
        return undefined
      case 'date':
        return browseDate ?? undefined
      default:
        return formatDate(new Date())
    }
  })()

  useEffect(() => {
    const cleanup = registerShortcuts({
      ' ': () => {
        useTimerStore.getState().togglePlayPause()
      },
      escape: () => {
        setSettingsOpen(false)
      },
    })
    return cleanup
  }, [])

  useEffect(() => {
    if (migrationDone.current) return
    migrateLegacyAppStore()
    migrationDone.current = true
  }, [])

  useEffect(() => {
    if (settingsMigrationDone.current) return
    migrateLegacySettings()
    settingsMigrationDone.current = true
  }, [])

  const tabs: { label: string; value: View }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'Backlog', value: 'backlog' },
  ]

  const renderView = () => {
    switch (view) {
      case 'today':
      case 'tomorrow':
      case 'backlog':
        return <DayView view={view} />
      case 'week':
        return <WeekView />
      case 'date':
        return <DateBrowser />
      default:
        return <DayView view="today" />
    }
  }

  return (
    <div className="app-shell bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-card sticky top-0 z-30 border-b">
        <div className="header-top mx-auto flex max-w-[680px] items-center justify-between px-7 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="bg-accent flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-xl">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
        <nav className="header-nav mx-auto flex max-w-[680px] items-center justify-between gap-2 px-7 pb-3">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as View)}
            className="view-tabs"
          >
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </nav>
      </header>

      <main className="app-content flex-1 pb-18">
        <div className="container mx-auto w-full max-w-[680px] px-7">
          <MotionConfig reducedMotion="user">
            <div className="task-list-area py-1 pb-10">
              <AddTaskRow defaultDate={defaultDate} />
              {renderView()}
            </div>
          </MotionConfig>
        </div>
      </main>

      <TimerBar />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
