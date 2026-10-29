import { Copy, FolderOpen, ScrollText, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { LogLine } from '../../shared/types'

const color: Record<LogLine['level'], string> = {
  info: 'text-foreground/85', warn: 'text-amber-300', error: 'text-red-400', game: 'text-primary'
}

export default function Logs() {
  const { t, logs, clearLogs, notify } = useApp()
  const [level, setLevel] = useState<'all' | LogLine['level']>('all')
  const box = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const shown = level === 'all' ? logs : logs.filter((l) => l.level === level)

  useEffect(() => {
    const el = box.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [shown.length])

  const copy = () => { navigator.clipboard.writeText(shown.map((l) => l.text).join('\n')).then(() => notify(t('copied'))) }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-2">
        <Tabs value={level} onValueChange={(v) => setLevel(v as typeof level)}>
          <TabsList>
            <TabsTrigger value="all">{t('fAll')}</TabsTrigger>
            <TabsTrigger value="info">info</TabsTrigger>
            <TabsTrigger value="warn">warn</TabsTrigger>
            <TabsTrigger value="error">error</TabsTrigger>
            <TabsTrigger value="game">game</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={copy}><Copy />{t('copy')}</Button>
          <Button size="sm" onClick={() => window.api.openLogsFolder()}><FolderOpen /></Button>
          <Button size="sm" onClick={clearLogs}><Trash2 />{t('clear')}</Button>
        </div>
      </div>
      <div className="panel min-h-0 flex-1 overflow-hidden rounded-lg">
        {shown.length === 0 ? (
          <EmptyState className="h-full" icon={ScrollText} title={t('emptyLogsTitle')} hint={t('logsEmpty')} />
        ) : (
          <div ref={box} className="selectable h-full overflow-y-auto p-4 font-mono text-xs leading-relaxed"
            onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}>
            {shown.map((l, i) => (
              <div key={i} className={cn('whitespace-pre-wrap break-all', color[l.level])}>
                <span className="mr-2 text-muted-foreground/60">{new Date(l.ts).toLocaleTimeString()}</span>{l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
