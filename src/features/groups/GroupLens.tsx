import { useAppStore } from '../../app/store'

interface GroupLensProps {
  selectedGroupId: string | null
  onSelect: (id: string | null) => void
}

export default function GroupLens({ selectedGroupId, onSelect }: GroupLensProps) {
  const groups = useAppStore(s => s.groups)

  if (groups.length <= 1) return null

  return (
    <div className="relative shrink-0">
      <select
        className="text-xs px-2 py-1 rounded-[4px] outline-none cursor-pointer"
        style={{
          border: '1px solid var(--border)',
          color: 'var(--fg-2)',
          background: 'var(--bg)',
        }}
        value={selectedGroupId ?? ''}
        onChange={e => onSelect(e.target.value || null)}
      >
        <option value="">All groups</option>
        {groups.map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
    </div>
  )
}
