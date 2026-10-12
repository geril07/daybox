import { Select as SelectPrimitive } from '@base-ui/react/select'
import type { ComponentProps } from 'react'

import { SelectContent, SelectItem } from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import type { Group } from '../types'

interface GroupSelectProps {
  groupId: string
  groups: Group[]
  onChange: (groupId: string) => void
  align?: 'start' | 'center' | 'end'
  triggerProps?: ComponentProps<typeof SelectPrimitive.Trigger>
  children: React.ReactNode
}

export function GroupSelect({
  groupId,
  groups,
  onChange,
  align = 'end',
  triggerProps,
  children,
}: GroupSelectProps) {
  const { className: triggerClassName, ...restTriggerProps } =
    triggerProps ?? {}
  return (
    <SelectPrimitive.Root
      value={groupId}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
    >
      <SelectPrimitive.Trigger
        className={cn('cursor-pointer', triggerClassName)}
        {...restTriggerProps}
      >
        {children}
      </SelectPrimitive.Trigger>
      <SelectContent align={align} className="max-w-(--available-width)">
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            <div className="flex min-w-0 items-center gap-1.5 whitespace-normal">
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: g.color }}
              />
              <span className="wrap-anywhere">{g.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  )
}
