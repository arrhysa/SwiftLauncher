import { ChevronDown } from 'lucide-react'
import { useApp } from '@/lib/store'
import { NAV } from './Sidebar'

/** Топбар 64px. Справа оставлено место под системные кнопки окна. */
export default function Topbar() {
  const { page, t, cfg, setLoginOpen } = useApp()
  const cur = NAV.find((n) => n.id === page)!
  const acc = cfg.account
  return (
    <header className="drag flex h-16 shrink-0 items-center justify-between border-b border-border pl-6 pr-[152px]">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">{t(cur.label)}</h1>
        <p className="truncate text-xs text-muted-foreground">{t(cur.sub)}</p>
      </div>
      <button
        onClick={() => setLoginOpen(true)}
        className="no-drag group flex items-center gap-2.5 rounded-md border border-border bg-surface py-1 pl-1 pr-2.5 hover:bg-surface-hover"
      >
        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded bg-foreground/10">
          <img src={`https://mc-heads.net/avatar/${acc?.name || 'Steve'}/48`} alt="" draggable={false}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="h-7 w-7 [image-rendering:pixelated]" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-medium">{acc?.name ?? t('signInShort')}</span>
          <span className="block text-[11px] text-muted-foreground">{acc ? (acc.type === 'microsoft' ? t('accMicrosoft') : t('accOffline')) : t('noAccount')}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </header>
  )
}
