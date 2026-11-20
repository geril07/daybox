import { Menu, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

import { SettingsDrawer } from '@/app/shell/SettingsDrawer'
import { useGoogleDriveStore } from '@/modules/google-drive'
import {
  DayView,
  DateBrowser,
  LaterView,
  WeekView,
  usePlannerStore,
  defaultDateForView,
  type View,
} from '@/modules/planner'
import { AddTaskRow, useTaskStore } from '@/modules/tasks'
import {
  TimerBar,
  togglePlayPauseWithClick,
  unlockAudio,
} from '@/modules/timer'
import { getPlannerDate } from '@/shared/dates'
import { getAuthStatus } from '@/shared/google-drive/server-auth'
import { registerShortcuts } from '@/shared/keyboard'
import {
  Button,
  Sheet,
  SheetContent,
  scrollGutterMirrorClass,
  workspaceColumnClass,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { Brand } from './Brand'
import { Sidebar } from './Sidebar'
import { ViewTabs } from './ViewTabs'
import { AppUpdateNotice } from './updates/AppUpdateNotice'

export function App() {
  const [view, setView] = useState<View>('today')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const browseDate = usePlannerStore((s) => s.browseDate)
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)
  const dayStartMinutes = usePlannerStore((s) => s.dayStartMinutes)
  const series = useTaskStore((s) => s.series)
  const [, setEffectiveDate] = useState(() =>
    getPlannerDate(new Date(), dayStartMinutes),
  )

  useEffect(() => {
    const refresh = () => {
      const today = getPlannerDate(new Date(), dayStartMinutes)
      setEffectiveDate(today)
      useTaskStore.getState().ensureOccurrences(today, weekStartDay)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [dayStartMinutes, weekStartDay, series])

  const [settingsOpen, setSettingsOpen] = useState(false)

  const defaultDate = defaultDateForView(
    view,
    weekStartDay,
    browseDate,
    dayStartMinutes,
  )

  useEffect(() => {
    const handleInteraction = (event: Event) => {
      if (!event.isTrusted) return
      void unlockAudio()
    }

    window.addEventListener('pointerdown', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    return () => {
      window.removeEventListener('pointerdown', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

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

  useEffect(() => {
    const hydrate = async () => {
      const params = new URLSearchParams(window.location.search)
      const connectedParam = params.get('connected')
      if (connectedParam === '1' || connectedParam === '0') {
        params.delete('connected')
        const search = params.toString()
        const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
        window.history.replaceState(null, '', url)
      }
      const status = await getAuthStatus()
      useGoogleDriveStore.getState().hydrateFromStatus(status)
    }
    void hydrate()
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

  const sidebarNav = (inDrawer = false) => (
    <Sidebar
      inDrawer={inDrawer}
      selectedGroupId={selectedGroupId}
      onSelectGroup={(id) => {
        setSelectedGroupId(id)
        setSidebarOpen(false)
      }}
    />
  )

  return (
    <div className="app-shell bg-rail text-foreground flex h-dvh overflow-hidden">
      <aside className="bg-rail hidden shrink-0 flex-col md:flex md:w-[240px]">
        <div className="px-5 pt-6 pb-2">
          <Brand />
        </div>
        {sidebarNav()}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-2xl">
          <header className="bg-rail flex shrink-0 items-center justify-between px-4 py-3.5 md:justify-end md:bg-transparent md:px-5 md:py-3">
            <div className="flex items-center gap-2.5 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </Button>
              <Brand />
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
          </header>

          <div className="relative min-h-0 flex-1">
            <main className="h-full scrollbar-gutter-stable overflow-y-auto">
              <div className={workspaceColumnClass}>
                <ViewTabs value={view} onChange={setView} />
                <div className="task-list-area py-1 pb-4">
                  <AddTaskRow
                    defaultDate={defaultDate}
                    defaultGroupId={selectedGroupId}
                  />
                  {renderView()}
                </div>
              </div>
            </main>
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0',
                scrollGutterMirrorClass,
              )}
            >
              <div className={workspaceColumnClass}>
                <div className="from-card/0 to-card h-5 bg-gradient-to-b" />
              </div>
            </div>
          </div>

          <AppUpdateNotice />
          <TimerBar />
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="bg-rail w-[260px] max-w-[85vw] gap-0 p-0"
        >
          {sidebarNav(true)}
        </SheetContent>
      </Sheet>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
