import { Check } from 'lucide-react'
import { useApp } from '@/lib/store'
import type { Key } from '@/lib/i18n'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STEPS: { k: string; label: Key }[] = [
  { k: 'java', label: 'stepJava' },
  { k: 'client', label: 'stepClient' },
  { k: 'libraries', label: 'stepLibraries' },
  { k: 'assets', label: 'stepAssets' },
  { k: 'launch', label: 'stepLaunch' }
]

/** Оверлей прогресса: пока идёт установка или запуск */
export default function ProgressOverlay() {
  const { t, gameState, progress, profile, logs } = useApp()
  if (gameState !== 'installing' && gameState !== 'launching') return null

  const active = gameState === 'launching' ? 4 : progress ? Math.max(0, STEPS.findIndex((s) => s.k === progress.phase)) : 1
  const pct = gameState === 'installing' && progress && progress.percent >= 0 ? progress.percent : null
  const version = progress?.versionId || profile.versionId
  const tail = logs.filter((l) => l.level !== 'game').slice(-3)
  const loader = profile.loader && profile.loader !== 'vanilla' ? (profile.loader === 'forge' ? 'Forge' : 'Fabric') : null

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 animate-in fade-in-0 duration-150">
      <div className="panel w-[460px] rounded-lg p-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{gameState === 'launching' ? t('progressLaunching') : t('progressInstalling')}</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">{version}{loader ? ` · ${loader}` : ''}</div>
          </div>
          <div className="font-mono text-xl tabular-nums">{pct !== null ? `${pct}%` : '…'}</div>
        </div>

        <Progress value={pct} className="mt-5" />

        <ol className="mt-4 flex items-center justify-between text-xs">
          {STEPS.map((s, i) => {
            const done = i < active
            const cur = i === active
            return (
              <li key={s.k} className={cn('flex items-center gap-1.5 transition-colors duration-200', done ? 'text-foreground' : cur ? 'text-primary' : 'text-muted-foreground/60')}>
                {done ? <Check className="h-3 w-3" /> : <span className="font-mono">{i + 1}</span>}
                {t(s.label)}
              </li>
            )
          })}
        </ol>

        <div className="mt-5 min-h-[56px] rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {tail.length === 0 ? <span className="opacity-60">{t('progressWait')}</span> : tail.map((l, i) => <div key={i} className="truncate">{l.text}</div>)}
        </div>
      </div>
    </div>
  )
}
