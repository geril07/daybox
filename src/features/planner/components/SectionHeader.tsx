import { cn } from '@/shared/utils/cn'

import type { SectionTone } from '../queries'

interface SectionHeaderProps {
  label: string
  tone?: SectionTone
}

export function SectionHeader({ label, tone = 'default' }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'section-label pt-5 pb-2 text-xs font-semibold tracking-widest uppercase',
        tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {label}
    </div>
  )
}
