import { SaveEnvelopeSchema, type SaveEnvelope } from './envelope'
import type { SaveSliceExportSlice } from './registry'

export const CurrentSnapshotSchema = SaveEnvelopeSchema

export type CurrentSnapshot = Omit<SaveEnvelope, 'slices'> & {
  envelopeVersion: 1
  slices: SaveSliceExportSlice
}

declare const preparedSnapshotBrand: unique symbol

export type PreparedSnapshot = CurrentSnapshot & {
  readonly [preparedSnapshotBrand]: true
}

export function markPrepared(snapshot: CurrentSnapshot): PreparedSnapshot {
  return snapshot as PreparedSnapshot
}
