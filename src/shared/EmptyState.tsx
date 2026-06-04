import { FilePlus } from 'lucide-react'

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-14 text-center">
      <div className="bg-border text-muted-foreground mb-1 flex h-12 w-12 items-center justify-center rounded-xl">
        <FilePlus size={20} />
      </div>
      <div className="text-fg-2 text-sm font-medium">{title}</div>
      <div className="text-muted-foreground max-w-[260px] text-xs leading-relaxed">
        {description}
      </div>
    </div>
  )
}
