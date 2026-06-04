import { useState, useEffect } from 'react'

import GroupLens from '../features/groups/GroupLens'
import SettingsDrawer from '../features/settings/SettingsDrawer'
import AddTaskRow from '../features/tasks/AddTaskRow'
import TimerBar from '../features/timer/TimerBar'
import BacklogView from '../features/views/BacklogView'
import DateBrowser from '../features/views/DateBrowser'
import TodayView from '../features/views/TodayView'
import TomorrowView from '../features/views/TomorrowView'
import WeekView from '../features/views/WeekView'
import { formatDate } from '../shared/dates'
import { registerShortcuts } from '../shared/keyboard'
import type { View } from '../shared/types'
import { useAppStore } from './store'

export default function App() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const theme = useAppStore((s) => s.settings.theme)
  const browseDate = useAppStore((s) => s.browseDate)

  const [settingsOpen, setSettingsOpen] = useState(false)

  const defaultDate: string | undefined = (() => {
    switch (view) {
      case 'today':
        return formatDate(new Date())
      case 'tomorrow': {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return formatDate(d)
      }
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
        document
          .querySelector('[title="Start"], [title="Pause"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      },
      escape: () => {
        setSettingsOpen(false)
      },
    })
    return cleanup
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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
    <div
      className="app-shell flex min-h-screen flex-col"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="header-top mx-auto flex max-w-[680px] items-center justify-between px-7 py-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px]"
              style={{ background: 'var(--accent)' }}
            >
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
            <span
              className="text-[15.5px] font-semibold tracking-[-0.3px]"
              style={{ color: 'var(--fg)' }}
            >
              DayBox
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GroupLens selectedGroupId={null} onSelect={() => {}} />
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors duration-140"
              style={{ color: 'var(--fg-3)' }}
              onClick={() => setSettingsOpen(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--fg)'
                e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--fg-3)'
                e.currentTarget.style.background = 'transparent'
              }}
              aria-label="Settings"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="header-nav mx-auto flex max-w-[680px] items-center justify-between gap-2 px-7 pb-3">
          <div className="view-tabs flex gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                className={`view-tab rounded-[6px] px-[13px] py-[7px] text-[13.5px] font-medium transition-[color,background] duration-140`}
                style={{
                  color: view === tab.value ? 'var(--accent)' : 'var(--fg-3)',
                  background:
                    view === tab.value ? 'var(--accent-bg)' : 'transparent',
                }}
                onClick={() => setView(tab.value)}
                onMouseEnter={(e) => {
                  if (view !== tab.value) {
                    e.currentTarget.style.color = 'var(--fg)'
                    e.currentTarget.style.background = 'var(--bg-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (view !== tab.value) {
                    e.currentTarget.style.color = 'var(--fg-3)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="app-content flex-1" style={{ paddingBottom: '72px' }}>
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
