export function shortenPath(cwd: string, home: string): string {
  if (!cwd) return ''
  if (!home) return cwd
  const variants = [home, home.replace(/\\/g, '/'), home.replace(/\//g, '\\')]
  for (const root of variants) {
    if (!root) continue
    if (cwd === root) return '~'
    const sep = cwd.includes('\\') ? '\\' : '/'
    if (cwd.startsWith(root + sep) || cwd.startsWith(root + '/')) {
      return '~' + cwd.slice(root.length)
    }
  }
  return cwd
}
