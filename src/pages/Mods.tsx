import { Check, Download, Loader2, Package, PackageOpen, Search, SearchX, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import type { InstalledMod, ModHit } from '../../shared/types'

const fmtNum = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n))

export default function Mods() {
  const { t, profile, setPage, notify, gameDir } = useApp()
  const supported = profile.loader === 'fabric' || profile.loader === 'forge'
  const [tab, setTab] = useState<'search' | 'installed'>('search')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<ModHit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [mods, setMods] = useState<InstalledMod[]>([])
  const seq = useRef(0)

  const refresh = useCallback(async () => setMods(await window.api.listMods(profile.id)), [profile.id])

  const run = useCallback(async (query: string, offset: number) => {
    const my = ++seq.current
    setLoading(true)
    const r = await window.api.searchMods(profile.id, query, offset)
    if (my !== seq.current) return
    setLoading(false)
    if (!r.ok || !r.data) return notify(r.error || 'Modrinth', 'error')
    setHits((prev) => (offset ? [...prev, ...r.data!.hits] : r.data!.hits))
    setTotal(r.data.total)
  }, [profile.id, notify])

  useEffect(() => {
    if (!supported) return
    const id = window.setTimeout(() => run(q, 0), q ? 350 : 0)
    return () => window.clearTimeout(id)
  }, [q, supported, profile.id, profile.versionId, profile.loader, run])

  useEffect(() => { if (supported) refresh() }, [supported, refresh, profile.versionId])

  const install = async (h: ModHit) => {
    setBusyId(h.id)
    const r = await window.api.installMod(profile.id, h.id)
    setBusyId(null)
    if (!r.ok) return notify(r.error || 'Error', 'error')
    notify(`${t('modDone')}: ${r.data?.join(', ')}`)
    refresh()
  }
  const updateAll = async () => {
    setUpdating(true)
    const r = await window.api.updateMods(profile.id)
    setUpdating(false)
    if (!r.ok) return notify(r.error || 'Error', 'error')
    notify(r.data && r.data.length ? `${t('modsUpdated')}: ${r.data.join(', ')}` : t('modsUpToDate'))
    refresh()
  }
  const remove = async (m: InstalledMod) => { await window.api.removeMod(profile.id, m.file); refresh() }
  const installedIds = new Set(mods.map((m) => m.projectId).filter(Boolean))

  if (!supported) {
    return (
      <div className="panel rounded-lg">
        <EmptyState className="py-20" icon={Package} title={t('emptyNoLoader')} hint={t('modsNeedLoader')}>
          <Button variant="default" onClick={() => setPage('profiles')}>{t('goProfiles')}</Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="search">{t('modsSearchTab')}</TabsTrigger>
            <TabsTrigger value="installed">{t('fInstalled')} <span className="font-mono text-xs opacity-70">{mods.length}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge variant="violet" className="font-mono">{profile.loader === 'forge' ? 'Forge' : 'Fabric'} · {profile.versionId}</Badge>
        {tab === 'search' ? (
          <div className="relative ml-auto w-[320px]">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('modsSearch')} className="pl-10" />
          </div>
        ) : (
          <div className="ml-auto flex gap-2">
            <Button variant="default" disabled={updating || mods.length === 0} onClick={updateAll}>
              {updating ? <Loader2 className="animate-spin" /> : <Download />}{t('modsUpdateAll')}
            </Button>
            <Button onClick={() => window.api.openPath(`${gameDir}/mods`)}>{t('openMods')}</Button>
          </div>
        )}
      </div>

      <div className="panel min-h-0 flex-1 overflow-y-auto rounded-lg p-2">
        {tab === 'search' && (
          <>
            {loading && hits.length === 0 && <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('loading')}</div>}
            {!loading && hits.length === 0 && <EmptyState className="py-16" icon={SearchX} title={t('emptyNothing')} hint={t('emptyNothingHint')} />}
            {hits.map((h) => {
              const done = installedIds.has(h.id)
              return (
                <div key={h.id} className="flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors duration-200 hover:bg-surface">
                  {h.icon
                    ? <img src={h.icon} alt="" className="h-11 w-11 shrink-0 rounded-md bg-foreground/10 object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                    : <div className="h-11 w-11 shrink-0 rounded-md bg-foreground/10" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold">{h.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{t('modBy')} {h.author}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{h.description}</div>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmtNum(h.downloads)} ↓</span>
                  {done
                    ? <span className="flex w-28 shrink-0 items-center justify-center gap-1 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" />{t('installed')}</span>
                    : <Button size="sm" variant="default" className="w-28 shrink-0" disabled={busyId !== null} onClick={() => install(h)}>
                        {busyId === h.id ? <Loader2 className="animate-spin" /> : <Download />}{t('install')}
                      </Button>}
                </div>
              )
            })}
            {hits.length < total && hits.length > 0 && (
              <div className="p-3 text-center"><Button disabled={loading} onClick={() => run(q, hits.length)}>{t('showMore')}</Button></div>
            )}
          </>
        )}

        {tab === 'installed' && (
          <>
            {mods.length === 0 && (
              <EmptyState className="py-16" icon={PackageOpen} title={t('modsNone')} hint={t('emptyModsHint')}>
                <Button size="sm" onClick={() => setTab('search')}>{t('modsSearchTab')}</Button>
              </EmptyState>
            )}
            {mods.map((m) => (
              <div key={m.file} className="flex items-center gap-4 rounded-md px-4 py-2.5 transition-colors duration-200 hover:bg-surface">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.title}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{m.file} · {(m.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => remove(m)}><Trash2 />{t('delete')}</Button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
