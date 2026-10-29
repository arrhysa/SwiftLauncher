import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { InstalledMod, ModHit } from '../shared/types'
import { log } from './logger'

const API = 'https://api.modrinth.com/v2'
const UA = 'SwiftLauncher/1.0.0'
const MANIFEST = '.swiftlauncher-mods.json'

type Manifest = Record<string, { title: string; file: string }>

async function api<T>(p: string): Promise<T> {
  let r: Response
  try {
    r = await fetch(API + p, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
  } catch {
    throw new Error('Не удалось связаться с Modrinth. Проверьте подключение к интернету.')
  }
  if (!r.ok) throw new Error(`Modrinth: HTTP ${r.status}`)
  return (await r.json()) as T
}

const readManifest = (dir: string): Manifest => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8'))
  } catch {
    return {}
  }
}
const writeManifest = (dir: string, m: Manifest) =>
  fs.writeFileSync(path.join(dir, MANIFEST), JSON.stringify(m, null, 2))

export async function searchMods(query: string, mc: string, loader: string, offset: number) {
  const facets = [['project_type:mod'], [`versions:${mc}`], [`categories:${loader}`]]
  const params = new URLSearchParams({
    query,
    facets: JSON.stringify(facets),
    limit: '20',
    offset: String(offset),
    index: query ? 'relevance' : 'downloads'
  })
  const j = await api<any>('/search?' + params)
  const hits: ModHit[] = j.hits.map((h: any) => ({
    id: h.project_id,
    title: h.title,
    description: h.description,
    icon: h.icon_url || '',
    downloads: h.downloads,
    author: h.author
  }))
  return { hits, total: j.total_hits as number }
}

async function resolveVersion(projectId: string, mc: string, loader: string) {
  const params = new URLSearchParams({
    game_versions: JSON.stringify([mc]),
    loaders: JSON.stringify([loader])
  })
  const versions = await api<any[]>(`/project/${projectId}/version?${params}`)
  return versions.find((v) => v.version_type === 'release') ?? versions[0]
}

interface Ctx {
  mc: string
  loader: string
  dir: string
  done: Set<string>
  installed: string[]
}

async function installProject(projectId: string, ctx: Ctx, depth: number, pinnedVersionId?: string) {
  if (ctx.done.has(projectId) || depth > 6) return
  ctx.done.add(projectId)

  const version = pinnedVersionId
    ? await api<any>(`/version/${pinnedVersionId}`)
    : await resolveVersion(projectId, ctx.mc, ctx.loader)
  if (!version) {
    if (depth === 0) throw new Error(`Для Minecraft ${ctx.mc} (${ctx.loader}) нет подходящей версии этого мода`)
    log('warn', `Зависимость ${projectId}: нет версии для ${ctx.mc}, пропускаю`)
    return
  }

  // Сначала обязательные зависимости
  for (const d of version.dependencies ?? []) {
    if (d.dependency_type === 'required' && d.project_id) {
      await installProject(d.project_id, ctx, depth + 1, d.version_id || undefined)
    }
  }

  const file = version.files.find((f: any) => f.primary) ?? version.files[0]
  if (!file || !/^https:\/\/(cdn|cdn-raw)\.modrinth\.com\//.test(file.url)) {
    throw new Error('Некорректная ссылка на файл мода')
  }
  const name = path.basename(file.filename)
  if (!name.toLowerCase().endsWith('.jar')) throw new Error(`Неожиданный тип файла: ${name}`)

  fs.mkdirSync(ctx.dir, { recursive: true })
  const manifest = readManifest(ctx.dir)
  const prev = manifest[projectId]
  const target = path.join(ctx.dir, name)

  if (!(prev?.file === name && fs.existsSync(target))) {
    log('info', `Скачиваю мод ${name}…`)
    const res = await fetch(file.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) })
    if (!res.ok) throw new Error(`Не удалось скачать ${name}: HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const sha1 = file.hashes?.sha1
    if (sha1 && crypto.createHash('sha1').update(buf).digest('hex') !== sha1) {
      throw new Error(`Файл ${name} повреждён (контрольная сумма не совпала)`)
    }
    fs.writeFileSync(target, buf)
    // обновление: удалить старую версию того же мода
    if (prev && prev.file !== name) fs.rmSync(path.join(ctx.dir, path.basename(prev.file)), { force: true })
  }

  let title = prev?.title
  if (!title) {
    try {
      title = (await api<any>(`/project/${projectId}`)).title
    } catch {
      title = name
    }
  }
  manifest[projectId] = { title: title!, file: name }
  writeManifest(ctx.dir, manifest)
  ctx.installed.push(title!)
}

export async function installMod(projectId: string, mc: string, loader: string, dir: string): Promise<string[]> {
  const ctx: Ctx = { mc, loader, dir, done: new Set(), installed: [] }
  await installProject(projectId, ctx, 0)
  return ctx.installed
}

export async function updateMods(mc: string, loader: string, dir: string): Promise<string[]> {
  const before = readManifest(dir)
  const ctx: Ctx = { mc, loader, dir, done: new Set(), installed: [] }
  for (const id of Object.keys(before)) {
    try {
      await installProject(id, ctx, 0)
    } catch (e: any) {
      log('warn', `Не удалось обновить ${before[id].title}: ${e?.message || e}`)
    }
  }
  const after = readManifest(dir)
  return Object.entries(after)
    .filter(([id, m]) => before[id]?.file !== m.file)
    .map(([, m]) => m.title)
}

export function listMods(dir: string): InstalledMod[] {
  let files: string[] = []
  try {
    files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.jar'))
  } catch {
    return []
  }
  const manifest = readManifest(dir)
  const byFile = new Map(Object.entries(manifest).map(([id, m]) => [m.file, { id, title: m.title }]))
  return files
    .map((file) => ({
      file,
      title: byFile.get(file)?.title ?? file.replace(/\.jar$/i, ''),
      projectId: byFile.get(file)?.id,
      size: fs.statSync(path.join(dir, file)).size
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function removeMod(dir: string, file: string) {
  const name = path.basename(file)
  fs.rmSync(path.join(dir, name), { force: true })
  const manifest = readManifest(dir)
  for (const [id, m] of Object.entries(manifest)) if (m.file === name) delete manifest[id]
  if (fs.existsSync(dir)) writeManifest(dir, manifest)
}
