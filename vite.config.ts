import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { DEV_SERVER_HOST, DEV_SERVER_ORIGIN, DEV_SERVER_PORT, contentSecurityPolicyMeta, developmentContentSecurityPolicy, productionContentSecurityPolicy } from './src/shared/csp'

const devContentSecurityPolicy = developmentContentSecurityPolicy(DEV_SERVER_ORIGIN)
if (!devContentSecurityPolicy) throw new Error('The development CSP refused the loopback origin')
const devPolicy = devContentSecurityPolicy

function rendererCspPlugin(): Plugin {
  return {
    name: 'plancia-renderer-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const full = ctx.server ? devPolicy : productionContentSecurityPolicy()
        const policy = contentSecurityPolicyMeta(full)
        const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
        if (html.includes('http-equiv="Content-Security-Policy"')) return html
        return html.replace('<head>', `<head>\n    ${meta}`)
      },
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    rendererCspPlugin(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['node-pty', '@xterm/headless'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: {},
    }),
  ],
  build: {
    modulePreload: { polyfill: false },
  },
  server: {
    host: DEV_SERVER_HOST,
    port: DEV_SERVER_PORT,
    strictPort: true,
    headers: {
      'Content-Security-Policy': devPolicy,
    },
  },
})
