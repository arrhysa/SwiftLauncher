import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

/** value = null → неопределённый прогресс (бегущая полоса) */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, 'value'> & { value: number | null }
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root ref={ref} value={value ?? undefined} className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10', className)} {...props}>
    {value === null ? (
      <ProgressPrimitive.Indicator className="h-full w-2/5 animate-indeterminate rounded-full bg-primary" />
    ) : (
      <ProgressPrimitive.Indicator
        className="h-full w-full rounded-full bg-primary transition-transform duration-150 ease-out"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
))
Progress.displayName = 'Progress'

export { Progress }
