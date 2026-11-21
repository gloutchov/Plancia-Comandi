import { defineConfig } from 'vite'

// Static-site preview uses the page's own CSP, without Electron plugins or headers.
export default defineConfig({
  base: '/Plancia-Comandi/',
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
})
