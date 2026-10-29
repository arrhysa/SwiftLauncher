import { Check, Copy, ExternalLink, Loader2, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginModal() {
  const { t, loginOpen, setLoginOpen, cfg, update, deviceCode, notify } = useApp()
  const s = cfg.settings
  const acc = cfg.account
  const [tab, setTab] = useState<'microsoft' | 'offline'>('microsoft')
  const [nick, setNick] = useState('')
  const [signing, setSigning] = useState(false)
  const nickOk = /^[A-Za-z0-9_]{3,16}$/.test(nick)

  useEffect(() => {
    if (loginOpen) {
      setNick(acc?.type === 'offline' ? acc.name : '')
      setTab(acc?.type === 'offline' ? 'offline' : 'microsoft')
    }
  }, [loginOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const setAccount = (a: typeof cfg.account) => update((c) => ({ ...c, account: a }))

  const microsoft = async () => {
    setSigning(true)
    const r = await window.api.msLogin()
    setSigning(false)
    if (r.ok && r.data) {
      setAccount(r.data)
      setLoginOpen(false)
      notify(`${t('signedInAs')} ${r.data.name}`)
    } else if (r.error && r.error !== 'Вход отменён') notify(r.error, 'error')
  }
  const offline = async () => {
    setAccount(await window.api.offlineLogin(nick))
    setLoginOpen(false)
    notify(`${t('signedInAs')} ${nick}`)
  }
  const logout = async () => {
    await window.api.logout()
    setAccount(null)
  }

  return (
    <Dialog
      open={loginOpen}
      onOpenChange={(o) => {
        if (!o && deviceCode) window.api.msCancel()
        setLoginOpen(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('loginTitle')}</DialogTitle>
          <DialogDescription>{t('loginDesc')}</DialogDescription>
        </DialogHeader>

        {acc && (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
            <img src={`https://mc-heads.net/avatar/${acc.name}/48`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
              className="h-10 w-10 rounded-lg [image-rendering:pixelated]" />
            <div className="mr-auto min-w-0">
              <div className="truncate text-sm font-semibold">{acc.name}</div>
              <Badge variant={acc.type === 'microsoft' ? 'accent' : 'default'}>{acc.type === 'microsoft' ? t('accMicrosoft') : t('accOffline')}</Badge>
            </div>
            <Button size="sm" onClick={logout}><LogOut />{t('signOut')}</Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="microsoft" className="flex-1"><ShieldCheck />{t('accMicrosoft')}</TabsTrigger>
            <TabsTrigger value="offline" className="flex-1"><UserRound />{t('accOffline')}</TabsTrigger>
          </TabsList>

          <TabsContent value="microsoft" className="mt-4 space-y-4">
            {deviceCode ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">{t('deviceText')}</p>
                <div className="selectable rounded-md border border-border bg-background py-3 font-mono text-2xl font-medium tracking-[0.25em] text-primary">
                  {deviceCode.userCode}
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="default" onClick={() => window.api.openExternal(deviceCode.verificationUri)}><ExternalLink />{t('openPage')}</Button>
                  <Button onClick={() => { navigator.clipboard.writeText(deviceCode.userCode); notify(t('copied')) }}><Copy />{t('copy')}</Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('waiting')}</div>
                <Button size="sm" variant="ghost" onClick={() => window.api.msCancel()}>{t('cancel')}</Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t('azureId')}</label>
                  <Input spellCheck={false} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={s.azureClientId}
                    onChange={(e) => update((c) => ({ ...c, settings: { ...c.settings, azureClientId: e.target.value.trim() } }))} />
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t('azureHint')}</p>
                </div>
                <Button variant="default" className="w-full" disabled={signing || !s.azureClientId} onClick={microsoft}>
                  {signing ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{t('msSignIn')}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="offline" className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('offlineNick')}</label>
              <Input placeholder="Steve" maxLength={16} value={nick} onChange={(e) => setNick(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nickOk) offline() }} />
              {nick && !nickOk && <p className="mt-1.5 text-xs text-red-400">{t('nickError')}</p>}
            </div>
            <Button variant="default" className="w-full" disabled={!nickOk} onClick={offline}><Check />{t('useNick')}</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
