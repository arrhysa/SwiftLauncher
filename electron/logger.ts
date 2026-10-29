import { app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { LogLine } from '../shared/types'

const MAX = 3000
const buffer: LogLine[] = []
let stream: fs.WriteStream | null = null

export const logsDir = () => path.join(app.getPath('userData'), 'logs')

function ensureStream() {
  if (stream) return stream
  fs.mkdirSync(logsDir(), { recursive: true })
  stream = fs.createWriteStream(path.join(logsDir(), 'latest.log'), { flags: 'w' })
  return stream
}

export function log(level: LogLine['level'], text: string) {
  for (const part of String(text).split(/\r?\n/)) {
    if (!part.trim()) continue
    const line: LogLine = { ts: Date.now(), level, text: part }
    buffer.push(line)
    if (buffer.length > MAX) buffer.shift()
    try {
      ensureStream().write(`[${new Date(line.ts).toISOString()}] [${level}] ${part}\n`)
    } catch {
      /* ignore */
    }
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) w.webContents.send('log:line', line)
    }
  }
}

export const getLogs = () => buffer.slice()
export const clearLogs = () => {
  buffer.length = 0
}
