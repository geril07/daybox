export default function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-14 text-center">
      <div
        className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: 'var(--border)', color: 'var(--fg-3)' }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>
        {title}
      </div>
      <div
        className="max-w-[260px] text-xs leading-relaxed"
        style={{ color: 'var(--fg-3)' }}
      >
        {description}
      </div>
    </div>
  )
}
