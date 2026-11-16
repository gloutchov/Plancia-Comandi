/** Electron events can lose their frame during navigation or destruction. */
export interface IpcSenderEvent {
  sender: object
  senderFrame: { url: string } | null
}

interface AppContents {
  isDestroyed(): boolean
  mainFrame: { url: string }
}

/**
 * Exact document URL shared by loadURL and IPC validation.
 * On Windows, only the file: drive letter is uppercased, matching Chromium.
 * Hash is ignored. Query, percent-encoding and the rest of the path stay exact.
 */
export function canonicalDocumentUrl(value: string, platform: string = process.platform): string | null {
  try {
    const url = new URL(value)
    if (url.username || url.password) return null
    url.hash = ''
    if (platform === 'win32' && url.protocol === 'file:' && isWindowsDrivePath(url.pathname)) {
      const letter = url.pathname.charCodeAt(1)
      if (letter >= 97 && letter <= 122) url.pathname = `/${String.fromCharCode(letter - 32)}${url.pathname.slice(2)}`
    }
    return url.href
  } catch {
    return null
  }
}

function isWindowsDrivePath(pathname: string): boolean {
  if (pathname.length < 3 || pathname[0] !== '/' || pathname[2] !== ':') return false
  const letter = pathname.charCodeAt(1)
  return (letter >= 65 && letter <= 90) || (letter >= 97 && letter <= 122)
}

/** Identity, top frame and exact document URL, never file: origin alone. */
export function isTrustedRendererSender(
  event: IpcSenderEvent,
  contents: AppContents | null,
  rendererUrl: string,
  platform: string = process.platform,
): boolean {
  try {
    if (!contents || contents.isDestroyed() || event.sender !== contents) return false
    const frame = event.senderFrame
    if (!frame || frame !== contents.mainFrame) return false
    const expected = canonicalDocumentUrl(rendererUrl, platform)
    return expected !== null && canonicalDocumentUrl(frame.url, platform) === expected
  } catch {
    // Electron getters may throw once a frame has been disposed.
    return false
  }
}
