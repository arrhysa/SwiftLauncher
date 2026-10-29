import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Manifest } from '../shared/types'

const URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'
const cacheFile = () => path.join(app.getPath('userData'), 'version_manifest.json')

let memory: Manifest | null = null

export async function fetchManifest(): Promise<Manifest> {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const json = (await res.json()) as Manifest
    memory = json
    fs.writeFileSync(cacheFile(), JSON.stringify(json))
    return json
  } catch (e) {
    if (memory) return { ...memory, offline: true }
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as Manifest
      memory = cached
      return { ...cached, offline: true }
    } catch {
      throw e
    }
  }
}

export async function findVersion(id: string) {
  const m = memory ?? (await fetchManifest())
  return m.versions.find((v) => v.id === id)
}

export function installedVersions(root: string): string[] {
  try {
    const dir = path.join(root, 'versions')
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, `${d.name}.json`)))
      .map((d) => d.name)
  } catch {
    return []
  }
}

export function isInstalled(root: string, id: string) {
  const dir = path.join(root, 'versions', id)
  return fs.existsSync(path.join(dir, `${id}.json`)) && fs.existsSync(path.join(dir, `${id}.jar`))
}
