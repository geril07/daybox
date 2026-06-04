import { useAppStore } from '../../app/store'

interface GroupTagProps {
  groupId: string
}

export default function GroupTag({ groupId }: GroupTagProps) {
  const groups = useAppStore(s => s.groups)
  const group = groups.find(g => g.id === groupId)

  if (!group || groups.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: group.color }} />
      <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{group.name}</span>
    </div>
  )
}
