import { Drawer, NumberField, Switch, Select, Slider } from '@base-ui/react'
import { useAppStore } from '../../app/store'
import { exportData, downloadExport, parseImport } from '../../app/localStorage'
import GroupSettings from '../groups/GroupSettings'

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore(s => s.settings)
  const updateTimerSettings = useAppStore(s => s.updateTimerSettings)
  const updateSettings = useAppStore(s => s.updateSettings)

  const handleExport = () => {
    const state = useAppStore.getState()
    const json = exportData(state)
    downloadExport(json)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const result = parseImport(text)
      if (result.success && result.data) {
        const store = useAppStore.getState()
        if (result.data.tasks) store.tasks = result.data.tasks
        if (result.data.groups) store.groups = result.data.groups
        if (result.data.settings) {
          store.settings = { ...store.settings, ...result.data.settings }
        }
        useAppStore.setState({
          tasks: result.data.tasks ?? store.tasks,
          groups: result.data.groups ?? store.groups,
          settings: result.data.settings ?? store.settings,
        })
      }
    }
    input.click()
  }

  return (
    <Drawer.Root open={open} onOpenChange={o => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className="fixed inset-0 z-50"
          style={{ background: 'oklch(0 0 0 / 0.25)', backdropFilter: 'blur(2px)' }}
        />
        <Drawer.Popup
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden animate-slide-in"
          style={{
            width: 310,
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-[18px] shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Settings</span>
            <Drawer.Close className="w-7 h-7 rounded-[4px] flex items-center justify-center" style={{ color: 'var(--fg-3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </Drawer.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <div className="section text-[10.5px] font-semibold uppercase tracking-[0.9px]" style={{ color: 'var(--fg-3)' }}>
                Timer
              </div>

              <SettingRow label="Focus duration">
                <NumberField.Root
                  value={settings.timer.focusDuration}
                  onValueChange={v => updateTimerSettings({ focusDuration: v })}
                  min={1}
                  max={120}
                >
                  <NumberField.Group className="flex items-center gap-0">
                    <NumberField.Decrement className="w-7 h-7 flex items-center justify-center rounded-l-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>−</NumberField.Decrement>
                    <NumberField.Input className="w-[44px] h-7 text-center text-xs outline-none" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }} />
                    <NumberField.Increment className="w-7 h-7 flex items-center justify-center rounded-r-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>+</NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </SettingRow>

              <SettingRow label="Short break">
                <NumberField.Root
                  value={settings.timer.shortBreakDuration}
                  onValueChange={v => updateTimerSettings({ shortBreakDuration: v })}
                  min={1}
                  max={30}
                >
                  <NumberField.Group className="flex items-center gap-0">
                    <NumberField.Decrement className="w-7 h-7 flex items-center justify-center rounded-l-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>−</NumberField.Decrement>
                    <NumberField.Input className="w-[44px] h-7 text-center text-xs outline-none" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }} />
                    <NumberField.Increment className="w-7 h-7 flex items-center justify-center rounded-r-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>+</NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </SettingRow>

              <SettingRow label="Long break">
                <NumberField.Root
                  value={settings.timer.longBreakDuration}
                  onValueChange={v => updateTimerSettings({ longBreakDuration: v })}
                  min={1}
                  max={60}
                >
                  <NumberField.Group className="flex items-center gap-0">
                    <NumberField.Decrement className="w-7 h-7 flex items-center justify-center rounded-l-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>−</NumberField.Decrement>
                    <NumberField.Input className="w-[44px] h-7 text-center text-xs outline-none" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }} />
                    <NumberField.Increment className="w-7 h-7 flex items-center justify-center rounded-r-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>+</NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </SettingRow>

              <SettingRow label="Long break interval">
                <NumberField.Root
                  value={settings.timer.longBreakInterval}
                  onValueChange={v => updateTimerSettings({ longBreakInterval: v })}
                  min={2}
                  max={10}
                >
                  <NumberField.Group className="flex items-center gap-0">
                    <NumberField.Decrement className="w-7 h-7 flex items-center justify-center rounded-l-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>−</NumberField.Decrement>
                    <NumberField.Input className="w-[44px] h-7 text-center text-xs outline-none" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }} />
                    <NumberField.Increment className="w-7 h-7 flex items-center justify-center rounded-r-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>+</NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </SettingRow>
            </div>

            <div className="flex flex-col gap-3">
              <div className="section text-[10.5px] font-semibold uppercase tracking-[0.9px]" style={{ color: 'var(--fg-3)' }}>
                Auto-start
              </div>
              <SettingRow label="Auto-start breaks">
                <Switch.Root
                  checked={settings.timer.autoStartBreaks}
                  onCheckedChange={v => updateTimerSettings({ autoStartBreaks: v })}
                  className="w-[38px] h-[21px] rounded-full relative cursor-pointer shrink-0 transition-background duration-200"
                  style={{ background: settings.timer.autoStartBreaks ? 'var(--accent)' : 'var(--border-strong)' }}
                >
                  <Switch.Thumb className="block w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform duration-200 absolute top-[2.5px] left-[2.5px]" style={{ transform: settings.timer.autoStartBreaks ? 'translateX(17px)' : 'translateX(0)' }} />
                </Switch.Root>
              </SettingRow>
              <SettingRow label="Auto-start pomodoros">
                <Switch.Root
                  checked={settings.timer.autoStartPomodoros}
                  onCheckedChange={v => updateTimerSettings({ autoStartPomodoros: v })}
                  className="w-[38px] h-[21px] rounded-full relative cursor-pointer shrink-0 transition-background duration-200"
                  style={{ background: settings.timer.autoStartPomodoros ? 'var(--accent)' : 'var(--border-strong)' }}
                >
                  <Switch.Thumb className="block w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform duration-200 absolute top-[2.5px] left-[2.5px]" style={{ transform: settings.timer.autoStartPomodoros ? 'translateX(17px)' : 'translateX(0)' }} />
                </Switch.Root>
              </SettingRow>
            </div>

            <div className="flex flex-col gap-3">
              <div className="section text-[10.5px] font-semibold uppercase tracking-[0.9px]" style={{ color: 'var(--fg-3)' }}>
                Alarm
              </div>
              <SettingRow label="Sound">
                <Select.Root
                  value={settings.timer.alarmSound}
                  onValueChange={v => updateTimerSettings({ alarmSound: v as 'bell' | 'digital' | 'gentle' | 'ping' })}
                >
                  <Select.Trigger className="flex items-center gap-1 px-2 py-1 text-xs rounded-[4px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)', background: 'var(--bg)' }}>
                    <Select.Value />
                    <Select.Icon>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-50">
                      <Select.Popup className="rounded-[6px] py-1 shadow-lg min-w-[100px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        {['bell', 'digital', 'gentle', 'ping'].map(sound => (
                          <Select.Item key={sound} value={sound} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer" style={{ color: 'var(--fg-2)' }}>
                            <Select.ItemText>{sound}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </SettingRow>

              <SettingRow label="Volume">
                <Slider.Root
                  value={[settings.timer.alarmVolume]}
                  onValueChange={([v]) => updateTimerSettings({ alarmVolume: v })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-[80px] h-5 flex items-center"
                >
                  <Slider.Track className="h-[4px] rounded-full relative w-full" style={{ background: 'var(--border)' }}>
                    <Slider.Indicator className="h-full rounded-full" style={{ background: 'var(--accent)' }} />
                    <Slider.Thumb className="block w-[14px] h-[14px] rounded-full shadow-sm absolute top-1/2 -translate-y-1/2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }} />
                  </Slider.Track>
                </Slider.Root>
              </SettingRow>

              <SettingRow label="Repeat count">
                <NumberField.Root
                  value={settings.timer.alarmRepeat}
                  onValueChange={v => updateTimerSettings({ alarmRepeat: v })}
                  min={1}
                  max={5}
                >
                  <NumberField.Group className="flex items-center gap-0">
                    <NumberField.Decrement className="w-7 h-7 flex items-center justify-center rounded-l-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>−</NumberField.Decrement>
                    <NumberField.Input className="w-[44px] h-7 text-center text-xs outline-none" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }} />
                    <NumberField.Increment className="w-7 h-7 flex items-center justify-center rounded-r-[4px] text-[14px]" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>+</NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </SettingRow>
            </div>

            <div className="flex flex-col gap-3">
              <div className="section text-[10.5px] font-semibold uppercase tracking-[0.9px]" style={{ color: 'var(--fg-3)' }}>
                Display
              </div>
              <SettingRow label="First day of week">
                <select
                  className="text-xs px-2 py-1 rounded-[4px] outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }}
                  value={settings.weekStartDay}
                  onChange={e => updateSettings({ weekStartDay: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6 })}
                >
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </SettingRow>
              <SettingRow label="Dark theme">
                <Switch.Root
                  checked={settings.theme === 'dark'}
                  onCheckedChange={v => {
                    updateSettings({ theme: v ? 'dark' : 'light' })
                    document.documentElement.classList.toggle('dark', v)
                  }}
                  className="w-[38px] h-[21px] rounded-full relative cursor-pointer shrink-0 transition-background duration-200"
                  style={{ background: settings.theme === 'dark' ? 'var(--accent)' : 'var(--border-strong)' }}
                >
                  <Switch.Thumb className="block w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform duration-200 absolute top-[2.5px] left-[2.5px]" style={{ transform: settings.theme === 'dark' ? 'translateX(17px)' : 'translateX(0)' }} />
                </Switch.Root>
              </SettingRow>
            </div>

            <div className="flex flex-col gap-3">
              <div className="section text-[10.5px] font-semibold uppercase tracking-[0.9px]" style={{ color: 'var(--fg-3)' }}>
                Groups
              </div>
              <GroupSettings />
            </div>

            <div className="flex flex-col gap-3">
              <div className="section text-[10.5px] font-semibold uppercase tracking-[0.9px]" style={{ color: 'var(--fg-3)' }}>
                Data
              </div>
              <button
                className="w-full py-2 text-[13.5px] rounded-[6px] transition-all duration-140"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}
                onClick={handleExport}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-2)'; e.currentTarget.style.background = 'transparent' }}
              >
                Export
              </button>
              <button
                className="w-full py-2 text-[13.5px] rounded-[6px] transition-all duration-140"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}
                onClick={handleImport}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-2)'; e.currentTarget.style.background = 'transparent' }}
              >
                Import
              </button>
            </div>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13.5px]" style={{ color: 'var(--fg)' }}>{label}</span>
      {children}
    </div>
  )
}
