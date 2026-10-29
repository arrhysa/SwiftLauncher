import { useApp } from '@/lib/store'

/** Футер 32px */
export default function Footer() {
  const { t, gameState, profile, info, online, loadingVersions, update_, setPage } = useApp()
  const state =
    gameState === 'installing' ? t('progressInstalling') : gameState === 'launching' ? t('progressLaunching') : gameState === 'running' ? t('running') : t('ready')
  const dot = gameState === 'idle' ? 'bg-emerald-500' : gameState === 'running' ? 'bg-primary' : 'bg-amber-500'
  const loader = profile.loader && profile.loader !== 'vanilla' ? ` · ${profile.loader === 'forge' ? 'Forge' : 'Fabric'}` : ''
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-background px-4 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{state}</div>
      <div className="font-mono">{profile.name} · {profile.versionId || '—'}{loader} · {(profile.ram / 1024).toFixed(1)} GB</div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${loadingVersions ? 'bg-amber-500' : online ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {online ? t('mojangOnline') : t('mojangOffline')}
        </span>
        {(update_.status === 'ready' || update_.status === 'manual' || update_.status === 'downloading') && (
          <button className="no-drag text-primary hover:underline underline-offset-2" onClick={() => setPage('settings')}>
            {update_.status === 'downloading' ? `${t('updDownloading')} ${update_.percent ?? 0}%` : `${update_.status === 'ready' ? t('updReady') : t('updManual')} · v${update_.version}`}
          </button>
        )}
        <span className="font-mono">v{info?.version ?? '1.0.0'}</span>
      </div>
    </footer>
  )
}
