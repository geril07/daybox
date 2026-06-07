import { slices } from './registry'

export function buildSnapshot(): Record<string, unknown> {
  const data: Record<string, unknown> = {
    version: 3,
    exportedAt: new Date().toISOString(),
  }
  for (const slice of slices) {
    data[slice.name] = slice.export()
  }
  return data
}
