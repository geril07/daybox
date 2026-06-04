export default function App() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <header
        className="sticky top-0 z-30"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-7 py-3.5 max-w-[680px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-[15.5px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--fg)' }}>
              DayBox
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="icon-btn" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex items-center justify-between px-7 pb-3 max-w-[680px] mx-auto">
          <div className="flex gap-0.5">
            {['Today', 'Tomorrow', 'This Week', 'Backlog'].map(tab => (
              <button
                key={tab}
                className="px-[13px] py-[7px] text-[13.5px] font-medium rounded-[6px] transition-[color,background] duration-140"
                style={{ color: 'var(--fg-3)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'transparent'; }}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1" style={{ paddingBottom: '72px' }}>
        <div className="max-w-[680px] mx-auto px-7 w-full">
          <div className="py-1 pb-10">
            <p style={{ color: 'var(--fg-3)', textAlign: 'center', padding: '56px 0' }}>
              Welcome to DayBox. Start adding tasks to begin.
            </p>
          </div>
        </div>
      </main>

      <footer
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3.5 px-7 py-2.5 max-w-[680px] mx-auto">
          <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--accent)' }}>
              Focus
            </span>
            <span className="text-[12.5px]" style={{ color: 'var(--fg-3)' }}>
              No task focused
            </span>
          </div>
          <span className="font-mono text-[30px] font-medium tracking-[1px] shrink-0" style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
            25:00
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-140"
              style={{ color: 'var(--fg-3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-3)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
