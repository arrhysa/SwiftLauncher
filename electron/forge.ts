import { installForge } from '@xmcl/installer'
import { installedVersions } from './versions'
import { log } from './logger'

const PROMOS = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'

function findInstalled(root: string, mc: string, ver?: string): string | undefined {
  return installedVersions(root)
    .filter((id) => /forge/i.test(id) && id.includes(mc) && (!ver || id.includes(ver)))
    .sort()
    .reverse()[0]
}

// Возвращает id версии Forge, устанавливая её при необходимости.
// Ванильная версия mc уже должна быть установлена. javaPath нужен современным Forge (1.13+) для постобработки.
export async function ensureForge(mc: string, loaderVersion: string, root: string, javaPath: string): Promise<string> {
  let ver = loaderVersion
  if (!ver) {
    try {
      const res = await fetch(PROMOS, { signal: AbortSignal.timeout(12000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const promos = ((await res.json()) as { promos: Record<string, string> }).promos
      ver = promos[`${mc}-recommended`] || promos[`${mc}-latest`] || ''
      if (!ver) throw new Error(`NO_FORGE:${mc}`)
    } catch (e: any) {
      if (String(e?.message).startsWith('NO_FORGE')) throw new Error(`Для Minecraft ${mc} нет сборок Forge`)
      const local = findInstalled(root, mc)
      if (local) {
        log('warn', `Нет связи с Forge, использую установленный ${local}`)
        return local
      }
      throw new Error('Не удалось получить список Forge. Проверьте подключение к интернету.')
    }
  }

  const existing = findInstalled(root, mc, ver)
  if (existing) return existing

  log('info', `Устанавливаю Forge ${ver} для ${mc} (это может занять несколько минут)…`)
  return await installForge({ mcversion: mc, version: ver }, root, { java: javaPath } as any)
}
