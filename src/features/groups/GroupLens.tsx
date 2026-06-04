import { useAppStore } from '../../app/store'
import { SelectMenu } from '../../shared/ui'
import type { SelectItem } from '../../shared/ui'

interface GroupLensProps {
  selectedGroupId: string | null
  onSelect: (id: string | null) => void
}

export default function GroupLens({
  selectedGroupId,
  onSelect,
}: GroupLensProps) {
  const groups = useAppStore((s) => s.groups)

  if (groups.length <= 1) return null

  const items: SelectItem[] = [
    { value: '__all__', label: 'All groups' },
    ...groups.map((g) => ({
      value: g.id,
      label: (
        <div className="flex items-center gap-1.5">
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: g.color }}
          />
          {g.name}
        </div>
      ),
    })),
  ]

  return (
    <SelectMenu
      value={selectedGroupId ?? '__all__'}
      onValueChange={(v) => onSelect(v === '__all__' ? null : v)}
      items={items}
    />
  )
}
