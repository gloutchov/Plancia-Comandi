export interface NativeCase { name: string; values: string[]; code: string }
interface NativeResult { name: string; reference: string; captured: Array<{ count: number; values: string[] }> }
export interface NativeReport { version: string; edition: string; results: NativeResult[] }

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64')

// Base64 fields cannot introduce tabs, newlines or PowerShell syntax.
export function encodeNativeCases(cases: NativeCase[]): string {
  return cases.map(item => [item.name, item.code, ...item.values].map(encode).join('\t')).join('\n') + '\n'
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid native report record')
  return value as Record<string, unknown>
}

function decode(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid native report string')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64') !== value) throw new Error('Invalid native report base64')
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
}

export function decodeNativeReport(text: string): NativeReport {
  const report = record(JSON.parse(text))
  if (typeof report.version !== 'string' || typeof report.edition !== 'string' || !Array.isArray(report.results)) {
    throw new Error('Invalid native report header')
  }
  return {
    version: report.version,
    edition: report.edition,
    results: report.results.map(value => {
      const item = record(value)
      if (!Array.isArray(item.captured)) throw new Error('Invalid native captured output')
      return {
        name: decode(item.name), reference: decode(item.reference),
        captured: item.captured.map(value => {
          const capture = record(value)
          if (capture.unexpectedOutput || typeof capture.count !== 'number' || !Number.isInteger(capture.count)
            || capture.count < 0 || !Array.isArray(capture.values) || capture.count !== capture.values.length) {
            throw new Error('Unexpected native output or argument count')
          }
          return { count: capture.count, values: capture.values.map(decode) }
        }),
      }
    }),
  }
}
