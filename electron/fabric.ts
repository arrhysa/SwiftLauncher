import { getLoaderArtifactListFor, installFabric } from '@xmcl/installer'
import fs from 'node:fs'
import path from 'node:path'
import { installedVersions } from './versions'
import { log } from './logger'

const hasJson = (root: string, id: string) =>
  fs.existsSync(path.join(root, 'versions', id, `${id}.json`))

// Возвращает id версии Fabric (например fabric-loader-0.16.9-1.21.1), устанавливая её при необходимости.
// Ванильная версия mc должна быть уже установлена.
export async function ensureFabric(mc: string, loaderVersion: string, root: string): Promise<string> {
  let list: Awaited<ReturnType<typeof getLoaderArtifactListFor>> | null = null
  try {
    list = await getLoaderArtifactListFor(mc)
  } catch (e: any) {
    log('warn', `Не удалось получить список Fabric: ${e?.message || e}`)
  }

  if (list) {
    if (list.length === 0) throw new Error(`Fabric не поддерживает Minecraft ${mc}`)
    const art = loaderVersion
      ? list.find((a) => a.loader.version === loaderVersion)
      : list.find((a) => a.loader.stable) ?? list[0]
    if (!art) throw new Error(`Fabric Loader ${loaderVersion} недоступен для Minecraft ${mc}`)
    const id = `fabric-loader-${art.loader.version}-${mc}`
    if (!hasJson(root, id)) {
      log('info', `Устанавливаю Fabric Loader ${art.loader.version} для ${mc}…`)
      return await installFabric(art, root)
    }
    return id
  }

  // Нет сети: берём уже установленный Fabric для этой версии
  const found = installedVersions(root)
    .filter((id) => id.startsWith('fabric-loader-') && id.endsWith('-' + mc))
    .sort()
    .reverse()[0]
  if (found) {
    log('info', `Нет сети, использую установленный ${found}`)
    return found
  }
  throw new Error('Не удалось получить список Fabric. Проверьте подключение к интернету.')
}
