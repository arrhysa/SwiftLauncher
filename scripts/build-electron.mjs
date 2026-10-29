import { build, context } from 'esbuild'

const watch = process.argv.includes('--watch')
const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'info'
}
const jobs = [
  { ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.js' },
  { ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.js' }
]

if (watch) {
  for (const j of jobs) await (await context(j)).watch()
} else {
  await Promise.all(jobs.map((j) => build(j)))
}
