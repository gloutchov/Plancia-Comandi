import fs from 'node:fs'
import path from 'node:path'

export interface ClipboardImageConfig {
  /** Single path segment under the Electron user-data directory. */
  directoryName: string
  /** Filename prefix. Generated names are `${filePrefix}-<time>-<hex>.png`. */
  filePrefix: string
  maxBytes: number
  maxEdgePx: number
  maxKeep: number
  maxAgeHours: number
}

export interface AppConfig {
  clipboardImages: ClipboardImageConfig
  terminal: {
    maxWriteChars: number
  }
  drop: {
    maxFiles: number
    maxPathChars: number
  }
}

export interface RuntimeLimits {
  maxPasteChars: number
  maxDroppedFiles: number
  maxPathChars: number
}

const DIRECTORY_NAME = /^[a-z0-9][a-z0-9-]{0,40}$/
const FILE_PREFIX = /^[a-z][a-z0-9-]{0,20}$/

/** Fallbacks used only when the central file is missing, unreadable or out of range. */
export const APP_CONFIG_DEFAULTS: AppConfig = {
  clipboardImages: {
    directoryName: 'clipboard-images',
    filePrefix: 'img',
    maxBytes: 12_582_912,
    maxEdgePx: 8000,
    maxKeep: 40,
    maxAgeHours: 24,
  },
  terminal: {
    maxWriteChars: 200_000,
  },
  drop: {
    maxFiles: 20,
    maxPathChars: 4096,
  },
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function asDirectoryName(value: unknown, fallback: string): string {
  return typeof value === 'string' && DIRECTORY_NAME.test(value) ? value : fallback
}

function asFilePrefix(value: unknown, fallback: string): string {
  return typeof value === 'string' && FILE_PREFIX.test(value) ? value : fallback
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/**
 * Accepts a partial object. Unknown keys are ignored. Each invalid field
 * falls back independently so one bad value does not discard the rest.
 */
export function validateAppConfig(input: unknown): AppConfig {
  const source = record(input)
  const images = record(source.clipboardImages)
  const terminal = record(source.terminal)
  const drop = record(source.drop)
  const defaults = APP_CONFIG_DEFAULTS
  return {
    clipboardImages: {
      directoryName: asDirectoryName(images.directoryName, defaults.clipboardImages.directoryName),
      filePrefix: asFilePrefix(images.filePrefix, defaults.clipboardImages.filePrefix),
      maxBytes: clamp(images.maxBytes, 65_536, 33_554_432, defaults.clipboardImages.maxBytes),
      maxEdgePx: clamp(images.maxEdgePx, 256, 16_000, defaults.clipboardImages.maxEdgePx),
      maxKeep: clamp(images.maxKeep, 1, 200, defaults.clipboardImages.maxKeep),
      maxAgeHours: clamp(images.maxAgeHours, 1, 24 * 30, defaults.clipboardImages.maxAgeHours),
    },
    terminal: {
      maxWriteChars: clamp(terminal.maxWriteChars, 1_000, 1_000_000, defaults.terminal.maxWriteChars),
    },
    drop: {
      maxFiles: clamp(drop.maxFiles, 1, 50, defaults.drop.maxFiles),
      maxPathChars: clamp(drop.maxPathChars, 32, 32_767, defaults.drop.maxPathChars),
    },
  }
}

/**
 * xterm.js bracketed paste wraps the text with ESC [200~ and ESC [201~,
 * six characters each. The paste budget leaves that room so the closing
 * marker is not cut off and the write is not dropped.
 */
export const BRACKETED_PASTE_WRAP = '\u001b[200~'.length + '\u001b[201~'.length

export function runtimeLimits(config: AppConfig): RuntimeLimits {
  return {
    maxPasteChars: Math.max(1, config.terminal.maxWriteChars - BRACKETED_PASTE_WRAP),
    maxDroppedFiles: config.drop.maxFiles,
    maxPathChars: config.drop.maxPathChars,
  }
}

export function resolveAppConfigFile(appRoot: string, resourcesPath: string): string {
  const external = path.join(resourcesPath, 'config', 'app.config.json')
  if (resourcesPath && fs.existsSync(external)) return external
  return path.join(appRoot, 'config', 'app.config.json')
}

export function loadAppConfig(file: string): AppConfig {
  try {
    return validateAppConfig(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown)
  } catch {
    return validateAppConfig(null)
  }
}
