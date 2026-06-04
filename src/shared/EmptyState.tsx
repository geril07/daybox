import { FilePlus } from 'lucide-react'

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
        <FilePlus size={20} />
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
