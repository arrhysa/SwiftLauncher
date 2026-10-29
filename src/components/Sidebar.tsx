import { Layers, Package, Play, ScrollText, Settings, UserCog } from 'lucide-react'
import { useApp, type Page } from '@/lib/store'
import type { Key } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Bolt } from './Bolt'

export const NAV: { id: Page; icon: typeof Play; label: Key; sub: Key }[] = [
  { id: 'play', icon: Play, label: 'navPlay', sub: 'subPlay' },
  { id: 'versions', icon: Layers, label: 'navVersions', sub: 'subVersions' },
  { id: 'profiles', icon: UserCog, label: 'navProfiles', sub: 'subProfiles' },
  { id: 'mods', icon: Package, label: 'navMods', sub: 'subMods' },
  { id: 'settings', icon: Settings, label: 'navSettings', sub: 'subSettings' },
  { id: 'logs', icon: ScrollText, label: 'navLogs', sub: 'subLogs' }
]

/** Сайдбар 220px */
export default function Sidebar() {
  const { page, setPage, t, gameState } = useApp()
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-background">
      <div className="drag flex h-16 items-center gap-2.5 border-b border-border px-5">
        <Bolt className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight">SwiftLauncher</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map(({ id, icon: Icon, label }, i) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={cn(
                'no-drag group relative flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium',
                active ? 'bg-surface-hover text-foreground' : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
            >
              <span className={cn('absolute -left-3 top-2 h-5 w-0.5 rounded-r bg-primary transition-opacity duration-200', active ? 'opacity-100' : 'opacity-0')} />
              <Icon className={cn('h-4 w-4', active && 'text-primary')} strokeWidth={1.5} />
              <span>{t(label)}</span>
              {id === 'logs' && gameState !== 'idle' ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              ) : (
                <kbd className="ml-auto font-mono text-[10px] text-muted-foreground/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">Alt {i + 1}</kbd>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
