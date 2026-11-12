const forbiddenArchivePrefixes = ['/.git/', '/scripts/', '/docs/', '/node_modules/vitest/', '/node_modules/electron-builder/']
const privateFile = /(^|\/)settings\.json$|(^|\/)\.env(?:\.|$)/

// @electron/asar 3.4.1 splits archive paths on path.sep. On Windows that is
// '\\', so a '/' path such as dist/assets/file.js is one missing name.
export function archiveEntryPath(pathModule, directory, name) {
  return pathModule.join(directory, name)
}

// listPackage builds entries with path.join, so Windows returns '\\scripts\\x.mjs'.
export function normalizeArchiveEntries(entries) {
  return entries.map((entry) => entry.replaceAll('\\', '/'))
}

export function unexpectedPackageEntry(entries) {
  const normalized = normalizeArchiveEntries(entries)
  for (const prefix of forbiddenArchivePrefixes) {
    if (normalized.some((entry) => entry.startsWith(prefix))) return `Unexpected package entry: ${prefix}`
  }
  if (normalized.some((entry) => privateFile.test(entry))) return 'Local settings or environment file in package'
  return null
}
