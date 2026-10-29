import { app } from 'electron'
import AdmZip from 'adm-zip'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { InstallProgress } from '../shared/types'
import { log } from './logger'

const exe = process.platform === 'win32' ? 'javaw.exe' : 'java'

function findBin(dir: string): string | null {
  if (!fs.existsSync(dir)) return null
  const direct = path.join(dir, 'bin', exe)
  if (fs.existsSync(direct)) return direct
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory()) {
      const p = path.join(dir, d.name, 'bin', exe)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

// Майнкрафт 1.17 просит Java 16 — берём ближайшую LTS (17).
function normalize(major: number) {
  if (major <= 8) return 8
  if (major <= 17) return 17
  if (major <= 21) return 21
  return major
}

export async function ensureJava(
  majorRaw: number,
  emit: (p: InstallProgress) => void,
  versionId: string
): Promise<string> {
  if (process.platform !== 'win32') {
    throw new Error('Автоскачивание Java поддерживается только в Windows. Укажите путь к Java в настройках.')
  }
  const major = normalize(majorRaw)
  const target = path.join(app.getPath('userData'), 'runtime', `java-${major}`)
  const existing = findBin(target)
  if (existing) return existing

  const url = `https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/x64/jre/hotspot/normal/eclipse`
  log('info', `Скачиваю Java ${major} (Eclipse Temurin)…`)
  fs.mkdirSync(target, { recursive: true })
  const zipPath = path.join(target, 'jre.zip')

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`Не удалось скачать Java ${major}: HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length') || 0)
  let got = 0
  let last = 0
  const body = Readable.fromWeb(res.body as any)
  body.on('data', (c: Buffer) => {
    got += c.length
    const now = Date.now()
    if (now - last > 150) {
      last = now
      emit({
        versionId,
        phase: 'java',
        percent: total ? Math.round((got / total) * 100) : -1,
        message: `Java ${major}`
      })
    }
  })
  await pipeline(body, fs.createWriteStream(zipPath))

  log('info', 'Распаковываю Java…')
  new AdmZip(zipPath).extractAllTo(target, true)
  fs.rmSync(zipPath, { force: true })

  const bin = findBin(target)
  if (!bin) throw new Error('Java распакована, но javaw.exe не найден')
  log('info', `Java готова: ${bin}`)
  return bin
}
