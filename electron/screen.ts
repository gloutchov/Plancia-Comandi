import { createRequire } from 'node:module'
import type { Terminal } from '@xterm/headless'

const require = createRequire(import.meta.url)

type HeadlessModule = typeof import('@xterm/headless')

let moduleCache: HeadlessModule | null | undefined

function loadHeadless(): HeadlessModule | null {
  if (moduleCache !== undefined) return moduleCache
  try {
    moduleCache = require('@xterm/headless') as HeadlessModule
  } catch (error) {
    console.error('Headless terminal failed to load', error)
    moduleCache = null
  }
  return moduleCache
}

export function createScreen(cols: number, rows: number): Terminal | null {
  const headless = loadHeadless()
  if (!headless) return null
  return new headless.Terminal({
    cols,
    rows,
    allowProposedApi: true,
    scrollback: 200,
  })
}

export function readScreen(term: Terminal): { text: string; mode: 'normal' | 'alternate' } {
  const buffer = term.buffer.active
  const lines: string[] = []
  const start = buffer.viewportY
  for (let row = 0; row < term.rows; row++) {
    const line = buffer.getLine(start + row)
    lines.push(line ? line.translateToString(true) : '')
  }
  return {
    text: lines.join('\n'),
    mode: buffer.type === 'alternate' ? 'alternate' : 'normal',
  }
}
