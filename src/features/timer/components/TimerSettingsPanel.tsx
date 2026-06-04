import { useSettingsStore } from '@/app/settingsStore'
import {
  NumberInput,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
} from '@/shared/ui'

export function TimerSettingsPanel() {
  const settings = useSettingsStore((s) => s.settings)
  const updateTimerSettings = useSettingsStore((s) => s.updateTimerSettings)

  return (
    <>
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
            onCheckedChange={(v) => updateTimerSettings({ autoStartBreaks: v })}
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
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value
              updateTimerSettings({ alarmVolume: next })
            }}
            min={0}
            max={1}
            step={0.05}
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
    </>
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
