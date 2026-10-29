import { FolderOpen, Download, Square, UserRound, Zap } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'
import { PlayButton } from '@/components/PlayButton'
import { cn } from '@/lib/utils'

const Dl = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <dt className="py-1.5 text-muted-foreground">{label}</dt>
    <dd className="py-1.5 font-mono text-[13px]">{children}</dd>
  </>
)

export default function Home() {
  const { t, profile, cfg, update, manifest, installed, gameState, play, stop, setPage, setLoginOpen } = useApp()
  const v = manifest?.versions.find((x) => x.id === profile.versionId)
  const acc = cfg.account
  const latest = manifest?.latest.release
  const busy = gameState === 'installing' || gameState === 'launching'
  const running = gameState === 'running'
  const isInstalled = installed.includes(profile.versionId)
  const loader = profile.loader === 'forge' ? 'Forge' : profile.loader === 'fabric' ? 'Fabric' : '—'
  const setVersion = (id: string) => update((c) => ({ ...c, profiles: c.profiles.map((p) => (p.id === profile.id ? { ...p, versionId: id } : p)) }))
  const typeLabel = v ? (v.type === 'release' ? t('tRelease') : v.type === 'snapshot' ? t('tSnapshot') : v.type === 'old_beta' ? t('tBeta') : t('tAlpha')) : '—'
  const shown = installed.filter((id) => manifest?.versions.some((m) => m.id === id) ?? true).slice(0, 18)

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_280px] gap-4">
      <div className="flex min-h-0 flex-col gap-4">
        <section className="panel flex flex-1 flex-col rounded-lg p-6">
          <div className="text-xs text-muted-foreground">{t('selectedVersion')}</div>
          <div className="mt-1 truncate font-mono text-5xl font-medium leading-none tracking-tight">{profile.versionId || '—'}</div>

          <dl className="mt-6 grid max-w-md grid-cols-[120px_1fr] border-t border-border pt-3 text-[13px]">
            <Dl label={t('profile')}>{profile.name}</Dl>
            <Dl label={t('kind')}>{typeLabel}</Dl>
            <Dl label={t('loader')}>{loader}</Dl>
            <Dl label="RAM">{(profile.ram / 1024).toFixed(1)} GB</Dl>
            <Dl label={t('status')}>
              {profile.versionId ? (
                <span className={cn('inline-flex items-center gap-1.5 font-sans text-xs', isInstalled ? 'text-emerald-400' : 'text-amber-400')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', isInstalled ? 'bg-emerald-500' : 'bg-amber-500')} />
                  {isInstalled ? t('installed') : t('notInstalled')}
                </span>
              ) : null}
            </Dl>
          </dl>
          {latest && latest !== profile.versionId && (
            <button className="no-drag mt-2 self-start text-xs text-primary hover:underline underline-offset-4" onClick={() => setVersion(latest)}>
              {t('useLatest')} · <span className="font-mono">{latest}</span>
            </button>
          )}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
            <div className="flex items-center gap-2">
              <Select value={profile.id} disabled={busy || running} onValueChange={(id) => update((c) => ({ ...c, settings: { ...c.settings, selectedProfileId: id } }))}>
                <SelectTrigger className="h-11 w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cfg.profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} <span className="ml-1 font-mono text-xs text-muted-foreground">{p.versionId}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" className="h-11 w-11" aria-label={t('openFolder')} onClick={() => window.api.openPath(profile.gameDir.trim() || cfg.settings.defaultGameDir)}>
                <FolderOpen />
              </Button>
            </div>
            <PlayButton danger={running} disabled={busy || (!profile.versionId && !running)} onClick={running ? stop : play}>
              {running ? <Square className="h-4 w-4 fill-current" /> : <Zap className="h-4 w-4 fill-current" />}
              {running ? t('stop') : t('play')}
            </PlayButton>
          </div>
        </section>

        <section className="panel rounded-lg p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold">{t('installedVersions')}</h2>
            {shown.length > 0 && <span className="text-xs text-muted-foreground">{t('quickSelect')}</span>}
          </div>
          {shown.length === 0 ? (
            <EmptyState className="py-4" icon={Download} title={t('emptyInstalled')} hint={t('emptyInstalledHint')}>
              <Button size="sm" variant="default" onClick={() => setPage('versions')}>{t('navVersions')}</Button>
            </EmptyState>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {shown.map((id) => (
                <button key={id} onClick={() => setVersion(id)}
                  className={cn('no-drag rounded border px-2.5 py-1 font-mono text-xs',
                    id === profile.versionId ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground')}>
                  {id}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <section className="panel flex flex-1 flex-col rounded-lg p-5">
          <h2 className="mb-4 text-[13px] font-semibold">{t('player')}</h2>
          {acc ? (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-3">
                <img src={`https://mc-heads.net/avatar/${acc.name}/80`} alt="" draggable={false} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  className="h-12 w-12 rounded bg-foreground/10 [image-rendering:pixelated]" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{acc.name}</div>
                  <Badge className="mt-1" variant={acc.type === 'microsoft' ? 'accent' : 'default'}>{acc.type === 'microsoft' ? t('accMicrosoft') : t('accOffline')}</Badge>
                </div>
              </div>
              <Button size="sm" className="mt-auto w-full" onClick={() => setLoginOpen(true)}>{t('changeAccount')}</Button>
            </div>
          ) : (
            <EmptyState className="flex-1" icon={UserRound} title={t('emptyAccount')} hint={t('emptyAccountHint')}>
              <Button size="sm" variant="default" onClick={() => setLoginOpen(true)}>{t('signInShort')}</Button>
            </EmptyState>
          )}
        </section>

        <section className="panel rounded-lg p-5">
          <div className="text-xs text-muted-foreground">{t('latestIs')}</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xl font-medium">{latest ?? '…'}</span>
            <Button size="sm" disabled={!latest || latest === profile.versionId} onClick={() => latest && setVersion(latest)}>{t('select')}</Button>
          </div>
        </section>
      </div>
    </div>
  )
}
