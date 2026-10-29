import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AppConfig, AppInfo, DeviceCodeInfo, GameState, InstallProgress, LogLine, Manifest, Profile, UpdateState
} from '../../shared/types'
import { toast } from 'sonner'
import { translate, type Key } from './i18n'

declare global {
  interface Window { api: import('../../shared/types').SwiftApi }
}

export type Page = 'play' | 'versions' | 'profiles' | 'mods' | 'settings' | 'logs'

interface Ctx {
  ready: boolean
  info: AppInfo | null
  cfg: AppConfig
  update: (fn: (c: AppConfig) => AppConfig) => void
  profile: Profile
  gameDir: string
  t: (k: Key) => string
  page: Page
  setPage: (p: Page) => void
  manifest: Manifest | null
  manifestError: boolean
  loadingVersions: boolean
  reloadVersions: () => void
  installed: string[]
  gameState: GameState
  progress: InstallProgress | null
  logs: LogLine[]
  clearLogs: () => void
  deviceCode: DeviceCodeInfo | null
  loginOpen: boolean
  setLoginOpen: (v: boolean) => void
  online: boolean
  update_: UpdateState
  notify: (text: string, kind?: 'error' | 'info') => void
  play: () => Promise<void>
  stop: () => void
  installVersion: (id: string) => Promise<void>
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

const EMPTY: AppConfig = {
  settings: {
    theme: 'dark', lang: 'ru', javaPath: '', autoJava: true, defaultGameDir: '',
    azureClientId: '', selectedProfileId: 'default', hideOnLaunch: false
  },
  profiles: [{ id: 'default', name: 'Swift', versionId: '', ram: 4096, gameDir: '', jvmArgs: '' }],
  account: null
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [cfg, setCfg] = useState<AppConfig>(EMPTY)
  const [page, setPage] = useState<Page>('play')
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [manifestError, setManifestError] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [installed, setInstalled] = useState<string[]>([])
  const [gameState, setGameState] = useState<GameState>('idle')
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [deviceCode, setDeviceCode] = useState<DeviceCodeInfo | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' })
  const progTimer = useRef<number>()

  const lang = cfg.settings.lang
  const t = useCallback((k: Key) => translate(lang, k), [lang])

  const profile = useMemo(
    () => cfg.profiles.find((p) => p.id === cfg.settings.selectedProfileId) ?? cfg.profiles[0],
    [cfg]
  )
  const gameDir = profile.gameDir.trim() || cfg.settings.defaultGameDir

  const notify = useCallback((text: string, kind: 'error' | 'info' = 'info') => {
    if (!text) return
    if (kind === 'error') toast.error(text, { duration: 9000 })
    else toast(text, { duration: 3000 })
  }, [])

  // Любое изменение конфига сразу уходит в main-процесс
  const update = useCallback((fn: (c: AppConfig) => AppConfig) => {
    setCfg((prev) => {
      const next = fn(prev)
      window.api.saveConfig(next)
      return next
    })
  }, [])

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true)
    setManifestError(false)
    try {
      setManifest(await window.api.listVersions())
    } catch {
      setManifestError(true)
    } finally {
      setLoadingVersions(false)
    }
  }, [])

  const refreshInstalled = useCallback(async (dir: string) => {
    if (dir) setInstalled(await window.api.installedVersions(dir))
  }, [])

  // Первичная загрузка
  useEffect(() => {
    ;(async () => {
      const [i, c, s, l] = await Promise.all([
        window.api.info(), window.api.getConfig(), window.api.gameState(), window.api.getLogs()
      ])
      setInfo(i)
      setCfg(c)
      setGameState(s)
      setLogs(l)
      setUpdateState(await window.api.getUpdateState())
      setReady(true)
      loadVersions()
    })()
    const offs = [
      window.api.on('game:state', setGameState),
      window.api.on('auth:device-code', setDeviceCode),
      window.api.on('update:state', setUpdateState),
      window.api.on('log:line', (l) => setLogs((p) => (p.length > 2500 ? [...p.slice(-2000), l] : [...p, l]))),
      window.api.on('install:progress', (p) => {
        window.clearTimeout(progTimer.current)
        setProgress(p)
        if (p.phase === 'done' || p.phase === 'error') {
          progTimer.current = window.setTimeout(() => setProgress(null), 1800)
        }
      })
    ]
    return () => offs.forEach((o) => o())
  }, [loadVersions])

  // Тема
  useEffect(() => {
    document.documentElement.classList.toggle('light', cfg.settings.theme === 'light')
    document.documentElement.lang = cfg.settings.lang
    window.api.setTheme(cfg.settings.theme)
  }, [cfg.settings.theme, cfg.settings.lang])

  // Если в профиле нет версии — подставить последний релиз
  useEffect(() => {
    if (!ready || !manifest) return
    const empties = cfg.profiles.filter((p) => !p.versionId)
    if (empties.length) {
      const latest = manifest.latest.release
      update((c) => ({ ...c, profiles: c.profiles.map((p) => (p.versionId ? p : { ...p, versionId: latest })) }))
    }
  }, [ready, manifest, cfg.profiles, update])

  useEffect(() => {
    if (ready) refreshInstalled(gameDir)
  }, [ready, gameDir, gameState, refreshInstalled])

  const play = useCallback(async () => {
    if (!cfg.account) {
      setLoginOpen(true)
      return
    }
    const r = await window.api.play(profile.id)
    if (!r.ok && r.error && r.error !== 'busy') {
      notify(r.error, 'error')
      setPage((p) => p)
    }
  }, [profile.id, cfg.account, notify])

  const stop = useCallback(() => { window.api.stop() }, [])

  const installVersion = useCallback(
    async (id: string) => {
      const r = await window.api.install(id, profile.gameDir)
      if (!r.ok && r.error && r.error !== 'busy') notify(r.error, 'error')
    },
    [profile.gameDir, notify]
  )

  const value: Ctx = {
    ready, info, cfg, update, profile, gameDir, t, page, setPage, manifest, manifestError,
    loadingVersions, reloadVersions: loadVersions, installed, gameState, progress, logs,
    clearLogs: () => { window.api.clearLogs(); setLogs([]) },
    deviceCode, loginOpen, setLoginOpen, online: !!manifest && !manifest.offline, update_: updateState, notify, play, stop, installVersion
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
