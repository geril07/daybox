import { z } from 'zod'

import { DEFAULT_GROUP_ID } from '@/features/groups'
import { TaskSchema } from '@/features/tasks'

import { slices } from './registry'

export type ApplyResult =
  | { ok: true; warnings?: string[] }
  | { ok: false; reason: string }

const TasksWithGroupIdSchema = z.array(TaskSchema)

export function applySnapshot(data: unknown): ApplyResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }
  const obj = data as Record<string, unknown>
  const warnings: string[] = []

  for (const slice of slices) {
    const raw = obj[slice.name]
    const result = slice.schema.safeParse(raw)
    if (!result.success) {
      const path = result.error.issues[0]?.path?.join('.') ?? 'root'
      const message = result.error.issues[0]?.message ?? 'Invalid value'
      warnings.push(`${slice.name}: invalid at ${path}: ${message}`)
      continue
    }
    slice.apply(result.data)
  }

  const tasks = slices.find((s) => s.name === 'tasks')
  const groups = slices.find((s) => s.name === 'groups')
  if (tasks && groups) {
    const tasksResult = tasks.schema.safeParse(obj[tasks.name])
    const groupsResult = groups.schema.safeParse(obj[groups.name])
    if (tasksResult.success && groupsResult.success) {
      const dangling = new Set<string>()
      const existing = new Set(
        (groupsResult.data as { id: string }[]).map((g) => g.id),
      )
      for (const task of tasksResult.data as { groupId: string }[]) {
        if (!existing.has(task.groupId)) dangling.add(task.groupId)
      }
      if (dangling.size > 0) {
        const updated = (
          tasksResult.data as { id: string; groupId: string }[]
        ).map((t) =>
          dangling.has(t.groupId) ? { ...t, groupId: DEFAULT_GROUP_ID } : t,
        )
        TasksWithGroupIdSchema.parse(updated)
        tasks.apply(updated)
        for (const danglingId of dangling) {
          warnings.push(
            `Task group "${danglingId}" not found. Tasks reassigned to default group.`,
          )
        }
      }
    }
  }

  return warnings.length > 0 ? { ok: true, warnings } : { ok: true }
}
