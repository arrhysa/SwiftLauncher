import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Строго: нейтральная рамка; цвет только там, где он несёт смысл (статус)
const badgeVariants = cva('inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium leading-[18px] whitespace-nowrap', {
  variants: {
    variant: {
      default: 'border-border text-muted-foreground',
      accent: 'border-primary/30 text-primary',
      blue: 'border-border text-foreground/80',
      violet: 'border-border text-foreground/80',
      success: 'border-emerald-500/30 text-emerald-400',
      warning: 'border-amber-500/30 text-amber-400'
    }
  },
  defaultVariants: { variant: 'default' }
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
