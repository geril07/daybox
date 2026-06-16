import type { SaveSliceMap } from './map'

export type PrepareResult<TCurrent> =
  | { ok: true; value: TCurrent; warnings?: string[] }
  | { ok: false; reason: string }

export type MissingSliceStrategy<TCurrent> =
  | { kind: 'required' }
  | { kind: 'useDefault'; defaultValue: TCurrent }

export type SliceMigration = (input: unknown) => PrepareResult<unknown>

export type SaveSlice<
  Name extends string,
  TCurrent extends { version: number },
  TSlices = SaveSliceMap,
> = {
  name: Name
  currentVersion: number
  missing: MissingSliceStrategy<TCurrent>
  exportSlice: () => TCurrent
  validateExport?: (value: unknown) => PrepareResult<unknown>
  migrateFrom?: Record<number, SliceMigration>
  prepareImport: (input: unknown) => PrepareResult<TCurrent>
  postPrepare?: (
    current: TCurrent,
    allSlices: TSlices,
  ) => PrepareResult<TCurrent>
  applyImport: (value: TCurrent) => void
}

export type InferSaveSliceCurrent<T> =
  T extends SaveSlice<string, infer TCurrent> ? TCurrent : never
