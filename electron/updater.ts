import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '../shared/types'
import { log } from './logger'

const REPO = 'arrhysa/SwiftLauncher'
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`

// Portable-версия не умеет обновляться сама: только сообщаем о новой версии
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE
let state: UpdateState = { status: 'idle' }

function set(next: UpdateState) {
  state = next
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('update:state', state)
  }
}
export const getUpdateState = () => state

const parse = (v: string) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
function isNewer(remote: string, local: string) {
  const a = parse(remote), b = parse(local)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return false
}

async function checkManual() {
  set({ status: 'checking' })
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'SwiftLauncher', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(12000)
    })
    if (res.status === 404) return set({ status: 'none' }) // релизов ещё нет
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const j = (await res.json()) as { tag_name: string; html_url: string }
    if (isNewer(j.tag_name, app.getVersion())) set({ status: 'manual', version: j.tag_name.replace(/^v/, ''), url: j.html_url || RELEASES_URL })
    else set({ status: 'none' })
  } catch (e: any) {
    set({ status: 'error', error: e?.message || String(e) })
  }
}

export async function checkForUpdates() {
  if (!app.isPackaged) return set({ status: 'none' }) // в режиме разработки обновлений нет
  if (isPortable) return checkManual()
  try {
    set({ status: 'checking' })
    await autoUpdater.checkForUpdates()
  } catch (e: any) {
    set({ status: 'error', error: e?.message || String(e) })
  }
}

export function installUpdate() {
  if (state.status === 'ready') autoUpdater.quitAndInstall(false, true)
}

export function initUpdater() {
  if (!app.isPackaged || isPortable) {
    setTimeout(() => checkForUpdates(), 6000)
    return
  }
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  autoUpdater.on('checking-for-update', () => set({ status: 'checking' }))
  autoUpdater.on('update-available', (i) => {
    log('info', `Найдено обновление ${i.version}, скачиваю…`)
    set({ status: 'downloading', version: i.version, percent: 0 })
  })
  autoUpdater.on('update-not-available', () => set({ status: 'none' }))
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', version: state.version, percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (i) => {
    log('info', `Обновление ${i.version} скачано`)
    set({ status: 'ready', version: i.version })
  })
  autoUpdater.on('error', (e) => {
    log('warn', 'Обновление: ' + (e?.message || e))
    set({ status: 'error', error: e?.message || String(e) })
  })
  setTimeout(() => checkForUpdates(), 6000)
  setInterval(() => { if (state.status !== 'downloading' && state.status !== 'ready') checkForUpdates() }, 4 * 3600 * 1000)
}
