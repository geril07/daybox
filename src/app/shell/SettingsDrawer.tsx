import { useRef, useState } from 'react'

import { setThemeWithViewTransition, useTheme } from '@/app/theme'
import type { ThemeModePreference } from '@/app/themes'
import {
  buildSnapshot,
  commitSnapshotImport,
  prepareSnapshotImport,
  type PreparedSnapshot,
} from '@/modules/data-portability'
import { GoogleDrivePanel } from '@/modules/google-drive'
import { usePlannerStore } from '@/modules/planner'
import { TimerSettingsPanel } from '@/modules/timer'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/shared/ui'
import { downloadAsFile } from '@/shared/utils/download'

const weekDays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

export function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)
  const dayStartMinutes = usePlannerStore((s) => s.dayStartMinutes)
  const setWeekStartDay = usePlannerStore((s) => s.setWeekStartDay)
  const setDayStartMinutes = usePlannerStore((s) => s.setDayStartMinutes)
  const { settings, presets, availableModes, setMode, setPreset } = useTheme()

  const presetItems = presets.map((p) => ({
    value: p.id,
    label: p.name,
  }))

  const modeItems = availableModes.map((m) => ({
    value: m,
    label: m === 'system' ? 'System' : m.charAt(0).toUpperCase() + m.slice(1),
  }))

  const sheetContentRef = useRef<HTMLDivElement | null>(null)

  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [preparedImport, setPreparedImport] = useState<PreparedSnapshot | null>(
    null,
  )
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  const handleExport = () => {
    setImportError(null)
    const result = buildSnapshot()
    if (!result.ok) {
      setImportError(result.reason)
      return
    }
    downloadAsFile(JSON.stringify(result.value), 'daybox-export.json')
  }

  const chooseImportFile = () => {
    setImportError(null)
    setPreparedImport(null)
    setImportWarnings([])
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const text = await file.text()
        const prepared = prepareSnapshotImport(text)
        if (!prepared.ok) {
          setImportError(prepared.reason)
          return
        }
        setPreparedImport(prepared.snapshot)
        setImportWarnings(prepared.warnings ?? [])
        setImportConfirmOpen(true)
      } catch {
        setImportError('Failed to read file.')
      }
    }
    input.click()
  }

  const commitImport = () => {
    if (!preparedImport) return
    commitSnapshotImport(preparedImport)
    setImportConfirmOpen(false)
    setPreparedImport(null)
    setImportWarnings([])
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        ref={sheetContentRef}
        initialFocus={sheetContentRef}
        tabIndex={-1}
        side="right"
        className="w-[310px] max-w-[85vw] gap-0"
      >
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-5">
          <TimerSettingsPanel />

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Display
            </div>
            <SettingRow label="First day of week">
              <Select
                items={weekDays}
                value={weekStartDay}
                onValueChange={(v) =>
                  setWeekStartDay((v ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {weekDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Day starts at">
              <input
                aria-label="Day starts at"
                type="time"
                step={60}
                value={formatDayStartTime(dayStartMinutes)}
                onChange={(event) => {
                  const minutes = parseDayStartTime(event.target.value)
                  if (minutes !== null) setDayStartMinutes(minutes)
                }}
                className="border-border bg-background text-foreground rounded border px-2 py-1.5 text-xs"
              />
            </SettingRow>
            <SettingRow label="Theme">
              <Select
                items={presetItems}
                value={settings.preset}
                onValueChange={(v, details) => {
                  if (!v) return
                  if (
                    details?.reason === 'item-press' &&
                    details.event instanceof MouseEvent
                  ) {
                    setThemeWithViewTransition({ preset: v }, details.event)
                  } else {
                    setPreset(v)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {presetItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Mode">
              <Select
                items={modeItems}
                value={settings.mode}
                onValueChange={(v, details) => {
                  if (!v) return
                  if (
                    details?.reason === 'item-press' &&
                    details.event instanceof MouseEvent
                  ) {
                    setThemeWithViewTransition(
                      { mode: v as ThemeModePreference },
                      details.event,
                    )
                  } else {
                    setMode(v as ThemeModePreference)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {modeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Data
            </div>
            <Button variant="outline" onClick={handleExport}>
              Export
            </Button>

            <Button variant="outline" onClick={chooseImportFile}>
              Import
            </Button>

            <AlertDialog
              open={importConfirmOpen}
              onOpenChange={(open) => {
                setImportConfirmOpen(open)
                if (!open) {
                  setPreparedImport(null)
                  setImportWarnings([])
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogTitle>Import data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace all current data (tasks, groups, settings).
                  This cannot be undone.
                </AlertDialogDescription>
                {importWarnings.length > 0 && (
                  <div className="text-muted-foreground rounded-md border p-3 text-xs">
                    {importWarnings.map((warning) => (
                      <div key={warning}>{warning}</div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <AlertDialogAction onClick={commitImport}>
                    Continue
                  </AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </div>
              </AlertDialogContent>
            </AlertDialog>

            {importError && (
              <div className="text-destructive mt-1 text-xs">{importError}</div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Google Drive
            </div>
            <GoogleDrivePanel />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SettingRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-foreground text-sm">{label}</span>
      {children}
    </div>
  )
}

function formatDayStartTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseDayStartTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}
