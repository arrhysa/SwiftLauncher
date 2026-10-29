import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Пустое состояние: иконка, заголовок и подсказка */
export function EmptyState({ icon: Icon, title, hint, children, className }: { icon: LucideIcon; title: string; hint?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <div className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div>
        <div className="text-[13px] font-medium">{title}</div>
        {hint && <div className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{hint}</div>}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  )
}
