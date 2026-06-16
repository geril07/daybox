import { Calendar, CalendarDays, CalendarRange, Clock, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { View } from '@/modules/planner'

export interface SidebarViewItem {
  label: string
  value: View
  Icon: LucideIcon
}

export const sidebarViews: SidebarViewItem[] = [
  { label: 'Today', value: 'today', Icon: Sun },
  { label: 'Tomorrow', value: 'tomorrow', Icon: Calendar },
  { label: 'This Week', value: 'week', Icon: CalendarRange },
  { label: 'Later', value: 'later', Icon: CalendarDays },
  { label: 'Unscheduled', value: 'unscheduled', Icon: Clock },
]
