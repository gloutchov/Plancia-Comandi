/**
 * Renderer Content-Security-Policy.
 *
 * Production scripts are external modules from the app itself. There is no
 * `unsafe-eval` and no `unsafe-inline` for scripts. The module-preload
 * polyfill is disabled so the built HTML does not add an inline script.
 *
 * `unsafe-inline` is required for styles in both modes because xterm.js 5
 * renders with DomRenderer. That renderer writes the live palette, font and
 * cursor keyframes into a `<style>` element (`style-src-elem`) and writes
 * per-cell contrast colors with `setAttribute('style', ...)`
 * (`style-src-attr`). Those values follow the theme and the cell, so they
 * cannot be a static hashed file. Layout done through `element.style` is not
 * a CSP style source. `script-src-attr 'none'` still blocks inline event
 * handlers.
 *
 * Development adds `script-src 'unsafe-inline'` only because
 * `@vitejs/plugin-react` injects an inline module preamble for React Fast
 * Refresh. Vite also injects CSS as `<style>` tags during hot reload; the
 * style exception above already allows that. `connect-src` is the loopback
 * dev server (page and WebSocket). A non-loopback dev URL does not loosen
 * the policy.
 */

export const DEV_SERVER_HOST = '127.0.0.1'
export const DEV_SERVER_PORT = 47231
export const DEV_SERVER_ORIGIN = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`

const SHARED = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "img-src 'self'",
  "script-src-attr 'none'",
] as const

function joinPolicy(directives: readonly string[]): string {
  return [...directives, "frame-ancestors 'none'"].join('; ')
}

/**
 * `frame-ancestors` is enforced only on a response header. A meta element
 * ignores it and Chromium prints a console warning, which would look like a
 * violation while checking DevTools. The meta tag uses `contentSecurityPolicyMeta`.
 */
export function productionContentSecurityPolicy(): string {
  return joinPolicy([
    ...SHARED,
    "script-src 'self'",
    "style-src 'self'",
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "connect-src 'none'",
  ])
}

export function contentSecurityPolicyMeta(policy: string): string {
  return policy
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('frame-ancestors'))
    .join('; ')
}

function loopbackHttpOrigin(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:') return null
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return null
  if (!url.port) return null
  return url.origin
}

/** Development policy, or null when the URL is not an HTTP loopback origin. */
export function developmentContentSecurityPolicy(devServerUrl: string): string | null {
  const origin = loopbackHttpOrigin(devServerUrl)
  if (!origin) return null
  const websocket = origin.replace(/^http:/, 'ws:')
  return joinPolicy([
    ...SHARED,
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self'",
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    `connect-src 'self' ${origin} ${websocket}`,
  ])
}

/** Production policy, unless the renderer is served from the loopback dev server. */
export function contentSecurityPolicyForRenderer(devServerUrl: string | undefined): string {
  if (!devServerUrl) return productionContentSecurityPolicy()
  return developmentContentSecurityPolicy(devServerUrl) ?? productionContentSecurityPolicy()
}

/** Policy for one response, or null when this response is not the app renderer. */
export function contentSecurityPolicyForUrl(url: string, devServerUrl: string | undefined): string | null {
  if (devServerUrl) {
    const origin = loopbackHttpOrigin(devServerUrl)
    if (origin) {
      try {
        if (new URL(url).origin === origin) return developmentContentSecurityPolicy(origin)
      } catch {
        // Not a URL we should decorate.
      }
    }
  }
  if (url.startsWith('file:')) return productionContentSecurityPolicy()
  return null
}

export function withContentSecurityPolicy(
  responseHeaders: Readonly<Record<string, string | string[]>> | undefined,
  policy: string,
): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = { ...responseHeaders }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-security-policy') delete headers[key]
  }
  headers['Content-Security-Policy'] = [policy]
  return headers
}
