import { contextBridge, ipcRenderer } from 'electron'
import type { SwiftApi } from '../shared/types'

const inv = (ch: string, ...a: unknown[]) => ipcRenderer.invoke(ch, ...a)

const api: SwiftApi = {
  info: () => inv('info'),
  checkUpdate: () => inv('update:check'),
  installUpdate: () => inv('update:install'),
  getUpdateState: () => inv('update:state'),
  setTheme: (t) => inv('ui:theme', t),
  getConfig: () => inv('config:get'),
  saveConfig: (c) => inv('config:save', c),
  listVersions: () => inv('versions:list'),
  installedVersions: (d) => inv('versions:installed', d),
  install: (id, d) => inv('game:install', id, d),
  play: (id) => inv('game:play', id),
  stop: () => inv('game:stop'),
  gameState: () => inv('game:state'),
  msLogin: () => inv('auth:ms'),
  msCancel: () => inv('auth:cancel'),
  offlineLogin: (n) => inv('auth:offline', n),
  logout: () => inv('auth:logout'),
  searchMods: (p, q, o) => inv('mods:search', p, q, o),
  installMod: (p, id) => inv('mods:install', p, id),
  updateMods: (p) => inv('mods:update', p),
  listMods: (p) => inv('mods:list', p),
  removeMod: (p, f) => inv('mods:remove', p, f),
  pickFolder: () => inv('dialog:folder'),
  pickFile: () => inv('dialog:file'),
  openPath: (p) => inv('shell:path', p),
  openExternal: (u) => inv('shell:external', u),
  getLogs: () => inv('logs:get'),
  clearLogs: () => inv('logs:clear'),
  openLogsFolder: () => inv('logs:open'),
  on: ((channel: string, cb: (v: unknown) => void) => {
    const h = (_: unknown, v: unknown) => cb(v)
    ipcRenderer.on(channel, h)
    return () => ipcRenderer.removeListener(channel, h)
  }) as SwiftApi['on']
}

contextBridge.exposeInMainWorld('api', api)
