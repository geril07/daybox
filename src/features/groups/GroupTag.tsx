import { useAppStore } from '@/app/store'

interface GroupTagProps {
  groupId: string
}

export default function GroupTag({ groupId }: GroupTagProps) {
  const groups = useAppStore((s) => s.groups)
  const group = groups.find((g) => g.id === groupId)

  if (!group || groups.length <= 1) return null

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: group.color }}
      />
      <span className="text-muted-foreground text-xs">{group.name}</span>
    </div>
  )
}
