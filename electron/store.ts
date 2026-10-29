import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AppConfig, Profile } from '../shared/types'

const cfgFile = () => path.join(app.getPath('userData'), 'config.json')
const secretFile = () => path.join(app.getPath('userData'), 'msa.bin')

export const defaultGameDir = () => path.join(app.getPath('appData'), '.minecraft')

export function defaultConfig(): AppConfig {
  const ram = Math.max(2048, Math.min(4096, Math.floor((os.totalmem() / 1048576) / 2 / 256) * 256))
  const profile: Profile = { id: 'default', name: 'Swift', versionId: '', ram, gameDir: '', jvmArgs: '' }
  return {
    settings: {
      theme: 'dark',
      lang: app.getLocale().toLowerCase().startsWith('ru') ? 'ru' : 'en',
      javaPath: '',
      autoJava: true,
      defaultGameDir: defaultGameDir(),
      azureClientId: '',
      hideOnLaunch: false,
      selectedProfileId: profile.id
    },
    profiles: [profile],
    account: null
  }
}

let cache: AppConfig | null = null

export function getConfig(): AppConfig {
  if (cache) return cache
  const def = defaultConfig()
  try {
    const raw = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) as Partial<AppConfig>
    cache = {
      settings: { ...def.settings, ...(raw.settings || {}) },
      profiles: raw.profiles && raw.profiles.length ? raw.profiles : def.profiles,
      account: raw.account ?? null
    }
  } catch {
    cache = def
  }
  return cache
}

export function setConfig(c: AppConfig) {
  cache = c
  fs.mkdirSync(path.dirname(cfgFile()), { recursive: true })
  fs.writeFileSync(cfgFile(), JSON.stringify(c, null, 2))
}

export function patchAccount(account: AppConfig['account']) {
  setConfig({ ...getConfig(), account })
}

// Refresh-токен Microsoft хранится зашифрованным (DPAPI на Windows).
export function saveRefreshToken(token: string | null) {
  try {
    if (!token) return fs.rmSync(secretFile(), { force: true })
    const data = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(token)
      : Buffer.from(token, 'utf8')
    fs.writeFileSync(secretFile(), data)
  } catch {
    /* ignore */
  }
}

export function loadRefreshToken(): string | null {
  try {
    const data = fs.readFileSync(secretFile())
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(data) : data.toString('utf8')
  } catch {
    return null
  }
}
