import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// CSP добавляется только в production-сборку (в dev нужен HMR).
const csp = (): Plugin => ({
  name: 'swift-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<!--CSP-->',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https://mc-heads.net https://minotar.net https://cdn.modrinth.com; connect-src 'self'" />`
    )
})

export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome130' },
  server: { port: 5173, strictPort: true }
})
