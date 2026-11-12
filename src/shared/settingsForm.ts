/** Keep the settings the UI already has when an update comes back empty. */
export function settingsFromUpdate<T extends object>(current: T, incoming: T | null | undefined): T {
  if (incoming == null) return current
  return incoming
}

/** A settings number field. `1e400` is Infinity and is refused. */
export function parseDialogNumber(raw: string): number | null {
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}
