function sameDevOrigin(url: string, devServerUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(devServerUrl).origin
  } catch {
    return false
  }
}

/** True when a navigation must be cancelled. The dev server origin is allowed only in development. */
export function shouldBlockNavigation(url: string, currentUrl: string, devServerUrl: string | undefined): boolean {
  if (!url) return true
  if (currentUrl && url === currentUrl) return false
  if (devServerUrl && sameDevOrigin(url, devServerUrl)) return false
  return true
}
