import { useAppStore } from '../../app/store'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../shared/ui'

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

  return (
    <Select
      value={selectedGroupId ?? '__all__'}
      onValueChange={(v) => onSelect(v === '__all__' ? null : v)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All groups</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            <div className="flex items-center gap-1.5">
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: g.color }}
              />
              {g.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
