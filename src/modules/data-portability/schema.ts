import type { InferSaveSliceCurrent } from '@/shared/save-slice'

import { SaveEnvelopeSchema, type SaveEnvelope } from './envelope'
import { saveSlices } from './registry'

export const CurrentSnapshotSchema = SaveEnvelopeSchema

type SliceMap = {
  [K in (typeof saveSlices)[number] as K['name']]: InferSaveSliceCurrent<K>
}

export type CurrentSnapshot = Omit<SaveEnvelope, 'slices'> & {
  envelopeVersion: 1
  slices: SliceMap
}

declare const preparedSnapshotBrand: unique symbol

export type PreparedSnapshot = CurrentSnapshot & {
  readonly [preparedSnapshotBrand]: true
}

export function markPrepared(snapshot: CurrentSnapshot): PreparedSnapshot {
  return snapshot as PreparedSnapshot
}
