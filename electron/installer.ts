import { installTask } from '@xmcl/installer'
import { MinecraftFolder } from '@xmcl/core'
import type { InstallProgress, McVersion } from '../shared/types'
import { log } from './logger'

type Emit = (p: InstallProgress) => void

function phaseOf(path: string): InstallProgress['phase'] {
  const p = path.toLowerCase()
  if (p.includes('asset')) return 'assets'
  if (p.includes('librar')) return 'libraries'
  return 'client'
}

export async function installMinecraft(meta: McVersion, root: string, emit: Emit) {
  log('info', `Установка ${meta.id} в ${root}`)
  const task = installTask({ id: meta.id, url: meta.url } as any, MinecraftFolder.from(root))
  let phase: InstallProgress['phase'] = 'client'
  let lastEmit = 0

  const push = (force = false) => {
    const now = Date.now()
    if (!force && now - lastEmit < 120) return
    lastEmit = now
    const total = (task as any).total as number
    const progress = (task as any).progress as number
    const percent = total > 0 ? Math.min(99, Math.round((progress / total) * 100)) : -1
    emit({ versionId: meta.id, phase, percent, message: phase })
  }

  await task.startAndWait({
    onStart(t: any) {
      phase = phaseOf(String(t.path || t.name || ''))
      push(true)
    },
    onUpdate() {
      push()
    },
    onFailed(t: any, err: any) {
      log('error', `Ошибка задачи ${t.path || t.name}: ${err?.message || err}`)
    }
  } as any)

  emit({ versionId: meta.id, phase: 'done', percent: 100, message: 'done' })
  log('info', `Версия ${meta.id} установлена`)
}
