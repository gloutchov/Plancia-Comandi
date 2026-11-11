export type ShellQuoteKind = 'posix' | 'powershell' | 'cmd'

const POWERSHELL = new Set(['powershell', 'pwsh'])
const CMD = new Set(['cmd'])

/** Unknown shell ids, including login shells, Git Bash, bash, zsh and fish, use POSIX quoting. */
export function shellQuoteKind(shellId: string): ShellQuoteKind {
  if (POWERSHELL.has(shellId)) return 'powershell'
  if (CMD.has(shellId)) return 'cmd'
  return 'posix'
}

function quotePosix(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, `''`)}'`
}

/**
 * Interactive cmd.exe: wrap in double quotes so spaces and & | < > stay literal.
 * An embedded quote is doubled. A percent is placed outside the quotes and
 * caret-escaped (`"^%"`) because interactive cmd has no reliable %% escape.
 */
function quoteCmd(value: string): string {
  let out = '"'
  for (const char of value) {
    if (char === '"') out += '""'
    else if (char === '%') out += '"^%"'
    else out += char
  }
  out += '"'
  return out
}

export function quoteShellArg(value: string, kind: ShellQuoteKind): string | null {
  if (!value || /[\0\r\n]/.test(value)) return null
  if (kind === 'powershell') return quotePowerShell(value)
  if (kind === 'cmd') return quoteCmd(value)
  return quotePosix(value)
}

/** Quoted paths separated by spaces, plus one trailing space. Omits paths that cannot be quoted or would exceed the limit. */
export function formatDroppedPaths(paths: readonly string[], kind: ShellQuoteKind, maxChars: number): string | null {
  if (maxChars < 2) return null
  const quoted: string[] = []
  let length = 0
  for (const filePath of paths) {
    const next = quoteShellArg(filePath, kind)
    if (!next) continue
    const extra = quoted.length === 0 ? next.length : next.length + 1
    if (length + extra + 1 > maxChars) break
    quoted.push(next)
    length += extra
  }
  if (quoted.length === 0) return null
  return `${quoted.join(' ')} `
}
