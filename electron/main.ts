import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AppConfig } from '../shared/types'
import { clearLogs, getLogs, log, logsDir } from './logger'
import { defaultGameDir, getConfig, patchAccount, setConfig } from './store'
import { fetchManifest, installedVersions } from './versions'
import { getState, installOnly, play, resolveDir, stop } from './launcher'
import { checkForUpdates, getUpdateState, initUpdater, installUpdate } from './updater'
import { installMod, listMods, removeMod, searchMods, updateMods } from './modrinth'
import { cancelLogin, logoutMicrosoft, microsoftLogin, offlineUuid } from './auth'

const isDev = !!process.env.VITE_DEV_SERVER_URL
let win: BrowserWindow | null = null

if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

function createWindow() {
  win = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0B0F14',
    title: 'SwiftLauncher',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#94A3B8', height: 64 },
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.setMenuBarVisibility(false)
  win.once('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) e.preventDefault()
  })
  if (isDev) win.loadURL(process.env.VITE_DEV_SERVER_URL!)
  else win.loadFile(path.join(__dirname, '../dist/index.html'))
}

function registerIpc() {
  ipcMain.handle('info', () => ({
    version: app.getVersion(),
    totalMemMB: Math.floor(os.totalmem() / 1048576),
    dataDir: app.getPath('userData'),
    defaultGameDir: defaultGameDir(),
    platform: process.platform
  }))
  ipcMain.handle('ui:theme', (_e, theme: 'dark' | 'light') => {
    try {
      win?.setTitleBarOverlay({ color: '#00000000', symbolColor: theme === 'light' ? '#475569' : '#94A3B8', height: 64 })
    } catch {
      /* не поддерживается на этой платформе */
    }
  })
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:install', () => installUpdate())
  ipcMain.handle('update:state', () => getUpdateState())
  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:save', (_e, c: AppConfig) => setConfig(c))

  ipcMain.handle('versions:list', () => fetchManifest())
  ipcMain.handle('versions:installed', (_e, dir: string) => installedVersions(resolveDir(dir || '')))
  ipcMain.handle('game:install', (_e, id: string, dir: string) => installOnly(id, dir))
  ipcMain.handle('game:play', (_e, profileId: string) => play(profileId))
  ipcMain.handle('game:stop', () => stop())
  ipcMain.handle('game:state', () => getState())

  ipcMain.handle('auth:ms', async () => {
    try {
      const { account } = await microsoftLogin(getConfig().settings.azureClientId)
      patchAccount(account)
      return { ok: true, data: account }
    } catch (e: any) {
      log('error', 'Вход Microsoft: ' + (e?.message || e))
      return { ok: false, error: e?.message || String(e) }
    }
  })
  ipcMain.handle('auth:cancel', () => cancelLogin())
  ipcMain.handle('auth:offline', (_e, name: string) => {
    const account = { type: 'offline' as const, name, uuid: offlineUuid(name) }
    logoutMicrosoft()
    patchAccount(account)
    return account
  })
  ipcMain.handle('auth:logout', () => {
    logoutMicrosoft()
    patchAccount(null)
  })

  ipcMain.handle('dialog:folder', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('dialog:file', async () => {
    const r = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Java', extensions: ['exe', '*'] }]
    })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('shell:path', (_e, p: string) => {
    try {
      fs.mkdirSync(p, { recursive: true })
    } catch {
      /* ignore */
    }
    return shell.openPath(p)
  })
  ipcMain.handle('shell:external', (_e, url: string) => {
    if (/^https:\/\//.test(url)) return shell.openExternal(url)
  })

  // --- Моды (Modrinth) ---
  const modCtx = (profileId: string) => {
    const cfg = getConfig()
    const p = cfg.profiles.find((x) => x.id === profileId)
    if (!p) throw new Error('Профиль не найден')
    const loader = p.loader
    if (loader !== 'fabric' && loader !== 'forge') throw new Error('Выберите Fabric или Forge в профиле')
    return { mc: p.versionId, loader, dir: path.join(resolveDir(p.gameDir), 'mods') }
  }
  ipcMain.handle('mods:search', async (_e, profileId: string, q: string, offset: number) => {
    try {
      const { mc, loader } = modCtx(profileId)
      return { ok: true, data: await searchMods(q, mc, loader, offset) }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) }
    }
  })
  ipcMain.handle('mods:install', async (_e, profileId: string, projectId: string) => {
    try {
      const { mc, loader, dir } = modCtx(profileId)
      return { ok: true, data: await installMod(projectId, mc, loader, dir) }
    } catch (e: any) {
      log('error', 'Установка мода: ' + (e?.message || e))
      return { ok: false, error: e?.message || String(e) }
    }
  })
  ipcMain.handle('mods:update', async (_e, profileId: string) => {
    try {
      const { mc, loader, dir } = modCtx(profileId)
      return { ok: true, data: await updateMods(mc, loader, dir) }
    } catch (e: any) {
      log('error', 'Обновление модов: ' + (e?.message || e))
      return { ok: false, error: e?.message || String(e) }
    }
  })
  ipcMain.handle('mods:list', (_e, profileId: string) => {
    const p = getConfig().profiles.find((x) => x.id === profileId)
    return p ? listMods(path.join(resolveDir(p.gameDir), 'mods')) : []
  })
  ipcMain.handle('mods:remove', (_e, profileId: string, file: string) => {
    const p = getConfig().profiles.find((x) => x.id === profileId)
    if (p) removeMod(path.join(resolveDir(p.gameDir), 'mods'), file)
  })

  ipcMain.handle('logs:get', () => getLogs())
  ipcMain.handle('logs:clear', () => clearLogs())
  ipcMain.handle('logs:open', () => shell.openPath(logsDir()))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  initUpdater()
  log('info', `SwiftLauncher ${app.getVersion()} запущен`)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stop()
  if (process.platform !== 'darwin') app.quit()
})
