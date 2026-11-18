import { translate } from '../src/shared/i18n'
import type { Locale } from '../src/shared/types'
import { diagnosticEntry, reportDiagnostic } from './diagnostics'

interface FailureEffects {
  stderr(line: string): void
  showErrorBox(title: string, content: string): void
  exit(code: number): void
}

/** User-visible text is static; only allowlisted error metadata reaches stderr. */
export function showStartupFailure(locale: Locale, error: unknown, effects: FailureEffects): void {
  const line = diagnosticEntry('startup-failed', error) + '\n'
  reportDiagnostic('startup-failed', error)
  try { effects.stderr(line) } catch { /* The error dialog and exit still have to run. */ }
  try {
    effects.showErrorBox(translate(locale, 'startupFailureTitle'),
      translate(locale, 'bootError') + '\n' + translate(locale, 'startupFailureHelp') + '\nSTARTUP_FAILED')
  } catch {
    // A native dialog failure must not expose another raw error or prevent exit.
  } finally {
    effects.exit(1)
  }
}
