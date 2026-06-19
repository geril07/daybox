import { Plus } from 'lucide-react'
import { useState } from 'react'

import {
  DEFAULT_GROUP_ID,
  SidebarAddGroupInput,
  SidebarGroupItem,
  useGroupStore,
} from '@/modules/groups'
import type { View } from '@/modules/planner'
import { useTaskStore } from '@/modules/tasks'
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
  const renameGroup = useGroupStore((s) => s.renameGroup)
  const setGroupColor = useGroupStore((s) => s.setGroupColor)
  const deleteGroup = useGroupStore((s) => s.deleteGroup)
  const [isAddingGroup, setIsAddingGroup] = useState(false)

  const handleResolveAndDelete = (
    groupId: string,
    reassignToDefault: boolean,
  ) => {
    if (reassignToDefault) {
      useTaskStore.getState().reassignTasks(groupId, DEFAULT_GROUP_ID)
    } else {
      useTaskStore.getState().deleteTasksByGroupId(groupId)
    }
    deleteGroup(groupId)
  }

  const handleOpenAddInput = () => {
    setIsAddingGroup(true)
  }

  const handleCloseAddInput = () => {
    setIsAddingGroup(false)
  }

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

      <div className="flex flex-col gap-0.5">
        <div className="text-muted-foreground flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold tracking-widest uppercase">
          <span>Groups</span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Add group"
            title="Add group"
            onClick={handleOpenAddInput}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {groups.length >= 2 && (
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
        )}
        {groups.map((group) => (
          <SidebarGroupItem
            key={group.id}
            group={group}
            isActive={selectedGroupId === group.id}
            isLast={groups.length <= 1}
            onSelect={(id: string) => onSelectGroup(id)}
            onRename={renameGroup}
            onSetColor={setGroupColor}
            onDelete={deleteGroup}
            onResolveAndDelete={handleResolveAndDelete}
          />
        ))}
        <SidebarAddGroupInput
          key={isAddingGroup ? 'open' : 'closed'}
          open={isAddingGroup}
          onClose={handleCloseAddInput}
        />
      </div>
    </nav>
  )
}
