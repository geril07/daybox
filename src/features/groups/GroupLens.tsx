import { useAppStore } from '../../app/store'
import { SelectMenu } from '../../shared/ui'

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
    <SelectMenu
      value={selectedGroupId ?? '__all__'}
      onValueChange={(v) => onSelect(v === '__all__' ? null : v)}
    >
      <SelectMenu.Trigger />
      <SelectMenu.Portal>
        <SelectMenu.Positioner className="z-50">
          <SelectMenu.Content>
            <SelectMenu.Item value="__all__">
              <SelectMenu.ItemText>All groups</SelectMenu.ItemText>
            </SelectMenu.Item>
            {groups.map((g) => (
              <SelectMenu.Item key={g.id} value={g.id}>
                <SelectMenu.ItemText>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-[7px] w-[7px] shrink-0 rounded-full"
                      style={{ background: g.color }}
                    />
                    {g.name}
                  </div>
                </SelectMenu.ItemText>
              </SelectMenu.Item>
            ))}
          </SelectMenu.Content>
        </SelectMenu.Positioner>
      </SelectMenu.Portal>
    </SelectMenu>
  )
}
