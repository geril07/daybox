export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

export function getTomorrow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

export function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date())
}

export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateStr === formatDate(tomorrow)
}

export function isOverdue(dateStr: string): boolean {
  const today = formatDate(new Date())
  return dateStr < today
}

export function getWeekDays(weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date[] {
  const now = new Date()
  const day = now.getDay()
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

export function getWeekRange(weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6): {
  start: string
  end: string
} {
  const days = getWeekDays(weekStartDay)
  return {
    start: formatDate(days[0]),
    end: formatDate(days[6]),
  }
}

export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

export function getFormattedDate(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (formatDate(date) === formatDate(today)) return 'Today'
  if (formatDate(date) === formatDate(tomorrow)) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}
