import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'no-drag select-text flex h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground transition-colors duration-150',
      'placeholder:text-muted-foreground/60 hover:border-foreground/20 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'no-drag select-text flex w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground transition-colors duration-150',
      'placeholder:text-muted-foreground/60 hover:border-foreground/20 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
