import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Главная кнопка запуска. Сплошной акцентный цвет; анимация нажатия и цвета — глобальная (index.css). */
export function PlayButton({ children, onClick, disabled, danger }: { children: ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'no-drag flex h-11 min-w-[200px] items-center justify-center gap-2.5 rounded-md px-8 text-sm font-semibold tracking-wide',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40',
        danger
          ? 'border border-red-500/40 text-red-400 hover:bg-red-500/10'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:hover:bg-primary'
      )}
    >
      {children}
    </button>
  )
}
