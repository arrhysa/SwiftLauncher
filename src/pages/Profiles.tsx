import { Copy, Cpu, FolderOpen, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Group, Row } from '@/components/Setting'
import { cn } from '@/lib/utils'
import type { Profile } from '../../shared/types'

const Label = ({ children, hint }: { children: string; hint?: string }) => (
  <div className="mb-1.5">
    <div className="text-sm font-medium">{children}</div>
    {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
  </div>
)

export default function Profiles() {
  const { t, cfg, update, profile, manifest, info, gameDir } = useApp()
  const maxRam = Math.max(2048, Math.min(32768, Math.floor(((info?.totalMemMB ?? 8192) - 1024) / 256) * 256))

  const patch = (id: string, p: Partial<Profile>) => update((c) => ({ ...c, profiles: c.profiles.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const select = (id: string) => update((c) => ({ ...c, settings: { ...c.settings, selectedProfileId: id } }))
  const create = (from?: Profile) => {
    const id = 'p' + Date.now().toString(36)
    const base = from ?? profile
    const np: Profile = { ...base, id, name: from ? `${from.name} (2)` : t('newProfile') }
    update((c) => ({ ...c, profiles: [...c.profiles, np], settings: { ...c.settings, selectedProfileId: id } }))
  }
  const remove = (id: string) =>
    update((c) => {
      const rest = c.profiles.filter((p) => p.id !== id)
      return { ...c, profiles: rest, settings: { ...c.settings, selectedProfileId: rest[0].id } }
    })
  const browse = async () => {
    const dir = await window.api.pickFolder()
    if (dir) patch(profile.id, { gameDir: dir })
  }
  const knownVersion = !profile.versionId || !manifest || manifest.versions.some((v) => v.id === profile.versionId)
  const loader = profile.loader ?? 'vanilla'
  const ramGb = (profile.ram / 1024).toFixed(2).replace(/\.?0+$/, '')

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] gap-4">
      <div className="flex min-h-0 flex-col gap-3">
        <Button variant="default" onClick={() => create()}><Plus />{t('newProfile')}</Button>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {cfg.profiles.map((p) => {
            const sel = p.id === profile.id
            return (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                className={cn('panel no-drag w-full rounded-lg p-3.5 text-left hover:border-foreground/25', sel && '!border-primary/60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold">{p.name}</span>
                  {sel && <Badge variant="accent">{t('active')}</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-base font-medium tracking-tight">{p.versionId || '—'}</span>
                  {p.loader && p.loader !== 'vanilla' && <Badge>{p.loader === 'forge' ? 'Forge' : 'Fabric'}</Badge>}
                  <Badge>{(p.ram / 1024).toFixed(1)} GB</Badge>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel flex min-h-0 flex-col rounded-lg p-5">
        <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="general"><SlidersHorizontal />{t('tabGeneral')}</TabsTrigger>
            <TabsTrigger value="resources"><Cpu />{t('tabResources')}</TabsTrigger>
            <TabsTrigger value="folder"><FolderOpen />{t('tabFolder')}</TabsTrigger>
          </TabsList>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <TabsContent value="general" className="space-y-5">
              <div>
                <Label>{t('name')}</Label>
                <Input value={profile.name} onChange={(e) => patch(profile.id, { name: e.target.value })} />
              </div>
              <div>
                <Label hint={knownVersion ? t('versionHint') : undefined}>{t('version')}</Label>
                <Input className={cn('font-mono', !knownVersion && 'border-red-500/60')} list="mc-versions" value={profile.versionId}
                  onChange={(e) => patch(profile.id, { versionId: e.target.value.trim() })} />
                <datalist id="mc-versions">{manifest?.versions.slice(0, 400).map((v) => <option key={v.id} value={v.id} />)}</datalist>
              </div>
              <Group>
                <Row label={t('loader')}>
                  <Tabs value={loader} onValueChange={(v) => patch(profile.id, { loader: v as Profile['loader'] })}>
                    <TabsList>
                      <TabsTrigger value="vanilla">{t('loaderVanilla')}</TabsTrigger>
                      <TabsTrigger value="fabric">{t('loaderFabric')}</TabsTrigger>
                      <TabsTrigger value="forge">{t('loaderForge')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </Row>
                {loader !== 'vanilla' && (
                  <Row block label={t('loaderVersion')} hint={t('loaderVersionHint')}>
                    <div className="flex gap-2">
                      <Input className="font-mono" placeholder={loader === 'forge' ? '47.3.0' : '0.16.9'} value={profile.loaderVersion ?? ''}
                        onChange={(e) => patch(profile.id, { loaderVersion: e.target.value.trim() })} />
                      <Button className="shrink-0" onClick={() => window.api.openPath(`${gameDir}/mods`)}><FolderOpen />{t('openMods')}</Button>
                    </div>
                  </Row>
                )}
              </Group>
            </TabsContent>

            <TabsContent value="resources" className="space-y-5">
              <div className="rounded-lg border border-border bg-surface p-5">
                <div className="mb-4 flex items-end justify-between">
                  <span className="text-sm font-medium">{t('ram')}</span>
                  <span className="font-mono text-2xl font-medium">{ramGb}<span className="ml-1 text-sm text-muted-foreground">GB</span></span>
                </div>
                <Slider value={[Math.min(profile.ram, maxRam)]} min={1024} max={maxRam} step={256} onValueChange={([v]) => patch(profile.id, { ram: v })} />
                <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground"><span>1 GB</span><span>{Math.round(maxRam / 1024)} GB</span></div>
              </div>
              <div>
                <Label>{t('jvmArgs')}</Label>
                <Textarea rows={4} spellCheck={false} className="font-mono text-xs" placeholder="-XX:+UseG1GC -Dfile.encoding=UTF-8"
                  value={profile.jvmArgs} onChange={(e) => patch(profile.id, { jvmArgs: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="folder" className="space-y-5">
              <div>
                <Label>{t('gameDir')}</Label>
                <div className="flex gap-2">
                  <Input className="font-mono text-xs" value={profile.gameDir} placeholder={`${t('gameDirDefault')}: ${cfg.settings.defaultGameDir}`}
                    onChange={(e) => patch(profile.id, { gameDir: e.target.value })} />
                  <Button className="shrink-0" onClick={browse}><FolderOpen />{t('browse')}</Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          <Button onClick={() => create(profile)}><Copy />{t('duplicate')}</Button>
          <Button variant="destructive" disabled={cfg.profiles.length < 2} onClick={() => remove(profile.id)}><Trash2 />{t('delete')}</Button>
        </div>
      </div>
    </div>
  )
}
