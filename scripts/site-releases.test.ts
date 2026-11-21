import fs from 'node:fs'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

const source = fs.readFileSync(new URL('../docs/releases.js', import.meta.url), 'utf8')
const repository = 'https://github.com/gloutchov/Plancia-Comandi'
const latest = `${repository}/releases/latest`

function fixture(version = '0.3.14') {
  return {
    tag_name: `v${version}`, draft: false, prerelease: false,
    published_at: '2026-11-21T13:03:42Z', html_url: `${repository}/releases/tag/v${version}`,
    assets: [
      `PlanciaComandi-win-${version}-x64-setup.exe`, `PlanciaComandi-win-${version}-x64-portable.exe`,
      'SHA256SUMS-Windows.txt', `PlanciaComandi-mac-${version}-arm64.dmg`,
      `PlanciaComandi-mac-${version}-arm64.zip`, 'SHA256SUMS-macOS.txt',
    ].map(name => ({ name, state: 'uploaded', size: 2048, browser_download_url: `${repository}/releases/download/v${version}/${name}` })),
  }
}

function load(fetch: typeof globalThis.fetch) {
  let settle!: () => void
  const done = new Promise<void>(resolve => { settle = resolve })
  const window = { dispatchEvent: () => { settle() }, planciaSiteRelease: undefined as undefined | { getState: () => { status: string, version: string | null, downloads: Record<string, string> } } }
  vm.runInNewContext(source, { window, fetch, AbortController, Event, TextDecoder, setTimeout, clearTimeout })
  return { done, state: () => window.planciaSiteRelease!.getState() }
}

afterEach(() => vi.useRealTimers())

describe('landing latest release', () => {
  it.each(['0.3.14', '2.10.7'])('resolves all six links together for %s without a site edit', async version => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(fixture(version))))
    const page = load(fetch)
    expect(Object.values(page.state().downloads)).toEqual(Array(6).fill(latest))
    await page.done
    expect(page.state().status).toBe('ready')
    expect(page.state().version).toBe(version)
    expect(Object.values(page.state().downloads)).toEqual(fixture(version).assets.map(asset => asset.browser_download_url))
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/gloutchov/Plancia-Comandi/releases/latest')
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-cache' })
  })

  const invalid: Array<[string, (release: ReturnType<typeof fixture>) => void]> = [
    ['draft', release => { release.draft = true }],
    ['prerelease', release => { release.prerelease = true }],
    ['unexpected tag', release => { release.tag_name = 'milestone/C32' }],
    ['foreign repository', release => { release.html_url = 'https://github.com/other/project/releases/tag/v0.3.14' }],
    ['missing checksum', release => { release.assets.pop() }],
    ['duplicate asset', release => { release.assets.push(release.assets[0]) }],
    ['unfinished upload', release => { release.assets[0].state = 'starter' }],
    ['empty asset', release => { release.assets[0].size = 0 }],
    ['foreign download host', release => { release.assets[0].browser_download_url = 'https://example.invalid/package.exe' }],
    ['executable URL', release => { release.assets[0].browser_download_url = 'javascript:alert(1)' }],
    ['mixed versions', release => { release.assets[0].browser_download_url = release.assets[0].browser_download_url.replaceAll('0.3.14', '0.3.13') }],
  ]
  it.each(invalid)('retains the latest page for every link on %s', async (_label, change) => {
    const release = fixture(); change(release)
    const page = load(vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(release))))
    await page.done
    expect(page.state().status).toBe('fallback')
    expect(page.state().version).toBeNull()
    expect(Object.values(page.state().downloads)).toEqual(Array(6).fill(latest))
  })

  it.each([403, 404, 429, 500])('keeps usable links when the API returns HTTP %s', async status => {
    const page = load(vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{}', { status })))
    await page.done
    expect(page.state().status).toBe('fallback')
    expect(Object.values(page.state().downloads)).toEqual(Array(6).fill(latest))
  })

  it('rejects oversized streamed metadata and invalid JSON', async () => {
    for (const body of [JSON.stringify({ ...fixture(), body: 'x'.repeat(131073) }), '<html>unavailable</html>']) {
      const page = load(vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body)))
      await page.done
      expect(page.state().status).toBe('fallback')
    }
  })

  it('aborts a stalled request after five seconds and keeps the fallback', async () => {
    vi.useFakeTimers()
    let signal!: AbortSignal
    const page = load(vi.fn<typeof globalThis.fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      signal = options!.signal!
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    })))
    await vi.advanceTimersByTimeAsync(4999)
    expect(page.state().status).toBe('loading')
    await vi.advanceTimersByTimeAsync(1)
    await page.done
    expect(signal.aborted).toBe(true)
    expect(page.state().status).toBe('fallback')
    expect(Object.values(page.state().downloads)).toEqual(Array(6).fill(latest))
  })
})
