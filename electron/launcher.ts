import { BrowserWindow } from 'electron'
import { Client } from 'minecraft-launcher-core'
import { Version } from '@xmcl/core'
import path from 'node:path'
import fs from 'node:fs'
import type { GameState, InstallProgress, Profile, Result } from '../shared/types'
import { getConfig } from './store'
import { fetchManifest, findVersion, isInstalled } from './versions'
import { installMinecraft } from './installer'
import { ensureJava } from './java'
import { ensureFabric } from './fabric'
import { ensureForge } from './forge'
import { offlineAuth, refreshMicrosoft, type McAuth } from './auth'
import { log } from './logger'

let state: GameState = 'idle'
let child: { kill: () => boolean } | null = null

export const getState = () => state

function broadcast(channel: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}
function setState(s: GameState) {
  state = s
  broadcast('game:state', s)
}
const emitProgress = (p: InstallProgress) => broadcast('install:progress', p)

export const resolveDir = (dir: string) => dir.trim() || getConfig().settings.defaultGameDir

// Разбор строки JVM-аргументов с учётом кавычек
function splitArgs(s: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) out.push(m[1] ?? m[2])
  return out
}

export async function installOnly(versionId: string, gameDir: string): Promise<Result> {
  if (state !== 'idle') return { ok: false, error: 'busy' }
  setState('installing')
  try {
    const meta = await findVersion(versionId)
    if (!meta) throw new Error(`Версия ${versionId} не найдена в манифесте`)
    await installMinecraft(meta, resolveDir(gameDir), emitProgress)
    return { ok: true }
  } catch (e: any) {
    log('error', e?.message || String(e))
    emitProgress({ versionId, phase: 'error', percent: 0, message: e?.message || 'error' })
    return { ok: false, error: e?.message || String(e) }
  } finally {
    setState('idle')
  }
}

export async function play(profileId: string): Promise<Result> {
  if (state !== 'idle') return { ok: false, error: 'busy' }
  const cfg = getConfig()
  const profile: Profile | undefined = cfg.profiles.find((p) => p.id === profileId)
  if (!profile) return { ok: false, error: 'Профиль не найден' }
  if (!profile.versionId) return { ok: false, error: 'В профиле не выбрана версия' }
  if (!cfg.account) return { ok: false, error: 'Сначала войдите в аккаунт или задайте ник' }

  const root = resolveDir(profile.gameDir)
  const versionId = profile.versionId
  setState('installing')
  try {
    fs.mkdirSync(root, { recursive: true })

    // 1. Установка (если нужно)
    let meta = await findVersion(versionId)
    const local = isInstalled(root, versionId)
    if (!local) {
      if (!meta) throw new Error(`Версия ${versionId} не найдена`)
      await installMinecraft(meta, root, emitProgress)
    }

    // 2. Java (сначала по ванильной версии: она нужна и установщику Forge)
    const pickJava = async (major: number) => {
      const userPath = cfg.settings.javaPath.trim()
      if (userPath) return userPath
      if (cfg.settings.autoJava) return ensureJava(major, emitProgress, versionId)
      return process.platform === 'win32' ? 'javaw' : 'java'
    }
    const majorOf = async (id: string) => ((await Version.parse(root, id)) as any).javaVersion?.majorVersion ?? 17
    let major: number = await majorOf(versionId)
    let javaPath = await pickJava(major)

    // 2.5. Загрузчик модов
    let custom: string | undefined
    const loaderVersion = (profile.loaderVersion || '').trim()
    if (profile.loader === 'fabric') {
      emitProgress({ versionId, phase: 'client', percent: -1, message: 'fabric' })
      custom = await ensureFabric(versionId, loaderVersion, root)
    } else if (profile.loader === 'forge') {
      emitProgress({ versionId, phase: 'client', percent: -1, message: 'forge' })
      custom = await ensureForge(versionId, loaderVersion, root, javaPath)
    }
    if (custom) {
      const m2 = await majorOf(custom)
      if (m2 !== major) {
        major = m2
        javaPath = await pickJava(major)
      }
    }
    log('info', `Java: ${javaPath} (нужна версия ${major})`)

    // 3. Аккаунт
    setState('launching')
    let auth: McAuth
    if (cfg.account.type === 'microsoft') {
      log('info', 'Обновляю сессию Microsoft…')
      auth = await refreshMicrosoft(cfg.settings.azureClientId)
    } else {
      auth = offlineAuth(cfg.account.name)
    }

    // 4. Запуск
    if (!meta) meta = (await fetchManifest().catch(() => null))?.versions.find((v) => v.id === versionId)
    const launcher = new Client()
    launcher.on('debug', (m: string) => log('info', String(m)))
    launcher.on('data', (m: string) => log('game', String(m)))
    launcher.on('progress', (e: any) => {
      if (e?.total) {
        emitProgress({
          versionId,
          phase: e.type === 'assets' ? 'assets' : 'libraries',
          percent: Math.round((e.task / e.total) * 100),
          message: String(e.type)
        })
      }
    })
    const mainWin = () => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
    launcher.on('close', (code: number) => {
      if (cfg.settings.hideOnLaunch) {
        const w = mainWin()
        if (w) {
          if (w.isMinimized()) w.restore()
          w.focus()
        }
      }
      log(code === 0 ? 'info' : 'warn', `Игра закрыта (код ${code})`)
      child = null
      setState('idle')
    })

    const ram = Math.max(512, profile.ram)
    const proc = await launcher.launch({
      authorization: auth as any,
      root,
      version: { number: versionId, type: meta?.type ?? 'release', ...(custom ? { custom } : {}) },
      memory: { max: `${ram}M`, min: `${Math.min(512, ram)}M` },
      javaPath,
      customArgs: splitArgs(profile.jvmArgs),
      overrides: { detached: false }
    } as any)

    if (!proc) throw new Error('Не удалось запустить процесс игры. Подробности — в логах.')
    child = proc as any
    setState('running')
    if (cfg.settings.hideOnLaunch) mainWin()?.minimize()
    log('info', `Minecraft ${versionId} запущен`)
    return { ok: true }
  } catch (e: any) {
    log('error', e?.message || String(e))
    setState('idle')
    return { ok: false, error: e?.message || String(e) }
  }
}

export function stop() {
  try {
    child?.kill()
  } catch (e: any) {
    log('warn', 'Не удалось остановить игру: ' + e?.message)
  }
}

export const gameLogPath = (root: string) => path.join(root, 'logs', 'latest.log')
