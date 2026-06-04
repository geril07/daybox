import { useState } from 'react'

import { exportData, downloadExport, parseImport } from '@/app/localStorage'
import { useSettingsStore } from '@/app/settingsStore'
import { GroupSettingsPanel, useGroupStore } from '@/features/groups'
import { useTaskStore } from '@/features/tasks'
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

export default function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = () => {
    const json = exportData(
      useTaskStore.getState().tasks,
      useGroupStore.getState().groups,
      useSettingsStore.getState().settings,
    )
    downloadExport(json)
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
        const result = parseImport(text)
        if (!result.success) {
          setImportError(result.error ?? 'Unknown error')
          return
        }
        if (result.data) {
          useTaskStore.setState({ tasks: result.data.tasks ?? [] })
          useGroupStore.setState({ groups: result.data.groups ?? [] })
          useSettingsStore.setState({
            settings:
              result.data.settings ?? useSettingsStore.getState().settings,
          })
        }
      } catch {
        setImportError('Failed to read file.')
      }
    }
    input.click()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[310px] max-w-[85vw]">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-5">
          <TimerSettingsPanel />

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.9px] uppercase">
              Display
            </div>
            <SettingRow label="First day of week">
              <Select
                items={weekDays}
                value={settings.weekStartDay}
                onValueChange={(v) =>
                  updateSettings({
                    weekStartDay: (v ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                checked={settings.theme === 'dark'}
                onCheckedChange={(v) => {
                  updateSettings({ theme: v ? 'dark' : 'light' })
                  document.documentElement.classList.toggle('dark', v)
                }}
              />
            </SettingRow>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.9px] uppercase">
              Groups
            </div>
            <GroupSettingsPanel />
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.9px] uppercase">
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
                  <AlertDialogCancel onClick={doImport}>
                    Continue
                  </AlertDialogCancel>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </div>
              </AlertDialogContent>
            </AlertDialog>

            {importError && (
              <div className="text-destructive mt-1 text-xs">{importError}</div>
            )}
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
      <span className="text-foreground text-[13.5px]">{label}</span>
      {children}
    </div>
  )
}
