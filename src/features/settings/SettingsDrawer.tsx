import { useState } from 'react'

import { exportData, downloadExport, parseImport } from '../../app/localStorage'
import { useAppStore } from '../../app/store'
import {
  SidePanel,
  NumberInput,
  Toggle,
  SelectMenu,
  RangeSlider,
  AlertDialog,
} from '../../shared/ui'
import GroupSettings from '../groups/GroupSettings'

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
    <SidePanel open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-3">
        <div
          className="section text-[10.5px] font-semibold tracking-[0.9px] uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
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
        <div
          className="section text-[10.5px] font-semibold tracking-[0.9px] uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Auto-start
        </div>
        <SettingRow label="Auto-start breaks">
          <Toggle
            checked={settings.timer.autoStartBreaks}
            onCheckedChange={(v) => updateTimerSettings({ autoStartBreaks: v })}
          />
        </SettingRow>
        <SettingRow label="Auto-start pomodoros">
          <Toggle
            checked={settings.timer.autoStartPomodoros}
            onCheckedChange={(v) =>
              updateTimerSettings({ autoStartPomodoros: v })
            }
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-3">
        <div
          className="section text-[10.5px] font-semibold tracking-[0.9px] uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Alarm
        </div>
        <SettingRow label="Sound">
          <SelectMenu
            value={settings.timer.alarmSound}
            onValueChange={(v) =>
              updateTimerSettings({
                alarmSound: v as 'bell' | 'digital' | 'gentle' | 'ping',
              })
            }
            items={['bell', 'digital', 'gentle', 'ping'].map((s) => ({
              value: s,
              label: s,
            }))}
          />
        </SettingRow>

        <SettingRow label="Volume">
          <RangeSlider
            value={settings.timer.alarmVolume}
            onValueChange={(v) => updateTimerSettings({ alarmVolume: v })}
            min={0}
            max={1}
            step={0.1}
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
        <div
          className="section text-[10.5px] font-semibold tracking-[0.9px] uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Display
        </div>
        <SettingRow label="First day of week">
          <select
            className="rounded-[4px] px-2 py-1 text-xs outline-none"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--fg)',
              background: 'var(--bg)',
            }}
            value={settings.weekStartDay}
            onChange={(e) =>
              updateSettings({
                weekStartDay: Number(e.target.value) as
                  | 0
                  | 1
                  | 2
                  | 3
                  | 4
                  | 5
                  | 6,
              })
            }
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="Dark theme">
          <Toggle
            checked={settings.theme === 'dark'}
            onCheckedChange={(v) => {
              updateSettings({ theme: v ? 'dark' : 'light' })
              document.documentElement.classList.toggle('dark', v)
            }}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-3">
        <div
          className="section text-[10.5px] font-semibold tracking-[0.9px] uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Groups
        </div>
        <GroupSettings />
      </div>

      <div className="flex flex-col gap-3">
        <div
          className="section text-[10.5px] font-semibold tracking-[0.9px] uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Data
        </div>
        <button
          className="w-full rounded-[6px] py-2 text-[13.5px] transition-all duration-140"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--fg-2)',
          }}
          onClick={handleExport}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.background = 'var(--accent-bg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--fg-2)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          Export
        </button>
        <AlertDialog
          open={importConfirmOpen}
          onOpenChange={setImportConfirmOpen}
          title="Import data"
          description="This will replace all current data (tasks, groups, settings). This cannot be undone."
          trigger={
            <button
              className="w-full rounded-[6px] py-2 text-[13.5px] transition-all duration-140"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--fg-2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
                e.currentTarget.style.background = 'var(--accent-bg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--fg-2)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Import
            </button>
          }
          actions={[
            { label: 'Continue', onClick: doImport, variant: 'primary' },
            { label: 'Cancel', variant: 'secondary' },
          ]}
        />
        {importError && (
          <div className="mt-1 text-xs" style={{ color: 'var(--overdue)' }}>
            {importError}
          </div>
        )}
      </div>
    </SidePanel>
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
      <span className="text-[13.5px]" style={{ color: 'var(--fg)' }}>
        {label}
      </span>
      {children}
    </div>
  )
}
