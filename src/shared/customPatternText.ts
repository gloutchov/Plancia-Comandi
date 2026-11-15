import { lastNonEmptyLine, stripAnsi } from './status'

/** Bound the screen copy first; no separate backlog, title/cwd metadata or environment is forwarded. */
export function customPatternText(visibleText: string, maxInputChars: number) {
  const text = stripAnsi(visibleText.slice(-maxInputChars))
  const lines = text.split('\n')
  return {
    idle: lastNonEmptyLine(text),
    busy: lines.slice(-10).join('\n'),
    attention: lines.slice(-12).join('\n'),
  }
}
