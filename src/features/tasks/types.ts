export interface Task {
  id: string
  title: string
  groupId: string
  date: string | null
  pomoEstimate: number
  pomoCompleted: number
  sortOrder: number
  completed: boolean
  completedAt: string | null
  createdAt: string
}
