export type SaveSlicePrepareResult<TCurrent> =
  | { ok: true; value: TCurrent; warnings?: string[] }
  | { ok: false; reason: string }

export type MissingSliceStrategy<TCurrent> =
  | { kind: 'required' }
  | { kind: 'useDefault'; getDefault: () => TCurrent }

export type SaveSlice<Name extends string, TCurrent> = {
  name: Name
  currentVersion: number
  missing: MissingSliceStrategy<TCurrent>
  exportSlice: () => TCurrent
  prepareImport: (input: unknown) => SaveSlicePrepareResult<TCurrent>
  applyImport: (value: TCurrent) => void
}
