import { useState } from 'react'

import { useTheme } from '@/app/theme'
import {
  applySnapshot,
  buildSnapshot,
  downloadAsFile,
  validateSnapshot,
} from '@/features/data-portability'
import { GoogleDrivePanel } from '@/features/google-drive'
import { GroupSettingsPanel } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { TimerSettingsPanel } from '@/features/timer'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogAction,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/shared/ui'

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
  const setWeekStartDay = usePlannerStore((s) => s.setWeekStartDay)
  const [theme, setTheme] = useTheme()

  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = () => {
    downloadAsFile(JSON.stringify(buildSnapshot()), 'daybox-export.json')
  }

  const doImport = () => {
    setImportConfirmOpen(false)
    setImportError(null)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const text = await file.text()
        const parsed = validateSnapshot(text)
        if (!parsed.ok) {
          setImportError(parsed.reason)
          return
        }
        applySnapshot(parsed.data)
      } catch {
        setImportError('Failed to read file.')
      }
    }
    input.click()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[310px] max-w-[85vw] gap-0">
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
            <SettingRow label="Dark theme">
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
              />
            </SettingRow>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Groups
            </div>
            <GroupSettingsPanel />
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Data
            </div>
            <Button variant="outline" onClick={handleExport}>
              Export
            </Button>

            <AlertDialog
              open={importConfirmOpen}
              onOpenChange={setImportConfirmOpen}
            >
              <AlertDialogTrigger render={<Button variant="outline" />}>
                Import
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Import data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace all current data (tasks, groups, settings).
                  This cannot be undone.
                </AlertDialogDescription>
                <div className="flex flex-col gap-2">
                  <AlertDialogAction onClick={doImport}>
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
