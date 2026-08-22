export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function addDaysToDate(dateStr: string, delta: number): string {
  const date = parseDate(dateStr)
  date.setDate(date.getDate() + delta)
  return formatDate(date)
}

export function getPlannerDate(
  now: Date = new Date(),
  dayStartMinutes = 0,
): string {
  const date = new Date(now)
  const currentMinutes = date.getHours() * 60 + date.getMinutes()
  if (currentMinutes < dayStartMinutes) {
    date.setDate(date.getDate() - 1)
  }
  return formatDate(date)
}

export function getTomorrow(now: Date = new Date(), dayStartMinutes = 0): Date {
  return parseDate(addDaysToDate(getPlannerDate(now, dayStartMinutes), 1))
}

export function isToday(
  dateStr: string,
  now: Date = new Date(),
  dayStartMinutes = 0,
): boolean {
  return dateStr === getPlannerDate(now, dayStartMinutes)
}

export function isTomorrow(
  dateStr: string,
  now: Date = new Date(),
  dayStartMinutes = 0,
): boolean {
  return dateStr === addDaysToDate(getPlannerDate(now, dayStartMinutes), 1)
}

export function isOverdue(
  dateStr: string,
  now: Date = new Date(),
  dayStartMinutes = 0,
): boolean {
  return dateStr < getPlannerDate(now, dayStartMinutes)
}

export function getWeekDays(
  weekStartDay: WeekStartDay,
  now: Date = new Date(),
  dayStartMinutes = 0,
): Date[] {
  const effectiveDate = parseDate(getPlannerDate(now, dayStartMinutes))
  const day = effectiveDate.getDay()
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay
  const weekStart = new Date(effectiveDate)
  weekStart.setDate(effectiveDate.getDate() - diff)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    days.push(date)
  }
  return days
}

export function getWeekRange(
  weekStartDay: WeekStartDay,
  now: Date = new Date(),
  dayStartMinutes = 0,
): { start: string; end: string } {
  const days = getWeekDays(weekStartDay, now, dayStartMinutes)
  return {
    start: formatDate(days[0]),
    end: formatDate(days[6]),
  }
}

export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

export function getWeekSectionLabel(
  date: Date,
  now: Date = new Date(),
  dayStartMinutes = 0,
): string {
  const dateStr = formatDate(date)
  if (isToday(dateStr, now, dayStartMinutes)) return 'Today'
  if (isTomorrow(dateStr, now, dayStartMinutes)) return 'Tomorrow'

  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${weekday} · ${monthDay}`
}

export function getFormattedDate(
  date: Date,
  now: Date = new Date(),
  dayStartMinutes = 0,
): string {
  const today = getPlannerDate(now, dayStartMinutes)
  const tomorrow = addDaysToDate(today, 1)

  if (formatDate(date) === today) return 'Today'
  if (formatDate(date) === tomorrow) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}
