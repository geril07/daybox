import { useState } from 'react'

import { exportData, downloadExport, parseImport } from '../../app/localStorage'
import { useAppStore } from '../../app/store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  NumberInput,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '../../shared/ui'
import GroupSettings from '../groups/GroupSettings'

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
  const settings = useAppStore((s) => s.settings)
  const updateTimerSettings = useAppStore((s) => s.updateTimerSettings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = () => {
    const state = useAppStore.getState()
    const json = exportData(state)
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
          useAppStore.setState({
            tasks: result.data.tasks ?? [],
            groups: result.data.groups ?? [],
            settings: result.data.settings ?? useAppStore.getState().settings,
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
          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.9px] uppercase">
              Timer
            </div>

            <SettingRow label="Focus duration">
              <NumberInput
                value={settings.timer.focusDuration}
                onValueChange={(v) =>
                  updateTimerSettings({ focusDuration: v ?? undefined })
                }
                min={1}
                max={120}
              />
            </SettingRow>

            <SettingRow label="Short break">
              <NumberInput
                value={settings.timer.shortBreakDuration}
                onValueChange={(v) =>
                  updateTimerSettings({ shortBreakDuration: v ?? undefined })
                }
                min={1}
                max={30}
              />
            </SettingRow>

            <SettingRow label="Long break">
              <NumberInput
                value={settings.timer.longBreakDuration}
                onValueChange={(v) =>
                  updateTimerSettings({ longBreakDuration: v ?? undefined })
                }
                min={1}
                max={60}
              />
            </SettingRow>

            <SettingRow label="Long break interval">
              <NumberInput
                value={settings.timer.longBreakInterval}
                onValueChange={(v) =>
                  updateTimerSettings({ longBreakInterval: v ?? undefined })
                }
                min={2}
                max={10}
              />
            </SettingRow>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.9px] uppercase">
              Auto-start
            </div>
            <SettingRow label="Auto-start breaks">
              <Switch
                checked={settings.timer.autoStartBreaks}
                onCheckedChange={(v) =>
                  updateTimerSettings({ autoStartBreaks: v })
                }
              />
            </SettingRow>
            <SettingRow label="Auto-start pomodoros">
              <Switch
                checked={settings.timer.autoStartPomodoros}
                onCheckedChange={(v) =>
                  updateTimerSettings({ autoStartPomodoros: v })
                }
              />
            </SettingRow>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.9px] uppercase">
              Alarm
            </div>
            <SettingRow label="Sound">
              <Select
                value={settings.timer.alarmSound}
                onValueChange={(v) =>
                  updateTimerSettings({
                    alarmSound: v as 'bell' | 'digital' | 'gentle' | 'ping',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['bell', 'digital', 'gentle', 'ping'].map((sound) => (
                    <SelectItem key={sound} value={sound}>
                      {sound}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow label="Volume">
              <Slider
                value={[settings.timer.alarmVolume]}
                onValueChange={(v) =>
                  updateTimerSettings({
                    alarmVolume: (v as readonly number[])[0],
                  })
                }
                min={0}
                max={1}
                step={0.1}
                className="w-[80px]"
              />
            </SettingRow>

            <SettingRow label="Repeat count">
              <NumberInput
                value={settings.timer.alarmRepeat}
                onValueChange={(v) =>
                  updateTimerSettings({ alarmRepeat: v ?? undefined })
                }
                min={1}
                max={5}
              />
            </SettingRow>
          </div>

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
            <GroupSettings />
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
