import { Switch } from '@base-ui/react'

interface ToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Toggle({ checked, onCheckedChange }: ToggleProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="transition-background relative h-[21px] w-[38px] shrink-0 cursor-pointer rounded-full duration-200"
      style={{ background: checked ? 'var(--accent)' : 'var(--border-strong)' }}
    >
      <Switch.Thumb
        className="absolute top-[2.5px] left-[2.5px] block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? 'translateX(17px)' : 'translateX(0)' }}
      />
    </Switch.Root>
  )
}
