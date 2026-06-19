import { useThrottledCallback } from '@/shared/utils/useThrottledCallback'

interface CustomColorInputProps {
  value: string
  onCommit: (color: string) => void
}

export function CustomColorInput({ value, onCommit }: CustomColorInputProps) {
  const throttledCommit = useThrottledCallback(onCommit, 200)

  return (
    <input
      type="color"
      className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
      value={value}
      onChange={(e) => throttledCommit(e.target.value)}
      aria-label="Custom color"
    />
  )
}
