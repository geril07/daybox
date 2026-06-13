import type { View } from '@/modules/planner'

export const tabs: { label: string; shortLabel?: string; value: View }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'This Week', shortLabel: 'Week', value: 'week' },
  { label: 'Unscheduled', value: 'unscheduled' },
]
