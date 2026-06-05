import { Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

import { SettingsDrawer } from '@/app/shell/SettingsDrawer'
import { setTheme } from '@/app/theme'
import { GroupLens, useGroupStore } from '@/features/groups'
import {
  BacklogView,
  DateBrowser,
  TodayView,
  TomorrowView,
  WeekView,
  usePlannerStore,
} from '@/features/planner'
import { AddTaskRow, useTaskStore } from '@/features/tasks'
import { TimerBar, useTimerStore } from '@/features/timer'
import { formatDate, getTomorrow } from '@/shared/dates'
import { registerShortcuts } from '@/shared/keyboard'
import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui'

type View = 'today' | 'tomorrow' | 'week' | 'backlog' | 'date'

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
    const oldData = localStorage.getItem('daybox-app-store')
    if (oldData) {
      try {
        const parsed = JSON.parse(oldData)
        const state = parsed.state || parsed
        const tasks = state.tasks ?? []
        const groups = state.groups ?? []
        if (tasks.length > 0) useTaskStore.setState({ tasks })
        if (groups.length > 0) useGroupStore.setState({ groups })
        if (state.settings) {
          localStorage.setItem(
            'daybox-settings',
            JSON.stringify({ state: { settings: state.settings }, version: 0 }),
          )
        }
        localStorage.removeItem('daybox-app-store')
      } catch {
        // ignore corrupted old store
      }
    }
    migrationDone.current = true
  }, [])

  useEffect(() => {
    if (settingsMigrationDone.current) return
    const oldSettings = localStorage.getItem('daybox-settings')
    if (oldSettings) {
      try {
        const parsed = JSON.parse(oldSettings)
        const settings = parsed.state?.settings ?? parsed.settings ?? parsed
        if (settings?.timer) {
          useTimerStore.getState().setTimerSettings(settings.timer)
        }
        if (typeof settings?.weekStartDay === 'number') {
          usePlannerStore.getState().setWeekStartDay(settings.weekStartDay)
        }
        if (settings?.theme === 'light' || settings?.theme === 'dark') {
          setTheme(settings.theme)
        }
        localStorage.removeItem('daybox-settings')
      } catch {
        // ignore corrupted old settings
      }
    }
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
        return <TodayView />
      case 'tomorrow':
        return <TomorrowView />
      case 'week':
        return <WeekView />
      case 'backlog':
        return <BacklogView />
      case 'date':
        return <DateBrowser />
      default:
        return <TodayView />
    }
  }

  return (
    <div className="app-shell bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-card sticky top-0 z-30 border-b">
        <div className="header-top mx-auto flex max-w-[680px] items-center justify-between px-7 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="bg-accent flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px]">
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
            <span className="text-foreground text-[15.5px] font-semibold tracking-[-0.3px]">
              DayBox
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GroupLens selectedGroupId={null} onSelect={() => {}} />
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

      <main className="app-content flex-1 pb-[72px]">
        <div className="container mx-auto w-full max-w-[680px] px-7">
          <div className="task-list-area py-1 pb-10">
            <AddTaskRow defaultDate={defaultDate} />
            {renderView()}
          </div>
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
