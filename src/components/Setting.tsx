import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Group({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <section className={className}>
      {title && <h3 className="mb-2 px-1 text-xs font-medium text-muted-foreground">{title}</h3>}
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">{children}</div>
    </section>
  )
}

export function Row({ label, hint, children, block }: { label: string; hint?: string; children?: ReactNode; block?: boolean }) {
  return (
    <div className={cn('px-5 py-4', block ? 'space-y-3' : 'flex items-center justify-between gap-6')}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</div>}
      </div>
      {children && <div className={block ? '' : 'shrink-0'}>{children}</div>}
    </div>
  )
}
