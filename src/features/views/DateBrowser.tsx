import { useAppStore } from '../../app/store'
import { formatDate } from '../../shared/dates'
import TaskList from '../tasks/TaskList'
import EmptyState from '../../shared/EmptyState'

export default function DateBrowser() {
  const browseDate = useAppStore(s => s.browseDate)
  const setBrowseDate = useAppStore(s => s.setBrowseDate)
  const tasks = useAppStore(s => s.tasks)

  const dateTasks = browseDate
    ? tasks.filter(t => t.date === browseDate).sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const goBack = () => {
    const current = browseDate ? new Date(browseDate) : new Date()
    current.setDate(current.getDate() - 1)
    setBrowseDate(formatDate(current))
  }

  const goForward = () => {
    const current = browseDate ? new Date(browseDate) : new Date()
    current.setDate(current.getDate() + 1)
    setBrowseDate(formatDate(current))
  }

  if (!browseDate) {
    return <EmptyState title="Select a date to browse." description="Use the date stepper above." />
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 pt-2 pb-3 justify-center">
        <button
          className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center"
          style={{ color: 'var(--fg-3)' }}
          onClick={goBack}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-xs font-medium min-w-[120px] text-center" style={{ color: 'var(--fg-2)' }}>
          {browseDate}
        </span>
        <button
          className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center"
          style={{ color: 'var(--fg-3)' }}
          onClick={goForward}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      {dateTasks.length === 0 ? (
        <EmptyState title="Nothing on this day." description="Reschedule a task or add a new one." />
      ) : (
        <TaskList tasks={dateTasks} defaultDate={browseDate} />
      )}
    </div>
  )
}
