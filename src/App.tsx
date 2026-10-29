import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { useApp, type Page } from '@/lib/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar, { NAV } from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Footer from '@/components/Footer'
import LoginModal from '@/components/LoginModal'
import ProgressOverlay from '@/components/ProgressOverlay'
import Home from '@/pages/Home'
import Versions from '@/pages/Versions'
import Profiles from '@/pages/Profiles'
import SettingsPage from '@/pages/Settings'
import Logs from '@/pages/Logs'
import Mods from '@/pages/Mods'

const VIEWS: Record<Page, () => JSX.Element> = { play: Home, versions: Versions, profiles: Profiles, mods: Mods, settings: SettingsPage, logs: Logs }

export default function App() {
  const { page, setPage, ready, cfg, update_, t } = useApp()

  // Alt+1…6 — быстрые переходы между экранами
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= NAV.length) {
        e.preventDefault()
        setPage(NAV[n - 1].id)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setPage])

  // Когда обновление скачано, предлагаем перезапуск
  useEffect(() => {
    if (update_.status === 'ready') {
      toast(`${t('updReady')} · v${update_.version}`, {
        id: 'update-ready',
        duration: Infinity,
        action: { label: t('updInstall'), onClick: () => window.api.installUpdate() },
        cancel: { label: t('updLater'), onClick: () => undefined }
      })
    }
  }, [update_.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null
  const View = VIEWS[page]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="min-h-0 flex-1 overflow-hidden px-6 py-5">
              <motion.div key={page} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: 'easeOut' }}>
                <View />
              </motion.div>
            </main>
          </div>
        </div>
        <Footer />
      </div>

      <ProgressOverlay />
      <LoginModal />
      <Toaster
        position="bottom-right"
        theme={cfg.settings.theme}
        offset={44}
        toastOptions={{
          classNames: {
            toast: '!rounded-md !border !border-border !bg-popover !text-foreground !shadow-lg !font-sans',
            description: '!text-muted-foreground'
          }
        }}
      />
    </TooltipProvider>
  )
}
