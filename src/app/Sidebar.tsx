import { useGroupStore } from '@/modules/groups'
import type { View } from '@/modules/planner'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { sidebarViews } from './sidebarViews'

interface SidebarProps {
  selectedView: View
  onSelectView: (view: View) => void
  selectedGroupId: string | null
  onSelectGroup: (id: string | null) => void
}

export function Sidebar({
  selectedView,
  onSelectView,
  selectedGroupId,
  onSelectGroup,
}: SidebarProps) {
  const groups = useGroupStore((s) => s.groups)
  const showGroups = groups.length > 1

  return (
    <nav className="flex flex-col gap-4 p-3">
      <div className="flex flex-col gap-0.5">
        <div className="text-muted-foreground px-2 py-1.5 text-[11px] font-semibold tracking-widest uppercase">
          Views
        </div>
        {sidebarViews.map((item) => (
          <Button
            key={item.value}
            variant="ghost"
            size="none"
            className={cn(
              'justify-start gap-2.5 rounded-md px-2 py-2 text-sm font-medium',
              selectedView === item.value
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
            onClick={() => onSelectView(item.value)}
          >
            <item.Icon size={17} />
            {item.label}
          </Button>
        ))}
      </div>

      {showGroups && (
        <div className="flex flex-col gap-0.5">
          <div className="text-muted-foreground px-2 py-1.5 text-[11px] font-semibold tracking-widest uppercase">
            Groups
          </div>
          <Button
            variant="ghost"
            size="none"
            className={cn(
              'justify-start gap-2.5 rounded-md px-2 py-2 text-sm font-medium',
              selectedGroupId === null
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
            onClick={() => onSelectGroup(null)}
          >
            <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center text-[10px] font-semibold">
              All
            </span>
            All groups
          </Button>
          {groups.map((group) => (
            <Button
              key={group.id}
              variant="ghost"
              size="none"
              className={cn(
                'justify-start gap-2.5 rounded-md px-2 py-2 text-sm font-medium',
                selectedGroupId === group.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              onClick={() => onSelectGroup(group.id)}
            >
              <span
                className="h-[11px] w-[11px] shrink-0 rounded-full"
                style={{ background: group.color }}
              />
              {group.name}
            </Button>
          ))}
        </div>
      )}
    </nav>
  )
}
