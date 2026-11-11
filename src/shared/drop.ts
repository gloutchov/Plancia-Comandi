export interface DropLimits {
  maxFiles: number
  maxPathChars: number
  maxTextChars: number
}

export type DropAction =
  | { type: 'paths'; paths: string[] }
  | { type: 'text'; text: string }
  | { type: 'ignore' }

function usablePath(value: string, maxPathChars: number): boolean {
  return value.length > 0 && value.length <= maxPathChars && !/[\0\r\n]/.test(value)
}

/**
 * File paths win over accompanying text. Invalid paths are skipped.
 * Text is truncated to the configured paste limit; a path is never truncated.
 */
export function interpretDrop(input: { paths: readonly string[]; text: string }, limits: DropLimits): DropAction {
  const paths = input.paths.filter((value) => usablePath(value, limits.maxPathChars)).slice(0, limits.maxFiles)
  if (paths.length > 0) return { type: 'paths', paths }
  const text = input.text.length > limits.maxTextChars ? input.text.slice(0, limits.maxTextChars) : input.text
  if (!text) return { type: 'ignore' }
  return { type: 'text', text }
}
