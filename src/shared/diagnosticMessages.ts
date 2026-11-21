import { translate } from './i18n'
import type { Locale, SettingsWarning } from './types'

export function validSettingsWarning(value: unknown): value is SettingsWarning | null {
  return value === null || value === 'recovered' || value === 'read-blocked' || value === 'write-failed'
}

/** Unknown/native errors are never rendered as text. */
export function sessionErrorMessage(locale: Locale, code: string, maxSessions?: number): string {
  if (code === 'bad-cwd') return translate(locale, 'badCwd')
  if (code === 'bad-shell') return translate(locale, 'badShell')
  if (code === 'max-sessions' && maxSessions !== undefined) return translate(locale, 'maxSessions', { n: maxSessions })
  if (code === 'pty-missing') return translate(locale, 'ptyMissing')
  return translate(locale, 'createFailed')
}
