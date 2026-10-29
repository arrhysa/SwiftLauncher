export type VersionType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha'

export interface McVersion {
  id: string
  type: VersionType
  url: string
  releaseTime: string
}

export interface Manifest {
  latest: { release: string; snapshot: string }
  versions: McVersion[]
  offline?: boolean
}

export interface Profile {
  id: string
  name: string
  versionId: string
  ram: number // МБ
  gameDir: string // пусто = папка по умолчанию
  jvmArgs: string
  loader?: 'vanilla' | 'fabric' | 'forge'
  loaderVersion?: string // пусто = рекомендуемая/последняя стабильная
}

export interface Account {
  type: 'offline' | 'microsoft'
  name: string
  uuid: string
}

export interface Settings {
  theme: 'dark' | 'light'
  lang: 'ru' | 'en'
  javaPath: string
  autoJava: boolean
  defaultGameDir: string
  azureClientId: string
  selectedProfileId: string
  hideOnLaunch: boolean
}

export interface AppConfig {
  settings: Settings
  profiles: Profile[]
  account: Account | null
}

export type GameState = 'idle' | 'installing' | 'launching' | 'running'

export interface InstallProgress {
  versionId: string
  phase: 'java' | 'client' | 'libraries' | 'assets' | 'done' | 'error'
  percent: number // 0..100, -1 = неизвестно
  message: string
}

export interface LogLine {
  ts: number
  level: 'info' | 'warn' | 'error' | 'game'
  text: string
}

export interface DeviceCodeInfo {
  userCode: string
  verificationUri: string
}

export interface AppInfo {
  version: string
  totalMemMB: number
  dataDir: string
  defaultGameDir: string
  platform: string
}

export interface Result<T = undefined> {
  ok: boolean
  error?: string
  data?: T
}

export interface ModHit {
  id: string
  title: string
  description: string
  icon: string
  downloads: number
  author: string
}

export interface InstalledMod {
  file: string
  title: string
  projectId?: string
  size: number
}

export interface UpdateState {
  status: 'idle' | 'checking' | 'downloading' | 'ready' | 'none' | 'manual' | 'error'
  version?: string
  percent?: number
  url?: string
  error?: string
}

export interface SwiftApi {
  info(): Promise<AppInfo>
  checkUpdate(): Promise<void>
  installUpdate(): Promise<void>
  getUpdateState(): Promise<UpdateState>
  setTheme(theme: 'dark' | 'light'): Promise<void>
  getConfig(): Promise<AppConfig>
  saveConfig(c: AppConfig): Promise<void>
  listVersions(): Promise<Manifest>
  installedVersions(gameDir: string): Promise<string[]>
  install(versionId: string, gameDir: string): Promise<Result>
  play(profileId: string): Promise<Result>
  stop(): Promise<void>
  gameState(): Promise<GameState>
  msLogin(): Promise<Result<Account>>
  msCancel(): Promise<void>
  offlineLogin(name: string): Promise<Account>
  logout(): Promise<void>
  searchMods(profileId: string, query: string, offset: number): Promise<Result<{ hits: ModHit[]; total: number }>>
  installMod(profileId: string, projectId: string): Promise<Result<string[]>>
  updateMods(profileId: string): Promise<Result<string[]>>
  listMods(profileId: string): Promise<InstalledMod[]>
  removeMod(profileId: string, file: string): Promise<void>
  pickFolder(): Promise<string | null>
  pickFile(): Promise<string | null>
  openPath(p: string): Promise<void>
  openExternal(url: string): Promise<void>
  getLogs(): Promise<LogLine[]>
  clearLogs(): Promise<void>
  openLogsFolder(): Promise<void>
  on(channel: 'install:progress', cb: (p: InstallProgress) => void): () => void
  on(channel: 'update:state', cb: (s: UpdateState) => void): () => void
  on(channel: 'game:state', cb: (s: GameState) => void): () => void
  on(channel: 'log:line', cb: (l: LogLine) => void): () => void
  on(channel: 'auth:device-code', cb: (d: DeviceCodeInfo | null) => void): () => void
}
