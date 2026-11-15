/** Electron events can lose their frame during navigation or destruction. */
export interface IpcSenderEvent {
  sender: object
  senderFrame: { url: string } | null
}

interface AppContents {
  isDestroyed(): boolean
  mainFrame: { url: string }
}

function documentUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.username || url.password) return null
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

/** Identity, top frame and exact document URL, never file: origin alone. */
export function isTrustedRendererSender(event: IpcSenderEvent, contents: AppContents | null, rendererUrl: string): boolean {
  try {
    if (!contents || contents.isDestroyed() || event.sender !== contents) return false
    const frame = event.senderFrame
    if (!frame || frame !== contents.mainFrame) return false
    const expected = documentUrl(rendererUrl)
    return expected !== null && documentUrl(frame.url) === expected
  } catch {
    // Electron getters may throw once a frame has been disposed.
    return false
  }
}
