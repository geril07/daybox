import { Select } from '@base-ui/react'
import { useAppStore } from '../../app/store'

interface GroupLensProps {
  selectedGroupId: string | null
  onSelect: (id: string | null) => void
}

export default function GroupLens({ selectedGroupId, onSelect }: GroupLensProps) {
  const groups = useAppStore(s => s.groups)

  if (groups.length <= 1) return null

  return (
    <Select.Root
      value={selectedGroupId ?? '__all__'}
      onValueChange={v => onSelect(v === '__all__' ? null : v)}
    >
      <Select.Trigger className="flex items-center gap-1 px-2 py-1 text-xs rounded-[4px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)', background: 'var(--bg)' }}>
        <Select.Value />
        <Select.Icon>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50">
          <Select.Popup className="rounded-[6px] py-1 shadow-lg min-w-[100px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Select.Item value="__all__" className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer" style={{ color: 'var(--fg-2)' }}>
              <Select.ItemText>All groups</Select.ItemText>
            </Select.Item>
            {groups.map(g => (
              <Select.Item key={g.id} value={g.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer" style={{ color: 'var(--fg-2)' }}>
                <Select.ItemText>
                  <div className="flex items-center gap-1.5">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: g.color }} />
                    {g.name}
                  </div>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
