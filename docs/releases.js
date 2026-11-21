;(() => {
  const repository = 'https://github.com/gloutchov/Plancia-Comandi'
  const latest = `${repository}/releases/latest`
  const endpoint = 'https://api.github.com/repos/gloutchov/Plancia-Comandi/releases/latest'
  const timeoutMs = 5000
  const maxBytes = 131072
  const names = {
    windowsSetup: version => `PlanciaComandi-win-${version}-x64-setup.exe`,
    windowsPortable: version => `PlanciaComandi-win-${version}-x64-portable.exe`,
    windowsChecksums: () => 'SHA256SUMS-Windows.txt',
    macDmg: version => `PlanciaComandi-mac-${version}-arm64.dmg`,
    macZip: version => `PlanciaComandi-mac-${version}-arm64.zip`,
    macChecksums: () => 'SHA256SUMS-macOS.txt',
  }
  const fallback = Object.freeze(Object.fromEntries(Object.keys(names).map(key => [key, latest])))
  let state = Object.freeze({ status: 'loading', version: null, downloads: fallback })
  window.planciaSiteRelease = Object.freeze({ getState: () => state })

  function update(next) {
    state = Object.freeze(next)
    window.dispatchEvent(new Event('plancia-site-release'))
  }

  function validate(release) {
    const version = /^v((?:0|[1-9]\d{0,5})\.(?:0|[1-9]\d{0,5})\.(?:0|[1-9]\d{0,5}))$/.exec(release?.tag_name)?.[1]
    if (!version || release.draft !== false || release.prerelease !== false ||
      release.html_url !== `${repository}/releases/tag/v${version}` ||
      !Number.isFinite(Date.parse(release.published_at)) || !Array.isArray(release.assets)) {
      throw new Error('Invalid release metadata')
    }
    const downloads = {}
    for (const [key, filename] of Object.entries(names)) {
      const name = filename(version)
      const matches = release.assets.filter(asset => asset?.name === name)
      const url = `${repository}/releases/download/v${version}/${name}`
      if (matches.length !== 1 || matches[0].state !== 'uploaded' ||
        !Number.isSafeInteger(matches[0].size) || matches[0].size <= 0 ||
        matches[0].browser_download_url !== url) throw new Error('Invalid release asset')
      downloads[key] = url
    }
    return { status: 'ready', version, downloads: Object.freeze(downloads) }
  }

  async function readMetadata(response) {
    if (!response.ok || !response.body) throw new Error('Release metadata unavailable')
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8', { fatal: true })
    const chunks = []
    let bytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > maxBytes) throw new Error('Release metadata too large')
        chunks.push(decoder.decode(value, { stream: true }))
      }
      chunks.push(decoder.decode())
      return JSON.parse(chunks.join(''))
    } finally {
      await reader.cancel().catch(() => {})
    }
  }

  async function load() {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        cache: 'no-cache',
        headers: { Accept: 'application/vnd.github+json' },
      })
      update(validate(await readMetadata(response)))
    } catch {
      update({ status: 'fallback', version: null, downloads: fallback })
    } finally {
      clearTimeout(timer)
    }
  }
  void load()
})()
