import { Coffee, Download, FolderOpen, Info, Loader2, LogOut, Palette, RefreshCw, Rocket, UserRound } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { Group, Row } from '@/components/Setting'

export default function SettingsPage() {
  const { t, cfg, update, info, setLoginOpen, update_ } = useApp()
  const s = cfg.settings
  const acc = cfg.account
  const set = (p: Partial<typeof s>) => update((c) => ({ ...c, settings: { ...c.settings, ...p } }))
  const logout = async () => { await window.api.logout(); update((c) => ({ ...c, account: null })) }
  const pickJava = async () => { const f = await window.api.pickFile(); if (f) set({ javaPath: f }) }
  const pickDir = async () => { const d = await window.api.pickFolder(); if (d) set({ defaultGameDir: d }) }

  return (
    <div className="h-full overflow-y-auto pr-1">
      <Tabs defaultValue="account" className="max-w-[820px]">
        <TabsList>
          <TabsTrigger value="account"><UserRound />{t('tabAccount')}</TabsTrigger>
          <TabsTrigger value="appearance"><Palette />{t('appearance')}</TabsTrigger>
          <TabsTrigger value="java"><Coffee />{t('java')}</TabsTrigger>
          <TabsTrigger value="launcher"><Rocket />{t('tabLauncher')}</TabsTrigger>
          <TabsTrigger value="about"><Info />{t('about')}</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-5 space-y-5">
          <div className="panel rounded-lg">
            {acc ? (
              <div className="flex items-center gap-4 p-5">
                <img src={`https://mc-heads.net/avatar/${acc.name}/64`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  className="h-14 w-14 rounded-md ring-1 ring-white/15 [image-rendering:pixelated]" />
                <div className="mr-auto">
                  <div className="text-base font-semibold tracking-tight">{acc.name}</div>
                  <Badge variant={acc.type === 'microsoft' ? 'accent' : 'default'}>{acc.type === 'microsoft' ? t('accMicrosoft') : t('accOffline')}</Badge>
                </div>
                <Button onClick={() => setLoginOpen(true)}>{t('changeAccount')}</Button>
                <Button variant="ghost" onClick={logout}><LogOut />{t('signOut')}</Button>
              </div>
            ) : (
              <EmptyState icon={UserRound} title={t('emptyAccount')} hint={t('emptyAccountHint')}>
                <Button variant="default" onClick={() => setLoginOpen(true)}>{t('signInShort')}</Button>
              </EmptyState>
            )}
          </div>
          <Group title="Microsoft">
            <Row block label={t('azureId')} hint={t('azureHint')}>
              <Input spellCheck={false} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={s.azureClientId}
                onChange={(e) => set({ azureClientId: e.target.value.trim() })} />
            </Row>
          </Group>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <Group>
            <Row label={t('theme')}>
              <Tabs value={s.theme} onValueChange={(v) => set({ theme: v as 'dark' | 'light' })}>
                <TabsList><TabsTrigger value="dark">{t('dark')}</TabsTrigger><TabsTrigger value="light">{t('light')}</TabsTrigger></TabsList>
              </Tabs>
            </Row>
            <Row label={t('language')}>
              <Tabs value={s.lang} onValueChange={(v) => set({ lang: v as 'ru' | 'en' })}>
                <TabsList><TabsTrigger value="ru">Русский</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>
              </Tabs>
            </Row>
          </Group>
        </TabsContent>

        <TabsContent value="java" className="mt-5">
          <Group>
            <Row label={t('javaAuto')} hint={t('javaAutoHint')}><Switch checked={s.autoJava} onCheckedChange={(v) => set({ autoJava: v })} /></Row>
            <Row block label={t('javaPath')} hint={t('javaPathHint')}>
              <div className="flex gap-2">
                <Input className="font-mono text-xs" placeholder="C:\Program Files\Java\bin\javaw.exe" value={s.javaPath} onChange={(e) => set({ javaPath: e.target.value })} />
                <Button className="shrink-0" onClick={pickJava}><FolderOpen />{t('browse')}</Button>
              </div>
            </Row>
          </Group>
        </TabsContent>

        <TabsContent value="launcher" className="mt-5">
          <Group>
            <Row label={t('hideOnLaunch')} hint={t('hideOnLaunchHint')}><Switch checked={s.hideOnLaunch} onCheckedChange={(v) => set({ hideOnLaunch: v })} /></Row>
            <Row block label={t('gameDir')}>
              <div className="flex gap-2">
                <Input className="font-mono text-xs" value={s.defaultGameDir} onChange={(e) => set({ defaultGameDir: e.target.value })} />
                <Button className="shrink-0" onClick={pickDir}><FolderOpen />{t('browse')}</Button>
              </div>
            </Row>
          </Group>
        </TabsContent>

        <TabsContent value="about" className="mt-5">
          <Group>
            <Row label="SwiftLauncher"><Badge variant="accent" className="font-mono">v{info?.version}</Badge></Row>
            <Row
              label={t('updates')}
              hint={
                update_.status === 'checking' ? t('updChecking')
                : update_.status === 'downloading' ? `${t('updDownloading')} v${update_.version} · ${update_.percent ?? 0}%`
                : update_.status === 'ready' ? `${t('updReady')} · v${update_.version}. ${t('updReadyHint')}`
                : update_.status === 'manual' ? `${t('updManual')} · v${update_.version}. ${t('updManualHint')}`
                : update_.status === 'error' ? t('updError')
                : update_.status === 'none' ? t('updNone') : undefined
              }
            >
              {update_.status === 'ready' ? (
                <Button size="sm" variant="default" onClick={() => window.api.installUpdate()}><Download />{t('updInstall')}</Button>
              ) : update_.status === 'manual' && update_.url ? (
                <Button size="sm" variant="default" onClick={() => window.api.openExternal(update_.url!)}><Download />{t('updDownloadPage')}</Button>
              ) : (
                <Button size="sm" disabled={update_.status === 'checking' || update_.status === 'downloading'} onClick={() => window.api.checkUpdate()}>
                  {update_.status === 'checking' ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t('updCheck')}
                </Button>
              )}
            </Row>
            <Row label={t('dataFolder')} hint={info?.dataDir}>
              <Button size="sm" onClick={() => info && window.api.openPath(info.dataDir)}><FolderOpen />{t('openFolder')}</Button>
            </Row>
          </Group>
        </TabsContent>
      </Tabs>
    </div>
  )
}
