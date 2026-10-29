import { Check, Download, PackageOpen, RefreshCw, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { VersionType } from '../../shared/types'

type Filter = 'all' | 'installed' | VersionType
const PAGE = 90

export default function Versions() {
  const { t, manifest, manifestError, loadingVersions, reloadVersions, installed, profile, update, gameState, progress, installVersion, cfg, setPage } = useApp()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('release')
  const [limit, setLimit] = useState(PAGE)
  const locale = cfg.settings.lang === 'ru' ? 'ru-RU' : 'en-US'

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return (manifest?.versions ?? []).filter((v) => {
      if (filter === 'installed' ? !installed.includes(v.id) : filter !== 'all' && v.type !== filter) return false
      return !query || v.id.toLowerCase().includes(query)
    })
  }, [manifest, q, filter, installed])

  const busy = gameState !== 'idle'
  const pick = (id: string) => {
    update((c) => ({ ...c, profiles: c.profiles.map((p) => (p.id === profile.id ? { ...p, versionId: id } : p)) }))
    setPage('play')
  }
  const typeLabel = (type: string) => (type === 'release' ? t('tRelease') : type === 'snapshot' ? t('tSnapshot') : type === 'old_beta' ? t('tBeta') : t('tAlpha'))

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as Filter); setLimit(PAGE) }}>
          <TabsList>
            <TabsTrigger value="release">{t('tRelease')}</TabsTrigger>
            <TabsTrigger value="snapshot">{t('tSnapshot')}</TabsTrigger>
            <TabsTrigger value="old_beta">{t('tBeta')}</TabsTrigger>
            <TabsTrigger value="old_alpha">{t('tAlpha')}</TabsTrigger>
            <TabsTrigger value="installed">{t('fInstalled')}</TabsTrigger>
            <TabsTrigger value="all">{t('fAll')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-[280px]">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} placeholder={t('search')} className="pl-10" />
        </div>
        <Button size="icon" onClick={reloadVersions} disabled={loadingVersions} aria-label={t('retry')}>
          <RefreshCw className={cn(loadingVersions && 'animate-spin')} />
        </Button>
      </div>

      {manifest?.offline && <div className="mb-3 rounded-md border border-amber-500/30 px-3 py-2 text-[13px] text-amber-400">{t('offlineManifest')}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {manifestError && !manifest && (
          <EmptyState icon={SearchX} title={t('versionsFailed')}><Button variant="default" onClick={reloadVersions}>{t('retry')}</Button></EmptyState>
        )}
        {loadingVersions && !manifest && <div className="p-6 text-sm text-muted-foreground">{t('loading')}</div>}
        {manifest && list.length === 0 && (
          filter === 'installed'
            ? <EmptyState icon={PackageOpen} title={t('emptyInstalled')} hint={t('emptyInstalledHint')} className="py-20" />
            : <EmptyState icon={SearchX} title={t('emptyNothing')} hint={t('emptyNothingHint')} className="py-20" />
        )}

        <div key={filter} className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 pb-3">
          {list.slice(0, limit).map((v) => {
            const isInst = installed.includes(v.id)
            const isSel = profile.versionId === v.id
            const isLatest = manifest?.latest.release === v.id
            const hasFabric = installed.some((id) => id.startsWith('fabric-loader-') && id.endsWith('-' + v.id))
            const hasForge = installed.some((id) => /forge/i.test(id) && id.startsWith(v.id + '-'))
            const working = gameState === 'installing' && progress?.versionId === v.id
            return (
              <div
                key={v.id}
                className={cn('panel flex flex-col gap-3 rounded-lg p-4 transition-colors duration-150 hover:border-foreground/25', isSel && '!border-primary/60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    <Badge variant={v.type === 'release' ? 'accent' : 'default'}>{typeLabel(v.type)}</Badge>
                    {isLatest && <Badge>{t('latestIs')}</Badge>}
                  </div>
                  {isInst && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <div>
                  <div className="truncate font-mono text-xl font-medium tracking-tight">{v.id}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(v.releaseTime).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="flex min-h-[20px] flex-wrap gap-1.5">
                  {hasFabric && <Badge>Fabric</Badge>}
                  {hasForge && <Badge>Forge</Badge>}
                  {working && <Badge variant="accent">{progress && progress.percent >= 0 ? `${progress.percent}%` : '…'}</Badge>}
                </div>
                <div className="mt-auto flex gap-2">
                  {!isInst && <Button size="icon-sm" className="h-8 w-8" disabled={busy} onClick={() => installVersion(v.id)} aria-label={t('install')}><Download /></Button>}
                  <Button size="sm" className="h-8 flex-1" variant="secondary" disabled={isSel} onClick={() => pick(v.id)}>
                    {isSel ? t('selected') : t('select')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        {list.length > limit && (
          <div className="pb-4 text-center"><Button onClick={() => setLimit((l) => l + PAGE)}>{t('showMore')} ({list.length - limit})</Button></div>
        )}
      </div>
    </div>
  )
}
