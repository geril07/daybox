import { Select } from '@base-ui/react'
import type { ReactNode } from 'react'

export interface SelectItem {
  value: string
  label: ReactNode
}

interface SelectMenuProps {
  value: string
  onValueChange: (value: string | null) => void
  items: SelectItem[]
}

export function SelectMenu({ value, onValueChange, items }: SelectMenuProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        className="flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs"
        style={{
          border: '1px solid var(--border)',
          color: 'var(--fg-2)',
          background: 'var(--bg)',
        }}
      >
        <Select.Value />
        <Select.Icon>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50">
          <Select.Popup
            className="min-w-[100px] rounded-[6px] py-1 shadow-lg"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs"
                style={{ color: 'var(--fg-2)' }}
              >
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
